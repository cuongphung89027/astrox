import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function fixture() {
 const data=new Map();const localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 let fingerprint='alice';const app={profile:{name:'Alice'},aiCache:{profiles:{alice:{tarot:{}},bob:{tarot:{}}}}};
 const state={accountStorageKey:k=>k,notifyDataDirty:()=>{},getState:()=>app,cacheFingerprint:()=>fingerprint,subscribe:()=>()=>{}};
 const source=fs.readFileSync(new URL('../src/lib/tarot-history.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const compiledModule={exports:{}};
 new Function('exports','require','window','localStorage',js)(compiledModule.exports,name=>{if(name==='./state')return state;throw Error(name);},{addEventListener(){},removeEventListener(){}},localStorage);
 return {history:compiledModule.exports,app,localStorage,switchProfile:()=>{fingerprint='bob';}};
}
const entry=(id='one')=>({id,savedAt:100,question:'Question',deckId:'rws',spreadId:'one',spreadName:'Một lá',frameLabel:'',cards:[],text:'Saved reading'});

test('recovers existing cache readings without inventing cards',()=>{
 const {history,app}=fixture();app.aiCache.profiles.alice.tarot.old={text:'Old paid reading',updatedAt:100};
 const rows=history.readTarotHistory();assert.equal(rows.length,1);assert.equal(rows[0].text,'Old paid reading');assert.deepEqual(rows[0].cards,[]);
});
test('new readings belong to their originating profile and repeated saves remain one reading',()=>{
 const {history,switchProfile}=fixture();history.pushTarotHistory(entry());history.pushTarotHistory(entry());assert.equal(history.readTarotHistory().length,1);
 switchProfile();assert.equal(history.readTarotHistory().length,0);history.pushTarotHistory(entry('two'));assert.equal(history.readTarotHistory()[0].id,'two');
});
test('deleting a recovered reading does not make it reappear from cache',()=>{
 const {history,app}=fixture();app.aiCache.profiles.alice.tarot.old={text:'Old reading',updatedAt:100};
 assert.equal(history.readTarotHistory().length,1);history.removeTarotHistory('old');assert.equal(history.readTarotHistory().length,0);
});
test('unscoped legacy entries are matched to the active profile cache, preserving card metadata',()=>{
 const {history,app,localStorage,switchProfile}=fixture();app.aiCache.profiles.alice.tarot.one={text:'Saved reading',updatedAt:100};
 localStorage.setItem('astrox_tarot_history_v1',JSON.stringify([{...entry(),cards:[{id:'0',reversed:false,nameEn:'The Fool',position:'Now'}]}]));
 assert.equal(history.readTarotHistory()[0].cards.length,1);switchProfile();assert.equal(history.readTarotHistory().length,0);
});
test('a newly generated AI reading is immediately readable in the journal',async()=>{
 const {history,app}=fixture();
 const src=fs.readFileSync(new URL('../src/components/tarot/InterpretationPanel.tsx',import.meta.url),'utf8');
 const body=src.split('const load = useCallback(async () => {')[1].split('// eslint-disable-next-line react-hooks/exhaustive-deps')[0];
 const js=ts.transpile('async function check(){'+body+'}',{target:ts.ScriptTarget.ES2022});
 const bindings={forceRef:{current:false},cacheFingerprint:()=> 'alice',tarotCacheKey:x=>x,question:'Today?',deck:{id:'rws',name:'RWS'},spread:{id:'one',name:'Một lá'},frameLabel:'',drawn:[{id:'0',reversed:false}],PROMPT_VERSION:'test',pushTarotHistory:history.pushTarotHistory,positionLabels:['Now'],tarotCardById:()=>({nameEn:'The Fool'}),refreshPromptRevision:async()=>{},readAiCache:()=>'',requireProfile:()=>true,setState:()=>{},setErrMsg:()=>{},buildTarotPrompt:()=>'',profile:{name:'Alice'},profileContextText:()=>'',runAiPrompt:async()=>'Fresh reading',writeAiCache:(_,key,text)=>app.aiCache.profiles.alice.tarot[key]={text,updatedAt:100},setText:()=>{}};
 await new Function(...Object.keys(bindings),js+';return check();')(...Object.values(bindings));
 const rows=history.readTarotHistory();assert.equal(rows.length,1);assert.equal(rows[0].text,'Fresh reading');assert.equal(rows[0].cards[0].nameEn,'The Fool');
});
test('list and count use the same 24 most recent readings and preserve another profile when deleting',()=>{
 const {history,app,switchProfile}=fixture();
 for(let i=0;i<30;i++)app.aiCache.profiles.alice.tarot[`r${i}`]={text:`Reading ${i}`,updatedAt:i+1};
 history.pushTarotHistory({...entry('r29'),fingerprint:'bob',text:'Bob reading'});
 assert.equal(history.readTarotHistory().length,24);assert.equal(history.readTarotHistory()[0].text,'Reading 29');
 history.removeTarotHistory('r29');assert.equal(history.readTarotHistory()[0].text,'Reading 28');
 switchProfile();assert.equal(history.readTarotHistory()[0].text,'Bob reading');
});
test('pending requests retain the original profile when the active profile changes',()=>{
 const {history,switchProfile}=fixture();switchProfile();history.pushTarotHistory({...entry(),fingerprint:'alice'});
 assert.equal(history.readTarotHistory().length,0);
});
