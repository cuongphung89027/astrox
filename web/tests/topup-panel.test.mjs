import test from 'node:test';
import assert from 'node:assert/strict';
import {load,hookRuntime,nodes} from './support/load.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
async function fixture({user={id:'alice'},create,promoCheck}={}) {
  const runtime=hookRuntime(); const calls=[]; const redirects=[];
  const api={loadTopupPackages:async()=>[{amount_vnd:10000,points:100},{amount_vnd:20000,points:230}],loadTopupHistory:async()=>[],promoCheck:promoCheck??(async()=>({ok:true,bonus:25})),createTopup:async(...args)=>{calls.push(args);return create?create(...args):{error:'payos'};}};
  const refresh=()=>Promise.resolve();
  const {TopupPanel}=await load('components/topup/TopupPanel.tsx',{mocks:{react:runtime.react,'@/lib/auth':{useAuth:()=>({astroxUser:user})},'@/lib/points':{usePointsBalance:()=>({points:500,refresh})},'@/lib/api':api,'@/components/points/PointCoin':{PointCoin:()=>null}},globals:{document:{activeElement:null,body:{style:{overflow:''}}},window:{location:{assign:url=>redirects.push(url)}},HTMLElement:class {}}});
  const root=TopupPanel({open:true,onClose(){}});let tree;
  function render(){runtime.reset();tree=root.type(root.props);return tree;}
  function pick(type,predicate=()=>true){const node=nodes(tree).find(n=>n.type===type&&predicate(n.props));assert.ok(node,`missing ${type}`);return node.props;}
  async function mount(){render();runtime.flushEffects();await tick();render();}
  return {load:mount,render,pick,calls,redirects,close:runtime.unmount,select:amount=>{pick('input',p=>p.type==='radio'&&p.value===amount).onChange();render();},pay:()=>pick('button',p=>String(p.children).includes('Tiếp tục')||Array.isArray(p.children)&&p.children[0]==='Đang tạo đơn nạp…'),promoInput:()=>pick('input',p=>p['aria-label']==='Mã ưu đãi'),apply:()=>pick('button',p=>p.children==='Áp dụng')};
}

test('choosing a package never creates an order; explicit checkout uses selected server price',async()=>{const f=await fixture();await f.load();assert.equal(f.pay().disabled,true);f.select(20000);assert.equal(f.calls.length,0);assert.equal(f.pay().disabled,false);f.pay().onClick();await tick();f.render();assert.deepEqual(f.calls,[[20000,undefined]]);});
test('double click is locked; network failure releases checkout for retry',async()=>{let reject;const f=await fixture({create:()=>new Promise((_,r)=>{reject=r;})});await f.load();f.select(10000);const pay=f.pay();pay.onClick();pay.onClick();assert.equal(f.calls.length,1);reject(new Error('offline'));await tick();f.render();assert.equal(f.pay().disabled,false);assert.match(f.pick('p',p=>p.role==='alert').children,/gián đoạn/);});
test('edited promo invalidates a previously verified bonus and prevents checkout',async()=>{const f=await fixture();await f.load();f.select(10000);f.promoInput().onChange({target:{value:'FIRST'}});f.render();f.apply().onClick();await tick();f.render();assert.equal(f.pay().disabled,false);f.promoInput().onChange({target:{value:'SECOND'}});f.render();assert.equal(f.pay().disabled,true);f.pay().onClick();assert.equal(f.calls.length,0);});
test('a stale promo response cannot approve an edited code',async()=>{let resolve;const f=await fixture({promoCheck:()=>new Promise(r=>{resolve=r;})});await f.load();f.select(10000);f.promoInput().onChange({target:{value:'FIRST'}});f.render();f.apply().onClick();f.promoInput().onChange({target:{value:'SECOND'}});resolve({ok:true,bonus:999});await tick();f.render();assert.equal(f.pay().disabled,true);});
test('closing the popup ignores a delayed checkout redirect',async()=>{let resolve;const f=await fixture({create:()=>new Promise(r=>{resolve=r;})});await f.load();f.select(10000);f.pay().onClick();f.close();resolve({checkoutUrl:'https://example.test/checkout'});await tick();assert.deepEqual(f.redirects,[]);});
test('guest and localhost preview cannot create payment orders',async()=>{for(const user of [null,{id:'localhost-preview'}]){const f=await fixture({user});await f.load();f.select(10000);assert.equal(f.pay().disabled,true);f.pay().onClick();assert.equal(f.calls.length,0);}});
