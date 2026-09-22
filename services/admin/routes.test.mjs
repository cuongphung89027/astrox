import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/[[path]].js';
test('admin clean route returns its own static page instead of public home',async()=>{
 const fetched=[];const res=await onRequest({request:new Request('https://theastrox.space/admin?view=providers'),env:{ASSETS:{fetch:async r=>{fetched.push(new URL(r.url).pathname);return new Response('admin-html');}}}});
 assert.equal(await res.text(),'admin-html');assert.deepEqual(fetched,['/admin']);
});
test('unknown admin path does not silently serve public home',async()=>{
 const res=await onRequest({request:new Request('https://theastrox.space/admin/missing'),env:{ASSETS:{fetch:async()=>new Response('missing',{status:404})}}});assert.equal(res.status,404);
});
