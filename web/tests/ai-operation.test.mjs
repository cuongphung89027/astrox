import test from 'node:test';import assert from 'node:assert/strict';import {load,memoryStorage} from './support/load.mjs';
const open=storage=>load('lib/ai-operation.ts',{globals:{sessionStorage:storage}});
test('an unresolved operation survives reload; another user or input never shares it',async()=>{
 const storage=memoryStorage(),first=await open(storage),body={operationId:'ignored-random',serviceId:'tarot',messages:['private input']};
 const a=await first.pendingAiOperation('user-a',body),reload=await open(storage);
 assert.deepEqual(await reload.pendingAiOperation('user-a',{...body,operationId:'different-random'}),a);
 assert.notEqual((await reload.pendingAiOperation('user-b',body)).id,a.id);
 assert.notEqual((await reload.pendingAiOperation('user-a',{...body,messages:['different']})).id,a.id);
 assert.ok(!JSON.stringify([...storage.data]).includes('private input'));
 reload.finishAiOperation(a.key);assert.notEqual((await reload.pendingAiOperation('user-a',body)).id,a.id);
});
