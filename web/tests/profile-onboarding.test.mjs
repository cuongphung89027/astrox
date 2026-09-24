import test from 'node:test';
import assert from 'node:assert/strict';
import {load,hookRuntime} from './support/load.mjs';
async function timers({ready=true,cloudReady=false,profile=null}={}){
 const runtime=hookRuntime();
 const {ProfileModalProvider}=await load('components/profile/ProfileModal.tsx',{mocks:{react:runtime.react,'@/lib/auth':{useAuth:()=>({loggedIn:true,ready,astroxUser:{id:'account'}})},'@/lib/cloud-sync':{useCloudProfileReady:()=>cloudReady},'@/lib/use-store':{useProfile:()=>profile}}});
 const delays=[],realSetTimeout=globalThis.setTimeout;
 globalThis.setTimeout=(_,delay)=>{delays.push(delay);return 1;};
 try{ProfileModalProvider({children:null});runtime.flushEffects();}finally{globalThis.setTimeout=realSetTimeout;}
 return delays;
}
test('existing account is not forced into profile wizard while auth or cloud download is pending',async()=>{assert.ok(!(await timers({ready:false,cloudReady:true})).includes(600));assert.ok(!(await timers({cloudReady:false})).includes(600));});
test('profile wizard only auto-opens after successful download confirms no saved profile',async()=>{assert.ok((await timers({cloudReady:true})).includes(600));assert.ok(!(await timers({cloudReady:true,profile:{name:'Saved'}})).includes(600));});
