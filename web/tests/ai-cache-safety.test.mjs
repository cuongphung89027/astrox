import test from 'node:test';
import assert from 'node:assert/strict';
import {load,memoryStorage} from './support/load.mjs';
async function fixture(data=new Map(),fetchImpl=async()=>Response.json({revision:1})){
 const state=await load('lib/state.ts',{globals:{window:{},localStorage:memoryStorage(data),fetch:fetchImpl}});
 state.getState();return {state,data};
}
test('a saved paid reading remains readable after config outage, reload and revision upgrade',async()=>{
 const {state,data}=await fixture();state.setState({profile:{name:'An',dob:'1990-01-01'}});state.setPromptRevision(1);state.writeAiCache('compatibility','pair','Paid reading');
 const offline=(await fixture(data,async()=>{throw Error('offline')})).state;await offline.refreshPromptRevision();assert.equal(offline.readAiCache('compatibility','pair'),'Paid reading');
 offline.setPromptRevision(2);assert.equal(offline.readAiCache('compatibility','pair'),'Paid reading');
 offline.setState({profile:{name:'Other',dob:'1992-01-01'}});assert.equal(offline.readAiCache('compatibility','pair'),'');
});
test('repeatable readings still respect explicit force and expiry during outages',async()=>{
 const {state}=await fixture();state.setPromptRevision(1);state.writeAiCache('tarot','draw','Saved tarot');
 assert.equal(state.readAiCache('tarot','draw',true),'');
 state.getState().aiCache.profiles[state.cacheFingerprint()].tarot.draw.expiresAt=1;
 assert.equal(state.readAiCache('tarot','draw'),'');
});
