const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const blocked=new Set(['__proto__','constructor','prototype']);
function mergeCache(previous,next){
 if(!object(previous))return next??previous;
 if(!object(next))return previous;
 const result={...previous};
 for(const [key,value] of Object.entries(next)){
  if(blocked.has(key))continue;
  const old=result[key];
  if(object(old)&&object(value)&&typeof old.text==='string'&&typeof value.text==='string'){
   const newer=Number(old.updatedAt||0)>Number(value.updatedAt||0)?old:value,older=newer===old?value:old;
   if(old.text!==value.text){
    let archive=key+'::history::sync::'+String(older.updatedAt||0),suffix=0;
    while(archive in result&&JSON.stringify(result[archive])!==JSON.stringify(older))archive=key+'::history::sync::'+String(older.updatedAt||0)+'::'+(++suffix);
    result[archive]=older;
   }
   result[key]=newer;
  }else result[key]=mergeCache(old,value);
 }
 return result;
}
// Ordinary sync is non-destructive. Explicit deletion is represented by tombstones.
export function preserveUserData(previous,next){
 const result={...previous,...next};
 if(previous.profile&&(!object(next.profile)||!String(next.profile.name||'').trim())){
  for(const field of ['profile','chartImageBase64','chartImageMime','ziweiChart','natalChart'])if(field in previous)result[field]=previous[field];
 }
 if(previous.aiCache||next.aiCache)result.aiCache=mergeCache(previous.aiCache,next.aiCache);
 if(previous.tarotHistory||next.tarotHistory){
  const rows=new Map();
  for(const list of [previous.tarotHistory,next.tarotHistory])if(Array.isArray(list))for(const row of list){
   if(!object(row)||typeof row.id!=='string')continue;
   const key=String(row.fingerprint||'')+':'+row.id,old=rows.get(key);
   if(!old||Number(row.savedAt||0)>=Number(old.savedAt||0))rows.set(key,row);
  }
  result.tarotHistory=[...rows.values()];
 }
 if(previous.tarotDeleted||next.tarotDeleted){
  const deleted={};for(const source of [previous.tarotDeleted,next.tarotDeleted])if(object(source))for(const [key,ids] of Object.entries(source))if(!blocked.has(key)&&Array.isArray(ids))deleted[key]=[...new Set([...(deleted[key]||[]),...ids.filter(id=>typeof id==='string')])];result.tarotDeleted=deleted;
 }
 return result;
}
