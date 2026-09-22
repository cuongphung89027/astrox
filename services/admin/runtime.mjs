import {normalizeUsage,estimateCost} from './metrics.ts';
import {providerRoutes} from './provider-models.ts';
/** Server-only adapters. No wallet mutations; callers own auth, rate limits and idempotency. */
export class RuntimeError extends Error {
  constructor(code, status = 503, attempts = []) { super(code); this.code = code; this.status = status; this.attempts = attempts; }
}
const fail = (code, status, attempts) => { throw new RuntimeError(code, status, attempts); };
function safeUrl(value) {
  try { const u = new URL(value); const h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.port && u.port !== '443' || !h.includes('.') || h.endsWith('.') || /^[\d.]+$/.test(h) || h.includes(':') || h === 'metadata.google.internal' || ['.local','.localhost','.internal','.test','.invalid','.example'].some(s => h.endsWith(s))) return null;
    return u;
  } catch { return null; }
}
function endpoint(provider, allowHosts) {
  const u = safeUrl(provider.baseUrl);
  // Deployment-owned exact host allowlist is mandatory: Admin cannot expand outbound trust.
  if (!u || u.search || !allowHosts.includes(u.hostname.toLowerCase())) fail('HOST_NOT_ALLOWED', 503);
  u.pathname = u.pathname.replace(/\/$/, '') + (provider.protocol === 'responses' ? '/responses' : provider.protocol === 'anthropic' ? '/messages' : '/chat/completions');
  return u.href;
}
async function readJson(response, maxBytes = 1048576) {
  if (Number(response.headers.get('content-length')) > maxBytes) { await response.body?.cancel(); fail('RESPONSE_TOO_LARGE', 502); }
  if (!response.body) fail('INVALID_PROVIDER_RESPONSE', 502);
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > maxBytes) fail('RESPONSE_TOO_LARGE', 502); chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
    try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail('INVALID_PROVIDER_RESPONSE',502); }
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
function messagesFor(config, input) {
  const messages=input?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length>100 || messages.some(m=>!m || !['system','user','assistant'].includes(m.role) || typeof m.content!=='string' || !m.content.trim() || m.content.length>100000 || Object.keys(m).some(k=>!['role','content'].includes(k))) || JSON.stringify(messages).length>200000) fail('INVALID_MESSAGES',400);
  const service=input.serviceId ? config.billing.services.find(s=>s.id===input.serviceId) : null;
  if (input.serviceId && !service) fail('UNKNOWN_SERVICE',400);
  return {service,messages:[...(config.ai.systemPrompt ? [{role:'system',content:config.ai.systemPrompt}] : []),...(service?.prompt ? [{role:'system',content:service.prompt}] : []),...messages]};
}
function normalize(data, protocol, model, attempts) {
  if(!data || typeof data!=='object' || Array.isArray(data)) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
  const usage={}; for(const field of ['input_tokens','output_tokens','prompt_tokens','completion_tokens','total_tokens']) if(Number.isSafeInteger(data.usage?.[field])&&data.usage[field]>=0) usage[field]=data.usage[field];
  if (protocol==='responses') {
    if(!Array.isArray(data.output)||data.output.some(o=>!o||typeof o!=='object'||o.type==='message'&&(!Array.isArray(o.content)||o.content.some(c=>!c||typeof c!=='object')))) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
    const content=data.output.filter(o=>o.type==='message').flatMap(o=>o.content||[]);
    if(content.some(c=>c.type==='refusal')) fail('PROVIDER_REFUSAL',422,attempts);
    if(data.error || data.status==='failed' || data.status==='incomplete' || content.some(c=>c.type!=='output_text')) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
    const text=content.map(c=>c.text).filter(t=>typeof t==='string').join('\n');
    if(!text) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
    return {choices:[{index:0,message:{role:'assistant',content:text},finish_reason:'stop'}],model,usage,attempts};
  }
  if(protocol==='anthropic') {
    if(data.stop_reason==='refusal') fail('PROVIDER_REFUSAL',422,attempts);
    if(!['end_turn','max_tokens','stop_sequence'].includes(data.stop_reason)||!Array.isArray(data.content)||!data.content.length||data.content.some(c=>!c||c.type!=='text'||typeof c.text!=='string')) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
    const text=data.content.map(c=>c.text).join('\n');if(!text.trim())fail('INVALID_PROVIDER_RESPONSE',502,attempts);
    return {choices:[{index:0,message:{role:'assistant',content:text},finish_reason:data.stop_reason==='max_tokens'?'length':'stop'}],model,usage,attempts};
  }
  const choice=data.choices?.[0];
  if(choice?.message?.refusal || choice?.finish_reason==='content_filter') fail('PROVIDER_REFUSAL',422,attempts);
  if(!choice || typeof choice.message?.content!=='string' || !choice.message.content || choice.message.tool_calls || !['stop','length'].includes(choice.finish_reason)) fail('INVALID_PROVIDER_RESPONSE',502,attempts);
  return {choices:[{index:0,message:{role:'assistant',content:choice.message.content},finish_reason:choice.finish_reason}],model,usage,attempts};
}
export async function executeProviderChain(config, input, readSecret, {fetchImpl=fetch, now=Date.now, allowHosts=[], healthStore}={}) {
  if(!config.ai.enabled) fail('AI_DISABLED',503);
  const {messages,service}=messagesFor(config,input);
  const chain=service?.chain?.length ? service.chain : config.ai.chain;
  const deadline=now()+Math.min(config.ai.totalTimeoutMs,120000); const attempts=[];
  for(const id of chain) {
    const p=providerRoutes(config.ai.providers).find(p=>p.id===id&&p.enabled); if(!p) fail('PROVIDER_UNAVAILABLE',503,attempts);
    if(!['chat','responses','anthropic'].includes(p.protocol)) fail('UNSUPPORTED_PROTOCOL',503,attempts);
    const health=await healthStore?.get(p.id);
    if(health && health.failures>=config.ai.failureThreshold && now()-health.lastFailureAt<config.ai.cooldownSeconds*1000) { attempts.push({providerId:p.id,status:0,outcome:'circuit_open'}); continue; }
    const url=endpoint(p,allowHosts); const key=await readSecret(p.secretRef); if(!key) fail('SECRET_MISSING',503,attempts);
    for(let retry=0;retry<=Math.min(p.retries,3);retry++) {
      if(attempts.filter(a=>a.outcome!=='circuit_open').length>=Math.min(config.ai.maxAttempts,8) || now()>=deadline) fail('AI_BUDGET_EXHAUSTED',503,attempts);
      const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),Math.max(1,Math.min(p.timeoutMs,deadline-now())));
      const attempt={providerId:p.id,model:p.model,protocol:p.protocol,status:0,outcome:'failed'}; const attemptStarted=now(); attempts.push(attempt);
      try {
        const body=p.protocol==='anthropic' ? {model:p.model,messages:messages.filter(m=>m.role!=='system'),system:messages.filter(m=>m.role==='system').map(m=>m.content).join('\n'),max_tokens:p.maxTokens,temperature:p.temperature,stream:false} : p.protocol==='responses' ? {model:p.model,input:messages,max_output_tokens:p.maxTokens,temperature:p.temperature,stream:false} : {model:p.model,messages,max_tokens:p.maxTokens,temperature:p.temperature,stream:false};
        const response=await fetchImpl(url,{method:'POST',headers:p.protocol==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'}:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal,redirect:'manual'});
        attempt.status=response.status;
        if(response.status>=300&&response.status<400) { await response.body?.cancel(); fail('PROVIDER_REDIRECT',502,attempts); }
        if(!response.ok) { await response.body?.cancel();
          if(response.status===401) { attempt.outcome='authentication_failed'; await healthStore?.recordFailure(p.id,now()); break; }
          if(config.ai.retryStatuses.includes(response.status)) { attempt.outcome='retryable'; await healthStore?.recordFailure(p.id,now()); continue; } fail('PROVIDER_REJECTED',502,attempts); }
        const raw=await readJson(response);attempt.usage=normalizeUsage(raw?.usage,p.protocol);if(p.pricing)attempt.pricing={...p.pricing};attempt.costUsd=estimateCost({...attempt.usage,cacheWrite:p.protocol==='anthropic'?attempt.usage.cacheWrite:0},p.pricing);const result=normalize(raw,p.protocol,p.model,attempts); attempt.outcome='success'; await healthStore?.recordSuccess(p.id,now()); return result;
      } catch(error) {
        // Transport failures may use the configured chain; malformed input and refusals never do.
        if(error instanceof RuntimeError) throw error;
        attempt.outcome=controller.signal.aborted?'timeout':'network_error';
        await healthStore?.recordFailure(p.id,now());
      } finally { attempt.durationMs=Math.max(0,now()-attemptStarted);clearTimeout(timer); }
    }
  }
  fail('PROVIDERS_EXHAUSTED',503,attempts);
}
export function validateIntegration(kind, config) {
  const errors=[];
  if(kind==='payos') {if(!config.clientId?.trim()) errors.push('CLIENT_ID_MISSING'); for(const k of ['returnUrl','cancelUrl']) if(!safeUrl(config[k])) errors.push(`INVALID_${k}`);}
  else if(kind==='zalo') {if(!/^\d+$/.test(config.appId||'')) errors.push('APP_ID_INVALID');for(const k of ['callbackUrl','returnUrl']) if(!safeUrl(config[k])) errors.push(`INVALID_${k}`);}
  else errors.push('UNKNOWN_INTEGRATION');
  return errors;
}
async function hmacKey(secret) {
  if(typeof secret!=='string'||!secret) fail('SECRET_MISSING',503);
  return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function sign(value,secret) { const signature=await crypto.subtle.sign('HMAC',await hmacKey(secret),new TextEncoder().encode(value));return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,'0')).join(''); }
