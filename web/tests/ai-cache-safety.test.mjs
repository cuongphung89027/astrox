import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function fixture(storage=new Map(),fetchImpl=async()=>Response.json({revision:1})){
 const source=fs.readFileSync(new URL('../src/lib/state.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const compiledModule={exports:{}};
 new Function('exports','require','window','localStorage','fetch',js)(compiledModule.exports,()=>({DEFAULT_MODEL:'test',PROMPT_VERSION:'test',STORAGE_KEY:'state'}),{}, {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetchImpl);
 compiledModule.exports.getState();return {state:compiledModule.exports,storage};
}
test('a saved paid reading remains readable after config outage, reload and revision upgrade',async()=>{
 const {state,storage}=fixture();state.setState({profile:{name:'An',dob:'1990-01-01'}});state.setPromptRevision(1);state.writeAiCache('compatibility','pair','Paid reading');
 const offline=fixture(storage,async()=>{throw Error('offline')}).state;await offline.refreshPromptRevision();assert.equal(offline.readAiCache('compatibility','pair'),'Paid reading');
 offline.setPromptRevision(2);assert.equal(offline.readAiCache('compatibility','pair'),'Paid reading');
 offline.setState({profile:{name:'Other',dob:'1992-01-01'}});assert.equal(offline.readAiCache('compatibility','pair'),'');
});
test('repeatable readings still respect explicit force and expiry during outages',async()=>{
 const {state}=fixture();state.setPromptRevision(1);state.writeAiCache('tarot','draw','Saved tarot');
 assert.equal(state.readAiCache('tarot','draw',true),'');
 state.getState().aiCache.profiles[state.cacheFingerprint()].tarot.draw.expiresAt=1;
 assert.equal(state.readAiCache('tarot','draw'),'');
});
