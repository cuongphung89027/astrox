const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const sheets=[];
const maps=new Map();
function css(file){
 if(maps.has(file))return maps.get(file);
 const source=fs.readFileSync(file,'utf8');const names={};const prefix=`m${maps.size}_`;
 const result=source.replace(/:global\(([^)]+)\)/g,'$1').replace(/\.([a-zA-Z_][\w-]*)/g,(_,n)=>`.${names[n]??=(prefix+n)}`);
 maps.set(file,names);sheets.push(result);return names;
}
require.extensions['.css']=(m,f)=>{m.exports=css(f)};
for(const ext of ['.tsx','.ts'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);
const original=Module._resolveFilename;
Module._resolveFilename=function(id,...args){return original.call(this,id.startsWith('@/')?path.resolve('src',id.slice(2)):id,...args)};
const {ReadingLoader}=require('../src/components/kit/ReadingLoader.tsx');
const {LoadingWhisper}=require('../src/components/kit/LoadingWhisper.tsx');
const cases=[];
for(const kind of ['tuvi','tarot','zodiac','battu','numerology','compat'])cases.push({name:`reading-${kind}`,html:renderToStaticMarkup(React.createElement(ReadingLoader,{kind}))});
function fixture(name,file,markup,kind){const c=css(path.resolve('src/components',file));cases.push({name,html:markup(c,renderToStaticMarkup(React.createElement(LoadingWhisper,{kind})))});}
fixture('period','tuvi/PeriodPanel.module.css',(c,w)=>`<div class="${c.progress}"><div class="${c.progressTrack}"><span></span></div><ol><li data-state="active"><span class="${c.stepIndicator}"></span>${w}<strong>120s</strong></li></ol></div>`,'period');
fixture('hex-reading','kinhdich/KinhDich.module.css',(c,w)=>`<div class="${c.readingWait}"><div class="${c.loadingHex}" aria-hidden="true"><i><b></b></i></div><div><small>${w}</small></div></div>`,'kinhdich');
fixture('cast','kinhdich/KinhDich.module.css',(c,w)=>`<div class="${c.castFooterLine}"><p>${w}</p><button>Bỏ qua ↗</button></div>`,'cast');
fixture('shuffle','tarot/Tarot.module.css',(c,w)=>`<div class="${c.shuffleStage}"><p>${w}</p></div>`,'shuffle');
fixture('fan','tarot/Tarot.module.css',(c,w)=>`<div class="${c.fanArea}"><p>${w}</p></div>`,'tarot');
fixture('joining','compat/Compat.module.css',(c,w)=>`<p class="${c.joiningText}">${w}</p>`,'compat');
for(const kind of ['packages','payment','general'])cases.push({name:kind,html:renderToStaticMarkup(React.createElement(LoadingWhisper,{kind}))});
(async()=>{const browser=await chromium.launch();let count=0;try{
 for(const width of [320,390,1280])for(const mode of ['normal','os-reduced','app-reduced']){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:mode==='os-reduced'?'reduce':'no-preference'});
 for(const item of cases){
 await page.setContent(`<html ${mode==='app-reduced'?'data-motion="reduced"':''}><head><style>*{box-sizing:border-box}body{margin:0;padding:16px;font:14px Arial;background:#fbf6ec}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}${sheets.join('\n')}</style></head><body>${item.html}</body></html>`);
 const faults=await page.evaluate(reduced=>{
 const problems=[];
 document.getAnimations().forEach(a=>{a.pause();a.currentTime=1000});
 const el=document.querySelector('[data-loading-whisper]');const box=el.getBoundingClientRect();const style=getComputedStyle(el);
 if(box.width<75)problems.push('caption too narrow');if(style.animationName!=='none')problems.push('caption wrapper animated');
 for(let n=el;n&&n!==document.body;n=n.parentElement){const m=new DOMMatrix(getComputedStyle(n).transform);if(Math.abs(m.b)>.01||Math.abs(m.c)>.01)problems.push('rotated caption ancestor');}
 if(document.documentElement.scrollWidth>innerWidth)problems.push('horizontal overflow');
 if(reduced&&document.getAnimations().length)problems.push('animation active with reduced motion');
 return problems;
 },mode!=='normal');
 assert.deepEqual(faults,[],`${item.name} ${width} ${mode}`);count++;
 }
 await page.close();
 }
 console.log(`PASS ${count} loading layout/motion cases (actual shared components + host CSS fixtures)`);
}finally{await browser.close()}})();
