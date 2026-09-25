import test from 'node:test';
import assert from 'node:assert/strict';
import {load,memoryStorage,hookRuntime,nodes} from './support/load.mjs';

async function fixture() {
 const localStorage=memoryStorage();
 let fingerprint='alice';const app={profile:{name:'Alice'},aiCache:{profiles:{alice:{tarot:{}},bob:{tarot:{}}}}};
 const state={accountStorageKey:k=>k,notifyDataDirty:()=>{},getState:()=>app,cacheFingerprint:()=>fingerprint,subscribe:()=>()=>{}};
 const history=await load('lib/tarot-history.ts',{mocks:{'./state':state,'./feature-telemetry':{trackFeature(){}}},globals:{window:{addEventListener(){},removeEventListener(){}},localStorage}});
 return {history,app,localStorage,switchProfile:()=>{fingerprint='bob';}};
}
const entry=(id='one')=>({id,savedAt:100,question:'Question',deckId:'rws',spreadId:'one',spreadName:'Một lá',frameLabel:'',cards:[],text:'Saved reading'});

test('recovers existing cache readings without inventing cards',async()=>{
 const {history,app}=await fixture();app.aiCache.profiles.alice.tarot.old={text:'Old paid reading',updatedAt:100};
 const rows=history.readTarotHistory();assert.equal(rows.length,1);assert.equal(rows[0].text,'Old paid reading');assert.deepEqual(rows[0].cards,[]);
});
test('new readings belong to their originating profile and repeated saves remain one reading',async()=>{
 const {history,switchProfile}=await fixture();history.pushTarotHistory(entry());history.pushTarotHistory(entry());assert.equal(history.readTarotHistory().length,1);
 switchProfile();assert.equal(history.readTarotHistory().length,0);history.pushTarotHistory(entry('two'));assert.equal(history.readTarotHistory()[0].id,'two');
});
test('deleting a recovered reading does not make it reappear from cache',async()=>{
 const {history,app}=await fixture();app.aiCache.profiles.alice.tarot.old={text:'Old reading',updatedAt:100};
 assert.equal(history.readTarotHistory().length,1);history.removeTarotHistory('old');assert.equal(history.readTarotHistory().length,0);
});
test('unscoped legacy entries are matched to the active profile cache, preserving card metadata',async()=>{
 const {history,app,localStorage,switchProfile}=await fixture();app.aiCache.profiles.alice.tarot.one={text:'Saved reading',updatedAt:100};
 localStorage.setItem('astrox_tarot_history_v1',JSON.stringify([{...entry(),cards:[{id:'0',reversed:false,nameEn:'The Fool',position:'Now'}]}]));
 assert.equal(history.readTarotHistory()[0].cards.length,1);switchProfile();assert.equal(history.readTarotHistory().length,0);
});
test('a newly generated AI reading is immediately readable in the journal',async()=>{
 const {history,app}=await fixture();
 const runtime=hookRuntime();
 const {InterpretationPanel}=await load('components/tarot/InterpretationPanel.tsx',{mocks:{react:runtime.react,
  '@/lib/state':{cacheFingerprint:()=>'alice',refreshPromptRevision:async()=>{},readAiCache:()=>'',writeAiCache:(_,key,text)=>{app.aiCache.profiles.alice.tarot[key]={text,updatedAt:100};}},
  '@/lib/api':{runAiPrompt:async()=>'Fresh reading',servicePrices:async()=>({})},
  '@/lib/use-paid-price':{usePaidPrice:()=>({text:'',pending:false,paid:false})},
  '@/lib/tarot':{buildTarotPrompt:()=>'',tarotCacheKey:x=>x,tarotCardById:()=>({nameEn:'The Fool'})},
  '@/lib/tarot-history':{pushTarotHistory:history.pushTarotHistory},
  '@/lib/use-feature-result':{useFeatureResult:()=>()=>{}},
  '@/components/profile/ProfileModal':{useRequireProfile:()=>()=>true,useProfileModal:()=>({open(){}})}}});
 const props={spread:{id:'one',name:'Một lá'},frameLabel:'',deck:{id:'rws',name:'RWS'},question:'Today?',drawn:[{id:'0',reversed:false}],positionLabels:['Now'],profile:{name:'Alice'}};
 const render=()=>{runtime.reset();return InterpretationPanel(props);};
 const start=nodes(render()).find(n=>Array.isArray(n.props?.children)&&n.props.children.includes('Luận giải trải bài'));assert.ok(start,'interpretation button');
 start.props.onClick();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 const rows=history.readTarotHistory();assert.equal(rows.length,1);assert.equal(rows[0].text,'Fresh reading');assert.equal(rows[0].cards[0].nameEn,'The Fool');
});
test('list and count use the same 24 most recent readings and preserve another profile when deleting',async()=>{
 const {history,app,switchProfile}=await fixture();
 for(let i=0;i<30;i++)app.aiCache.profiles.alice.tarot[`r${i}`]={text:`Reading ${i}`,updatedAt:i+1};
 history.pushTarotHistory({...entry('r29'),fingerprint:'bob',text:'Bob reading'});
 assert.equal(history.readTarotHistory().length,24);assert.equal(history.readTarotHistory()[0].text,'Reading 29');
 history.removeTarotHistory('r29');assert.equal(history.readTarotHistory()[0].text,'Reading 28');
 switchProfile();assert.equal(history.readTarotHistory()[0].text,'Bob reading');
});
test('pending requests retain the original profile when the active profile changes',async()=>{
 const {history,switchProfile}=await fixture();switchProfile();history.pushTarotHistory({...entry(),fingerprint:'alice'});
 assert.equal(history.readTarotHistory().length,0);
});
