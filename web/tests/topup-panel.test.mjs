import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture({user={id:'alice'},create,promoCheck}={}) {
  const hooks=[]; let cursor=0; const effects=[]; const calls=[]; const redirects=[];
  const react={
    useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value}];},
    useRef(initial){const i=cursor++;return hooks[i]??=( {current:initial} );},
    useEffect(effect,deps){const i=cursor++;if(!hooks[i]||deps.some((d,j)=>d!==hooks[i].deps[j])){hooks[i]={deps};effects.push(effect);}},
  };
  const api={loadTopupPackages:async()=>[{amount_vnd:10000,points:100},{amount_vnd:20000,points:230}],loadTopupHistory:async()=>[],promoCheck:promoCheck??(async()=>({ok:true,bonus:25})),createTopup:async(...args)=>{calls.push(args);return create?create(...args):{error:'payos'};}};
  const compiled=ts.transpileModule(fs.readFileSync(new URL('../src/components/topup/TopupPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};const refresh=()=>Promise.resolve();
  new Function('exports','require','document','window','HTMLElement',compiled)(exports,name=>name==='react'?react:name==='react/jsx-runtime'?jsx:name.endsWith('/auth')?{useAuth:()=>({astroxUser:user})}:name.endsWith('/points')?{usePointsBalance:()=>({points:500,refresh})}:name.endsWith('/api')?api:name.endsWith('PointCoin')?{PointCoin:()=>null}:name.endsWith('.css')?{default:new Proxy({},{get:(_,key)=>key})}:(()=>{throw Error(name)})(),{activeElement:null,body:{style:{overflow:''}}},{location:{assign:url=>redirects.push(url)}},class {});
  const root=exports.TopupPanel({open:true,onClose(){}});let tree;const cleanups=[];
  function render(){cursor=0;tree=root.type(root.props);return tree;}
  function nodes(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
  function pick(type,predicate=()=>true){const node=nodes(tree).find(n=>n.type===type&&predicate(n.props));assert.ok(node,`missing ${type}`);return node.props;}
  async function load(){render();for(const effect of effects.splice(0)){const cleanup=effect();if(cleanup)cleanups.push(cleanup);}await tick();render();}
  return {load,render,pick,calls,redirects,close:()=>cleanups.forEach(fn=>fn()),select:amount=>{pick('input',p=>p.type==='radio'&&p.value===amount).onChange();render();},pay:()=>pick('button',p=>String(p.children).includes('Tiếp tục')||Array.isArray(p.children)&&p.children[0]==='Đang tạo đơn nạp…'),promoInput:()=>pick('input',p=>p['aria-label']==='Mã ưu đãi'),apply:()=>pick('button',p=>p.children==='Áp dụng')};
}

test('choosing a package never creates an order; explicit checkout uses selected server price',async()=>{const f=fixture();await f.load();assert.equal(f.pay().disabled,true);f.select(20000);assert.equal(f.calls.length,0);assert.equal(f.pay().disabled,false);f.pay().onClick();await tick();f.render();assert.deepEqual(f.calls,[[20000,undefined]]);});
test('double click is locked; network failure releases checkout for retry',async()=>{let reject;const f=fixture({create:()=>new Promise((_,r)=>{reject=r;})});await f.load();f.select(10000);const pay=f.pay();pay.onClick();pay.onClick();assert.equal(f.calls.length,1);reject(new Error('offline'));await tick();f.render();assert.equal(f.pay().disabled,false);assert.match(f.pick('p',p=>p.role==='alert').children,/gián đoạn/);});
test('edited promo invalidates a previously verified bonus and prevents checkout',async()=>{const f=fixture();await f.load();f.select(10000);f.promoInput().onChange({target:{value:'FIRST'}});f.render();f.apply().onClick();await tick();f.render();assert.equal(f.pay().disabled,false);f.promoInput().onChange({target:{value:'SECOND'}});f.render();assert.equal(f.pay().disabled,true);f.pay().onClick();assert.equal(f.calls.length,0);});
test('a stale promo response cannot approve an edited code',async()=>{let resolve;const f=fixture({promoCheck:()=>new Promise(r=>{resolve=r;})});await f.load();f.select(10000);f.promoInput().onChange({target:{value:'FIRST'}});f.render();f.apply().onClick();f.promoInput().onChange({target:{value:'SECOND'}});resolve({ok:true,bonus:999});await tick();f.render();assert.equal(f.pay().disabled,true);});
test('closing the popup ignores a delayed checkout redirect',async()=>{let resolve;const f=fixture({create:()=>new Promise(r=>{resolve=r;})});await f.load();f.select(10000);f.pay().onClick();f.close();resolve({checkoutUrl:'https://example.test/checkout'});await tick();assert.deepEqual(f.redirects,[]);});
test('guest and localhost preview cannot create payment orders',async()=>{for(const user of [null,{id:'localhost-preview'}]){const f=fixture({user});await f.load();f.select(10000);assert.equal(f.pay().disabled,true);f.pay().onClick();assert.equal(f.calls.length,0);}});
