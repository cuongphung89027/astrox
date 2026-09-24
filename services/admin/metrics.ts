export type Usage = {input:number|null;output:number|null;cacheRead:number|null;cacheWrite:number|null};
export type Pricing = {input:number;output:number;cacheRead:number;cacheWrite:number};
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0?Number(v):null;
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function normalizeUsage(raw:unknown,protocol:string):Usage {
 const u=object(raw), input=count(u.input_tokens??u.prompt_tokens), output=count(u.output_tokens??u.completion_tokens);
 const details=object(u.input_tokens_details??u.prompt_tokens_details);
 const cacheRead=count(protocol==='anthropic'?u.cache_read_input_tokens:details.cached_tokens);
 const cacheWrite=count(protocol==='anthropic'?u.cache_creation_input_tokens:undefined);
 return {input:protocol==='anthropic'&&input!==null?input+(cacheRead??0)+(cacheWrite??0):input,output,cacheRead,cacheWrite};
}
export function estimateCost(u:Usage,p?:Pricing):number|null {
 if(!p||u.input===null||u.output===null||u.cacheRead===null||u.cacheWrite===null||u.cacheRead+u.cacheWrite>u.input||Object.values(p).some(n=>!Number.isFinite(n)||n<0))return null;
 return ((u.input-u.cacheRead-u.cacheWrite)*p.input+u.output*p.output+u.cacheRead*p.cacheRead+u.cacheWrite*p.cacheWrite)/1e6;
}
export type Attempt={providerId:string;model:string;outcome:string;status:number;durationMs:number|null;usage:Usage;costUsd:number|null;purpose:string;language:string};
export function parseAttempts(raw:unknown):Attempt[]{
 let list:unknown=raw;try{if(typeof raw==='string')list=JSON.parse(raw)}catch{return []}if(!Array.isArray(list))return [];
 return list.map(object).filter(a=>typeof a.providerId==='string').map(a=>{const u=object(a.usage);return {purpose:typeof a.purpose==='string'?a.purpose:'',language:typeof a.language==='string'?a.language:'',providerId:String(a.providerId),model:typeof a.model==='string'?a.model:'',outcome:String(a.outcome||''),status:count(a.status)||0,durationMs:count(a.durationMs),usage:{input:count(u.input),output:count(u.output),cacheRead:count(u.cacheRead),cacheWrite:count(u.cacheWrite)},costUsd:typeof a.costUsd==='number'&&Number.isFinite(a.costUsd)&&a.costUsd>=0?a.costUsd:null}});
}
export type MetricRow={id:string;service_id:string;created_at:string;status:string;attempts:string;duration_ms:number};
export const blockedStatuses=new Set(['rate_limited','price_changed','MAINTENANCE','AI_DISABLED','SERVICE_UNAVAILABLE','INVALID_MESSAGES','INVALID_JSON','REQUEST_TOO_LARGE','unauthorized','insufficient_points','operation_in_progress','operation_refunded','operation_conflict','result_expired','revision_mismatch']);
const providerStatuses=new Set(['PROVIDERS_EXHAUSTED','AI_BUDGET_EXHAUSTED','PROVIDER_REJECTED','INVALID_PROVIDER_RESPONSE','PROVIDER_REFUSAL','PROVIDER_REDIRECT','READING_LANGUAGE_INVALID']);
export function createAiSummary(filters:{provider?:string;model?:string;service?:string}={},collectDurations=true){
 const tokens:Usage={input:null,output:null,cacheRead:null,cacheWrite:null};
 let success=0,replayed=0,blocked=0,serviceFailures=0,providerFailures=0;
 let requests=0,failed=0,attempts=0,attemptErrors=0,retries=0,fallbackRequests=0,usageRequests=0,cacheReadAttempts=0,cacheKnownAttempts=0,costUsd:number|null=null,pricedAttempts=0,delegated=0;
 let totalTokens:number|null=null,completeUsageAttempts=0;
 const language={checked:0,detected:0,repaired:0,blocked:0,repairAttempts:0,repairCostUsd:null as number|null,pricedRepairs:0};let repairDuration=0,repairTimed=0;
 const durations:number[]=[];const daily=new Map<string,{day:string;requests:number;failed:number}>();
 const groups=new Map<string,{provider:string;route:string;model:string;attempts:number;failed:number;input:number|null;output:number|null}>();
 const errorCodes=new Map<string,number>();
 function add(rows:MetricRow[]){for(const row of rows){
  if(filters.service&&row.service_id!==filters.service)continue;
  const all=parseAttempts(row.attempts), selected=all.filter(a=>(!filters.provider||a.providerId.split(':')[0]===filters.provider)&&(!filters.model||a.model===filters.model));
  if((filters.provider||filters.model)&&!selected.length)continue;
  requests++;const ok=row.status==='success'||row.status==='replayed',isBlocked=blockedStatuses.has(row.status);if(ok){success++;if(row.status==='replayed')replayed++;}else if(isBlocked){blocked++;}else{failed++;if(providerStatuses.has(row.status))providerFailures++;else serviceFailures++;const code=errorCodes.has(row.status)||errorCodes.size<100?row.status:'other';errorCodes.set(code,(errorCodes.get(code)||0)+1)}
  if(all.some(a=>a.outcome==='delegated'))delegated++;
  if(selected.some(a=>a.language))language.checked++;
  if(selected.some(a=>a.language==='detected'))language.detected++;
  if(selected.some(a=>a.language==='repaired'))language.repaired++;
  if(row.status==='READING_LANGUAGE_INVALID')language.blocked++;
  for(const a of selected.filter(a=>a.purpose==='language_repair')){language.repairAttempts++;if(a.costUsd!==null){language.repairCostUsd=(language.repairCostUsd??0)+a.costUsd;language.pricedRepairs++;}if(a.durationMs!==null){repairDuration+=a.durationMs;repairTimed++;}}
  const duration=count(row.duration_ms);if(collectDurations&&duration!==null)durations.push(duration);
  const date=row.created_at.slice(0,10),day=daily.get(date)||{day:date,requests:0,failed:0};day.requests++;if(!ok&&!isBlocked)day.failed++;daily.set(date,day);
  const upstream=selected.filter(a=>Boolean(a.providerId)&&!['circuit_open','delegated','refunded','refund_pending'].includes(a.outcome));
  const fullUpstream=all.filter(a=>Boolean(a.providerId)&&!['circuit_open','delegated','refunded','refund_pending'].includes(a.outcome));
  if(new Set(fullUpstream.map(a=>a.providerId)).size>1)fallbackRequests++;
  const seen=new Set<string>();let hasUsage=false;
  for(const a of upstream){attempts++;if(seen.has(a.providerId)&&a.purpose!=='language_repair')retries++;seen.add(a.providerId);if(a.outcome!=='success')attemptErrors++;
   const rawKey=`${a.providerId}|${a.model}`,key=groups.has(rawKey)||groups.size<500?rawKey:'other',g=groups.get(key)||{provider:key==='other'?'other':a.providerId.split(':')[0],route:key==='other'?'other':a.providerId,model:key==='other'?'Khác':a.model||'Chưa ghi model',attempts:0,failed:0,input:null,output:null};g.attempts++;if(a.outcome!=='success')g.failed++;
   for(const key of ['input','output','cacheRead','cacheWrite'] as const)if(a.usage[key]!==null){tokens[key]=(tokens[key]??0)+a.usage[key]!;hasUsage=true;}
   for(const key of ['input','output'] as const)if(a.usage[key]!==null)g[key]=(g[key]??0)+a.usage[key]!;
   if(a.usage.input!==null&&a.usage.output!==null){totalTokens=(totalTokens??0)+a.usage.input+a.usage.output;completeUsageAttempts++;}
   if(a.usage.cacheRead!==null){cacheKnownAttempts++;if(a.usage.cacheRead>0)cacheReadAttempts++;}
   if(a.costUsd!==null){costUsd=(costUsd??0)+a.costUsd;pricedAttempts++;}groups.set(key,g);
  }
  if(hasUsage)usageRequests++;
 }
 }
 function finish(){durations.sort((a,b)=>a-b);
 return {language:{...language,averageRepairMs:repairTimed?repairDuration/repairTimed:null,detectionRate:language.checked?language.detected/language.checked*100:null},requests,failed,success,replayed,blocked,serviceFailures,providerFailures,completedRequests:success+failed,errorRate:success+failed?failed/(success+failed)*100:null,attempts,attemptErrors,attemptErrorRate:attempts?attemptErrors/attempts*100:null,retries,fallbackRequests,usageRequests,tokens,totalTokens,completeUsageAttempts,cacheReadAttempts,cacheKnownAttempts,cacheHitRate:cacheKnownAttempts?cacheReadAttempts/cacheKnownAttempts*100:null,costUsd,pricedAttempts,delegated,averageMs:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null,p95Ms:durations.length?durations[Math.ceil(durations.length*.95)-1]:null,groupsTruncated:groups.has('other'),errorsTruncated:errorCodes.has('other'),groups:[...groups.values()],daily:[...daily.values()].sort((a,b)=>a.day.localeCompare(b.day)),errors:[...errorCodes].map(([code,count])=>({code,count}))};
}
 return {add,finish};
}
export function summarizeAi(rows:MetricRow[],filters:{provider?:string;model?:string;service?:string}={}){const summary=createAiSummary(filters);summary.add(rows);return summary.finish();}
