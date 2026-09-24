"use client";
import {useSyncExternalStore} from 'react';
import {getState,setState,onDataDirty,accountStorageKey} from './state';
import {mergeCloud,type CloudData} from './cloud-merge';
let status='Chỉ lưu trên thiết bị này';const listeners=new Set<()=>void>();
const publish=(value:string)=>{status=value;listeners.forEach(l=>l());};
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
export const useCloudSyncStatus=()=>useSyncExternalStore(subscribe,()=>status,()=> 'Chỉ lưu trên thiết bị này');
const HISTORY='astrox_tarot_history_v1',DELETED='astrox_tarot_history_deleted_v1';
function stored(key:string,fallback:unknown){try{return JSON.parse(localStorage.getItem(accountStorageKey(key))||'null')??fallback;}catch{return fallback;}}
function snapshot():CloudData{const s=getState();return {profile:s.profile,chartImageBase64:s.chartImageBase64,chartImageMime:s.chartImageMime,ziweiChart:s.ziweiChart,natalChart:s.natalChart??null,aiCache:s.aiCache,lastAiModel:s.lastAiModel||'',tarotHistory:stored(HISTORY,[]),tarotDeleted:stored(DELETED,{})};}
function apply(data:CloudData){
 for(const [field,key] of [['tarotHistory',HISTORY],['tarotDeleted',DELETED]])if(data[field])localStorage.setItem(accountStorageKey(key),JSON.stringify(data[field]));
 const patch={...data};delete patch.tarotHistory;delete patch.tarotDeleted;delete patch._syncRevision;
 setState(patch as Parameters<typeof setState>[0]);
}
export function startCloudSync(url:string,headers:()=>Promise<Record<string,string>>){
 let active=true,busy=false,dirty=false,revision=0,base:CloudData=stored('astrox_cloud_base',snapshot()) as CloudData;
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const request=async(method:'GET'|'PUT',payload?:CloudData)=>fetch(url,{method,credentials:'include',headers:{'content-type':'application/json',...await headers()},signal:controller.signal,...(payload?{body:JSON.stringify({payload,expectedRevision:revision})}:{})});
 const sync=async()=>{
  if(!active||busy)return;busy=true;publish('Đang đồng bộ…');
  try{
   // Always read before upload; reconnect/conflicts retry this step.
   const r=await request('GET');if(!r.ok)throw Error('read');const remote=await r.json();if(!active)return;
   if(!Number.isSafeInteger(remote._syncRevision))throw Error('revision');
   revision=remote._syncRevision;const merged=mergeCloud(remote,snapshot(),base);apply(merged);base=remote;
   const clean={...remote};delete clean._syncRevision;
   if(dirty||JSON.stringify(merged)!==JSON.stringify(clean)){
    const sent=snapshot();dirty=false;const w=await request('PUT',sent);if(!active)return;
    if(w.status===409){dirty=true;publish('Đang hợp nhất thay đổi…');return;}
    if(!w.ok){dirty=true;throw Error(w.status===413?'large':'write');}
    const saved=await w.json();if(!active)return;revision=saved.revision;base=sent;localStorage.setItem(accountStorageKey('astrox_cloud_base'),JSON.stringify(base));
   }
   localStorage.setItem(accountStorageKey('astrox_cloud_base'),JSON.stringify(base));
   publish(dirty?'Đang đồng bộ…':'Đã đồng bộ với tài khoản');
  }catch(e){if(active)publish(e instanceof Error&&e.message==='large'?'Dữ liệu quá lớn để đồng bộ. Bản trên thiết bị vẫn được giữ.':'Chưa đồng bộ được. Dữ liệu vẫn lưu trên thiết bị; sẽ tự thử lại.');}
  finally{busy=false;if(active&&dirty){clearTimeout(timer);timer=setTimeout(()=>void sync(),3000);}}
 };
 const unsubscribe=onDataDirty(()=>{dirty=true;clearTimeout(timer);timer=setTimeout(()=>void sync(),800);});
 const interval=setInterval(()=>{if(document.visibilityState==='visible')void sync();},30000);
 void sync();
 return()=>{active=false;controller.abort();clearTimeout(timer);clearInterval(interval);unsubscribe();publish('Chỉ lưu trên thiết bị này');};
}
