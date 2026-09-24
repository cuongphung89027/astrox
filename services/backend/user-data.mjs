import {bodyJson} from './http.mjs';
import {preserveUserData} from './preserve-user-data.mjs';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'private, no-store'}});
const FIELDS=['profile','chartImageBase64','chartImageMime','ziweiChart','natalChart','aiCache','lastAiModel','tarotHistory','tarotDeleted'];
export async function accountData(env,request,userId){
 if(!userId)return reply({error:'unauthorized'},401);
 const row=await env.DB.prepare('SELECT payload,updated_at FROM user_data WHERE user_id=?').bind(userId).first();
 let payload={};try{payload=row?JSON.parse(row.payload):{};}catch{return reply({error:'invalid_saved_data'},503);}
 const revision=row?.updated_at||0;
 if(request.method==='GET')return reply({...payload,_syncRevision:revision});
 if(request.method!=='PUT')return reply({error:'method_not_allowed'},405);
 let b;try{b=await bodyJson(request,1800000);}catch{return reply({error:'data_too_large'},413);}
 if(!Number.isSafeInteger(b?.expectedRevision)||b.expectedRevision<0)return reply({error:'revision_required'},428);
 if(b.expectedRevision!==revision)return reply({error:'sync_conflict'},409);
 const next=b.payload;
 if(!next||typeof next!=='object'||Array.isArray(next)||Object.keys(next).some(k=>!FIELDS.includes(k)))return reply({error:'invalid_data'},400);
 const raw=JSON.stringify(preserveUserData(payload,next));if(new TextEncoder().encode(raw).length>1700000)return reply({error:'data_too_large'},413);
 if(row&&raw===row.payload)return reply({ok:true,revision});
 const updated=Math.max(Date.now(),revision+1);
 const changed=await env.DB.prepare('INSERT INTO user_data(user_id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at WHERE user_data.updated_at=? RETURNING updated_at').bind(userId,raw,updated,revision).first();
 return changed?reply({ok:true,revision:updated}):reply({error:'sync_conflict'},409);
}
