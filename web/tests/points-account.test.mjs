import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
test('old balance response cannot populate another account after logout',async()=>{
 let resolve;const api={fetchMeWithPoints:()=>new Promise(r=>{resolve=r;})};const exports={};const src=fs.readFileSync(new URL('../src/lib/points.ts',import.meta.url),'utf8');new Function('exports','require',ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,n=>n==='react'?{useCallback:x=>x,useEffect:()=>{},useSyncExternalStore:(_,get)=>get()}:api);
 exports.setPointsAccount('a');const pending=exports.refreshPoints(true);exports.setPointsAccount('b');resolve({user:{id:'a'},points:100});await pending;
 assert.equal(exports.usePointsBalance().points,null);exports.setPointsAccount(null);assert.equal(exports.usePointsBalance().points,null);
});
