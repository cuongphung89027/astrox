export function corsHeaders(env,request){
 const origin=request.headers.get('Origin')||'';
 const allowed=[env.APP_ORIGIN||'https://theastrox.space','https://theastrox-a3l.pages.dev'];
 return {'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};
}
export const json=(env,request,data,status=200)=>Response.json(data,{status,headers:{...corsHeaders(env,request),'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function trustedOrigin(env,request){const origin=request.headers.get('Origin');return origin===(env.APP_ORIGIN||'https://theastrox.space')||origin===new URL(request.url).origin;}
export async function bodyJson(request,max=32768){
 if(Number(request.headers.get('content-length'))>max)throw new Error('request_too_large');
 if(!request.body)return null;const reader=request.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max)throw new Error('request_too_large');chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{return null;}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
