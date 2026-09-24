import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
function load(storage){const source=fs.readFileSync(new URL('../src/lib/ai-operation.ts',import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};new Function('exports','sessionStorage',js)(exports,{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)});return exports;}
test('an unresolved operation survives reload; another user or input never shares it',async()=>{
 const storage=new Map(),first=load(storage),body={operationId:'ignored-random',serviceId:'tarot',messages:['private input']};
 const a=await first.pendingAiOperation('user-a',body),reload=load(storage);
 assert.deepEqual(await reload.pendingAiOperation('user-a',{...body,operationId:'different-random'}),a);
 assert.notEqual((await reload.pendingAiOperation('user-b',body)).id,a.id);
 assert.notEqual((await reload.pendingAiOperation('user-a',{...body,messages:['different']})).id,a.id);
 assert.ok(!JSON.stringify([...storage]).includes('private input'));
 reload.finishAiOperation(a.key);assert.notEqual((await reload.pendingAiOperation('user-a',body)).id,a.id);
});
