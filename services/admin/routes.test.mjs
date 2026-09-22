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
test('public deep links serve their exported Next page and preserve query strings',async()=>{
 const request=new Request('https://theastrox.space/hoso?tab=profile');
 const res=await onRequest({request,env:{ASSETS:{fetch:async r=>new Response(new URL(r.url).pathname+new URL(r.url).search)}}});
 assert.equal(await res.text(),'/hoso?tab=profile');
});
test('unknown public routes preserve the exported 404 response',async()=>{
 const res=await onRequest({request:new Request('https://theastrox.space/missing'),env:{ASSETS:{fetch:async r=>new Response('page',{status:new URL(r.url).pathname==='/'?200:404})}}});
 assert.equal(res.status,404);
});