// payOS payment webhook data is a flat scalar object. Reject unknown structured values.
function canonical(data) {
  if(!data||typeof data!=='object'||Array.isArray(data)) fail('INVALID_WEBHOOK',400);
  return Object.keys(data).sort().map(k=>{const v=data[k];if(v!==null&&!['string','number','boolean'].includes(typeof v)) fail('INVALID_WEBHOOK',400);return `${k}=${v===null||v==='null'||v==='undefined'?'':v}`;}).join('&');
}
export async function verifyPayosWebhook(payload,checksumKey) {
  const {data,signature}=payload||{};
  if(typeof signature!=='string'||!/^[a-fA-F0-9]{64}$/.test(signature)) fail('INVALID_SIGNATURE',400);
  const bytes=Uint8Array.from(signature.match(/../g),h=>parseInt(h,16));
  if(!await crypto.subtle.verify('HMAC',await hmacKey(checksumKey),bytes,new TextEncoder().encode(canonical(data)))) fail('INVALID_SIGNATURE',400);
  if(!Number.isSafeInteger(data.orderCode)||data.orderCode<=0||!Number.isSafeInteger(data.amount)||data.amount<=0||data.currency!=='VND'||data.code!=='00'||typeof data.reference!=='string'||!data.reference) fail('INVALID_PAYMENT_EVENT',400);
  // Signature proves origin only. Caller MUST match a stored order, amount, currency and unique reference atomically before crediting.
  return data;
}
export async function createPaymentRequest(config,snapshot,{apiKey,checksumKey},{fetchImpl=fetch}={}) {
  if(!config.enabled) fail('PAYOS_DISABLED',503);
  if(validateIntegration('payos',config).length || !apiKey) fail('PAYOS_NOT_READY',503);
  if(!Number.isSafeInteger(snapshot.orderCode)||snapshot.orderCode<=0||!Number.isSafeInteger(snapshot.amountVnd)||snapshot.amountVnd<=0||typeof snapshot.description!=='string'||! /^[A-Za-z0-9 ]{1,9}$/.test(snapshot.description)||!Number.isSafeInteger(snapshot.expiresAt)||snapshot.expiresAt<=Math.floor(Date.now()/1000)||snapshot.expiresAt>2147483647) fail('INVALID_ORDER_SNAPSHOT',400);
  const body={orderCode:snapshot.orderCode,amount:snapshot.amountVnd,description:snapshot.description,returnUrl:config.returnUrl,cancelUrl:config.cancelUrl,expiredAt:snapshot.expiresAt};
  body.signature=await sign(canonical({amount:body.amount,cancelUrl:body.cancelUrl,description:body.description,orderCode:body.orderCode,returnUrl:body.returnUrl}),checksumKey);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try { const response=await fetchImpl('https://api-merchant.payos.vn/v2/payment-requests',{method:'POST',headers:{'x-client-id':config.clientId,'x-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual',signal:controller.signal});
    if(!response.ok) {await response.body?.cancel();fail('PAYOS_REQUEST_FAILED',502);}
    const result=await readJson(response,262144);if(result.code!=='00'||!result.data) fail('PAYOS_REQUEST_FAILED',502);return result.data;
  } catch(e) {if(e instanceof RuntimeError) throw e;fail('PAYOS_NETWORK_ERROR',502);} finally {clearTimeout(timer);}
}
/** Admin-only diagnostic: ignores user prompts and never tests another provider as fallback. */
export async function testProvider(config,providerId,readSecret,options={}) {
  const provider=providerRoutes(config.ai.providers).find(p=>p.id===providerId);
  if(!provider) fail('UNKNOWN_PROVIDER',404);
  const testConfig={...config,ai:{...config.ai,enabled:true,systemPrompt:'',providers:[{...provider,enabled:true,maxTokens:32,retries:0,timeoutMs:Math.min(provider.timeoutMs,15000)}],chain:[providerId],maxAttempts:1,totalTimeoutMs:15000}};
  return executeProviderChain(testConfig,{messages:[{role:'user',content:'Reply with OK.'}]},readSecret,options);
}
