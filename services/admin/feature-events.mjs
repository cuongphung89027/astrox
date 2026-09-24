import {SERVICE_CATALOG} from './catalog.ts';
import {sign} from './crypto.mjs';
const modules=['tuvi','zodiac','kinhdich','batu','numerology','tarot','compat'];
const services=new Map([...modules.map(m=>[m,m]),...SERVICE_CATALOG.map(s=>[s.id,s.module])]);
const events=new Set(['feature_view','feature_start','result_view','result_save']);
const sources=new Set(['navigation','calculation','ai','cache','saved']);
const keys=['id','event','module','service_id','source','session_id','device'];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function featureEvent(request,env,now=Date.now()){
 const reply=status=>new Response(null,{status,headers:{'cache-control':'no-store'}});
 if(request.method!=='POST')return reply(405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply(403);
 if(request.headers.get('dnt')==='1')return reply(204);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415);
 if(Number(request.headers.get('content-length'))>2048)return reply(413);
 let body;
 try {
  const reader=request.body?.getReader();if(!reader)return reply(400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return reply(413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  body=JSON.parse(new TextDecoder().decode(bytes));
 }catch{return reply(400);}
 if(!body||Array.isArray(body)||Object.keys(body).length!==keys.length||Object.keys(body).some(k=>!keys.includes(k))||keys.some(k=>typeof body[k]!=='string')||!uuid.test(body.id)||!uuid.test(body.session_id)||!events.has(body.event)||!sources.has(body.source)||!['mobile','tablet','desktop'].includes(body.device)||services.get(body.service_id)!==body.module)return reply(400);
 try {
  const hour=Math.floor(now/3600000),day=Math.floor(now/86400000);
  // HMAC rotates each hour; raw IP, UA, account, URL and content are never stored.
  const ip=await sign(env,`feature:${hour}:${request.headers.get('cf-connecting-ip')||'unknown'}`);
  const limits=await env.DB.batch([[`ip:${hour}:${ip}`,120,(hour+1)*3600000],[`global:${day}`,100000,(day+1)*86400000]].map(([key,max,expiry])=>env.DB.prepare('INSERT INTO feature_event_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(key,expiry,max)));
  if(limits.some(r=>!r.results?.length))return reply(429);
  await env.DB.batch([
   env.DB.prepare('DELETE FROM feature_events WHERE created_at < ?').bind(new Date(now-90*86400000).toISOString()),
   env.DB.prepare('DELETE FROM feature_event_limits WHERE expires_at <= ?').bind(now),
   env.DB.prepare('INSERT OR IGNORE INTO feature_events(id,event,module,service_id,source,session_id,device,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(...keys.map(k=>body[k]),new Date(now).toISOString())
  ]);
  return reply(204);
 }catch{return reply(503);}
}
