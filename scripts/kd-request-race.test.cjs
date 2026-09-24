const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('../web/node_modules/typescript'),Module=require('node:module');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(){
 const refresh=deferred(),response=deferred(),writes=[],stateChanges=[],cleanups=[];let scope='A',calls=0;
 const mocks={
  "react/jsx-runtime":{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
  react:{useState:v=>[v,x=>stateChanges.push(x)],useRef:v=>({current:v}),useCallback:f=>f,useEffect:f=>{const c=f();if(c)cleanups.push(c);}},
  '@/lib/state':{cacheFingerprint:()=>scope,refreshPromptRevision:()=>refresh.promise,readAiCache:()=>'',writeAiCache:(...args)=>writes.push(args)},
  '@/lib/api':{runAiPrompt:()=>{calls++;return response.promise;}},
  '@/lib/use-store':{useProfile:()=>({name:'A'})},
  '@/lib/use-feature-result':{useFeatureResult:()=>()=>{}},
  '@/components/profile/ProfileModal':{useProfileModal:()=>({open(){}}),useRequireProfile:()=>()=>true},
  '@/lib/kinhdich':{kdCacheKey:()=> 'key',buildKdPrompt:()=> 'prompt'},
 };
 const original=Module._load;Module._load=function(id,parent,isMain){if(mocks[id])return mocks[id];if(id.startsWith('@/')||id.endsWith('.css')||id==='./KdReading')return new Proxy({}, {get:(_,key)=>key==='default'?{}:()=>null});return original.call(this,id,parent,isMain);};
 let tree;try{const file=require('node:path').resolve(__dirname,'../web/src/components/kinhdich/KdAiPanel.tsx'),m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(require('node:path').dirname(file));m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);tree=m.exports.KdAiPanelContent({result:{},question:'question',onReset(){}});}finally{Module._load=original;}
 function find(v){if(!v||typeof v!=='object')return; if(v.type==='button'&&v.props.onClick)return v.props.onClick;for(const child of [v.props?.children].flat(Infinity)){const found=find(child);if(found)return found;}}
 return {click:find(tree),refresh,response,writes,stateChanges,scope:v=>scope=v,calls:()=>calls,unmount:()=>cleanups.forEach(c=>c())};
}
test('double click during prompt refresh starts at most one request',async()=>{const h=harness(),one=h.click(),two=h.click();assert.ok(h.stateChanges.includes('loading'));h.refresh.resolve();await Promise.resolve();assert.equal(h.calls(),1);h.response.resolve('text');await Promise.all([one,two]);assert.equal(h.writes.length,1);});
test('profile change while inference runs discards old reading before current cache write',async()=>{const h=harness(),task=h.click();h.refresh.resolve();await Promise.resolve();h.scope('B');h.response.resolve('old profile reading');await task;assert.equal(h.writes.length,0);assert.ok(!h.stateChanges.includes('old profile reading'));});
test('unmount while refreshing never starts a billed request',async()=>{const h=harness(),task=h.click();h.unmount();h.refresh.resolve();h.response.resolve('late');await task;assert.equal(h.calls(),0);});
