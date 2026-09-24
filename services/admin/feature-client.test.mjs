import test from 'node:test';
import assert from 'node:assert/strict';
import {trackFeature} from '../../web/src/lib/feature-telemetry.ts';
function browser(){
 const values=new Map(),sent=[];
 globalThis.window={innerWidth:390};
 Object.defineProperty(globalThis,'navigator',{value:{doNotTrack:'0'},configurable:true});
 globalThis.sessionStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 globalThis.fetch=async(url,opts)=>{sent.push({url,...opts,body:JSON.parse(opts.body)});return new Response(null,{status:204});};
 return {values,sent};
}
test('anonymous client sends only allowlisted fields and groups viewport; retry IDs stable',()=>{
 const {sent}=browser(),id=crypto.randomUUID();trackFeature('feature_start','tarot','ai',id);trackFeature('feature_start','tarot','ai',id);
 assert.equal(sent.length,2);assert.equal(sent[0].body.id,sent[1].body.id);assert.equal(sent[0].body.session_id,sent[1].body.session_id);assert.equal(sent[0].credentials,'omit');assert.equal(sent[0].body.device,'mobile');assert.deepEqual(Object.keys(sent[0].body).sort(),['id','event','module','service_id','source','session_id','device'].sort());
});
test('DNT and unknown service suppress collection; blocked storage never throws',()=>{
 const {sent}=browser();navigator.doNotTrack='1';trackFeature('feature_view','tarot','navigation');assert.equal(sent.length,0);
 navigator.doNotTrack='0';trackFeature('feature_view','sensitive question','navigation');assert.equal(sent.length,0);
 sessionStorage.getItem=()=>{throw new Error('blocked');};assert.doesNotThrow(()=>trackFeature('feature_view','tarot','navigation'));assert.equal(sent.length,0);
});
test('session expires after 30 minutes and never contains identity',()=>{
 const {sent,values}=browser();trackFeature('feature_view','tarot','navigation');const first=sent[0].body.session_id;
 const [key,value]=[...values][0];const session=JSON.parse(value);session.at=Date.now()-31*60*1000;values.set(key,JSON.stringify(session));trackFeature('feature_view','tarot','navigation');assert.notEqual(sent[1].body.session_id,first);assert.deepEqual(Object.keys(JSON.parse(values.get(key))).sort(),['at','id']);
});
