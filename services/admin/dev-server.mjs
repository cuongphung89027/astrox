/** Local-only adapter. Never import this file into a Worker. */
import {fileURLToPath,pathToFileURL} from 'node:url';
import {devSettings} from './dev-settings.mjs';
import {featureEvent} from './feature-events.mjs';
import {clientError} from './client-errors.mjs';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {handleAdmin} from './server.mjs';
import {internalFetch} from '../backend/handler.mjs';
import {previewOrigin,rewriteLocalOrigin} from './preview-origin.mjs';
const trustedPreview=previewOrigin(process.env.ADMIN_PREVIEW_ORIGIN||'');
const settings=devSettings();
const root=new URL('../../',import.meta.url),dir=pathToFileURL(settings.dataDir+'/');mkdirSync(dir,{recursive:true,mode:0o700});
const credentials=new URL('credentials.json',dir);if(!existsSync(credentials))writeFileSync(credentials,JSON.stringify({password:randomBytes(24).toString('base64url'),encryptionKey:randomBytes(32).toString('base64')},null,2),{mode:0o600});chmodSync(credentials,0o600);
const credentialsValue=JSON.parse(readFileSync(credentials,'utf8'));const native=new DatabaseSync(fileURLToPath(new URL('admin.sqlite',dir)));native.exec(readFileSync(new URL('migrations/admin.sql',root),'utf8'));
// Backend nghiệp vụ "service binding" bản địa: chạy internalFetch của worker trên
// chính sqlite local (schema backend + legacy) để capabilities/data views hoạt động.
if(process.env.ASTROX_LOCAL_BACKEND!=='0'){
 native.exec(readFileSync(new URL('services/backend/test/legacy-schema.sql',root),'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE UNIQUE INDEX ','CREATE UNIQUE INDEX IF NOT EXISTS ').replaceAll('CREATE INDEX ','CREATE INDEX IF NOT EXISTS '));
 native.exec(readFileSync(new URL('migrations/backend.sql',root),'utf8'));
 native.exec(readFileSync(new URL('migrations/rewards.sql',root),'utf8'));
}
for(const migration of ['ai-safety','client-errors','feature-events','admin-insights','reward-events'])native.exec(readFileSync(new URL(`migrations/${migration}.sql`,root),'utf8'));
const prepare=(query,args=[])=>({bind(...values){return prepare(query,values)},async first(){return native.prepare(query).get(...args)||null},async all(){return{results:native.prepare(query).all(...args)}},async run(){return{meta:{changes:native.prepare(query).run(...args).changes}}},execute(){const q=native.prepare(query);return q.columns().length?{results:q.all(...args)}:{meta:{changes:q.run(...args).changes}}}});
const DB={prepare,async batch(statements){native.exec('BEGIN');try{const result=statements.map(s=>s.execute());native.exec('COMMIT');return result}catch(e){native.exec('ROLLBACK');throw e}}};
const env={DB,PROVIDER_ALLOWED_HOSTS:process.env.PROVIDER_ALLOWED_HOSTS||'',LOCAL_ADMIN:true,LOCAL_ADMIN_PASSWORD:credentialsValue.password,ADMIN_ENCRYPTION_KEY:credentialsValue.encryptionKey};
// Pages prod gắn service binding ASTROX_BACKEND sang worker astrox-api; ở local
// dùng chính internalFetch của worker với sqlite phía trên.
if(process.env.ASTROX_LOCAL_BACKEND!=='0')env.ASTROX_BACKEND={fetch:request=>internalFetch(request,env)};
createServer(async(req,res)=>{try{const host=req.headers.host;if(!settings.acceptsHost(host)){res.writeHead(403);res.end();return}const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>300000){res.writeHead(413);res.end();return}chunks.push(chunk)}const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);let request=new Request(`http://${host}${req.url}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
// A same-origin Next.js rewrite preserves the browser Origin; explicitly allow only local UI origins.
const origin=headers.get('origin'),rewritten=rewriteLocalOrigin(origin,host,trustedPreview);if(rewritten!==origin){headers.set('origin',rewritten);request=new Request(request,{headers})}
let response;if(new URL(request.url).pathname==='/api/feature-events')response=await featureEvent(request,env);else if(new URL(request.url).pathname==='/api/client-errors')response=await clientError(request,env);else if(req.url.startsWith('/api/admin'))response=await handleAdmin(request,env);else{const {handlePublic}=await import('./integration-api.mjs');response=await handlePublic(request,env)}if(trustedPreview&&origin===trustedPreview&&response.headers.has('set-cookie'))response.headers.set('set-cookie',response.headers.get('set-cookie')+'; Secure');res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:'Local admin server error'}))}}).listen(settings.port,'127.0.0.1',()=>console.log(`Admin API: http://127.0.0.1:${settings.port} — bootstrap credentials in ${settings.dataDir}/credentials.json`));
