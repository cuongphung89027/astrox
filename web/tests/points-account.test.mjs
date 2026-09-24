import test from 'node:test';import assert from 'node:assert/strict';import {load} from './support/load.mjs';
test('old balance response cannot populate another account after logout',async()=>{
 let resolve;const points=await load('lib/points.ts',{mocks:{react:{useCallback:x=>x,useEffect:()=>{},useSyncExternalStore:(_,get)=>get()},'./api':{fetchMeWithPoints:()=>new Promise(r=>{resolve=r;})}}});
 points.setPointsAccount('a');const pending=points.refreshPoints(true);points.setPointsAccount('b');resolve({user:{id:'a'},points:100});await pending;
 assert.equal(points.usePointsBalance().points,null);points.setPointsAccount(null);assert.equal(points.usePointsBalance().points,null);
});
