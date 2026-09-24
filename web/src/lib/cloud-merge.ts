export type CloudData=Record<string,unknown>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function mergeTree(remote:unknown,local:unknown):unknown{
 if(!object(remote))return local??remote;if(!object(local))return remote;
 if(typeof remote.text==='string'||typeof local.text==='string')return Number(local.updatedAt||0)>Number(remote.updatedAt||0)?local:remote;
 const result:CloudData={...remote};for(const k of Object.keys(local)){if(['__proto__','constructor','prototype'].includes(k))continue;result[k]=mergeTree(remote[k],local[k]);}return result;
}
export function mergeCloud(remote:CloudData,local:CloudData,base:CloudData):CloudData{
 const result:CloudData={...remote};delete result._syncRevision;
 for(const k of ['profile','chartImageBase64','chartImageMime','ziweiChart','natalChart','lastAiModel']){
  if(JSON.stringify(local[k])!==JSON.stringify(base[k]))result[k]=local[k];
  else if(!(k in remote)&&local[k]!=null)result[k]=local[k];
 }
 result.aiCache=mergeTree(remote.aiCache,local.aiCache);
 const history=new Map<string,Record<string,unknown>>();
 for(const list of [remote.tarotHistory,local.tarotHistory])if(Array.isArray(list))for(const row of list){if(!object(row)||typeof row.id!=='string')continue;const key=String(row.fingerprint||'')+':'+row.id,old=history.get(key);if(!old||Number(row.savedAt)>Number(old.savedAt))history.set(key,row);}
 result.tarotHistory=[...history.values()];
 const deleted:Record<string,string[]>={};for(const src of [remote.tarotDeleted,local.tarotDeleted])if(object(src))for(const [fp,ids] of Object.entries(src)){if(['__proto__','constructor','prototype'].includes(fp)||!Array.isArray(ids))continue;deleted[fp]=[...new Set([...(deleted[fp]||[]),...ids.filter((x):x is string=>typeof x==='string')])];}
 result.tarotDeleted=deleted;return result;
}
