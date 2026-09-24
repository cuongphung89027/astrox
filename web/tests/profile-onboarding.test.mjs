import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function timers({ready=true,cloudReady=false,profile=null}={}){
 const effects=[],delays=[];const exports={};
 const react={createContext:()=>({Provider:'provider'}),useCallback:f=>f,useMemo:f=>f(),useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect:f=>effects.push(f)};
 const source=fs.readFileSync(new URL('../src/components/profile/ProfileModal.tsx',import.meta.url),'utf8');
 const require=name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}:name==='@/lib/auth'?{useAuth:()=>({loggedIn:true,ready,astroxUser:{id:'account'}})}:name==='@/lib/cloud-sync'?{useCloudProfileReady:()=>cloudReady}:name==='@/lib/use-store'?{useProfile:()=>profile}:{};
 new Function('exports','require','setTimeout','clearTimeout',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,require,(_,delay)=>{delays.push(delay);return 1;},()=>{});
 exports.ProfileModalProvider({children:null});for(const effect of effects)effect();return delays;
}
test('existing account is not forced into profile wizard while auth or cloud download is pending',()=>{assert.ok(!timers({ready:false,cloudReady:true}).includes(600));assert.ok(!timers({cloudReady:false}).includes(600));});
test('profile wizard only auto-opens after successful download confirms no saved profile',()=>{assert.ok(timers({cloudReady:true}).includes(600));assert.ok(!timers({cloudReady:true,profile:{name:'Saved'}}).includes(600));});
