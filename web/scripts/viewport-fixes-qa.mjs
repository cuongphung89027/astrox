import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch();const results=[];mkdirSync('qa-report/viewport-fixes',{recursive:true});
for(const width of [320,390,768])for(const route of ['/','/tuvi','/tarot','/cunghoangdao','/battu','/thansohoc','/tuonghop','/hoso','/kinhdich']){
 const p=await browser.newPage({viewport:{width,height:width===320?568:width===390?844:1024}});
 await p.addInitScript(()=>{localStorage.setItem('astrox_v2_state',JSON.stringify({onboarded:true,profile:{name:'QA',gender:'Nam',dob:'1991-06-15',hourChi:'Ngọ (11h-13h)',place:'Hà Nội'}}));window.shifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.shifts.push({value:e.value,nodes:e.sources?.map(s=>s.node?.className)})}).observe({type:'layout-shift',buffered:true})});
 await p.goto('http://localhost:3311'+route,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1200);await p.evaluate(()=>document.fonts.ready);
 const initial=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shifts:window.shifts,title:[...document.querySelectorAll('header p')].map(e=>({text:e.textContent,clipped:e.scrollWidth>e.clientWidth})),asset:[...document.images].filter(e=>e.src.includes('/zodiac/de')).map(e=>({loaded:e.naturalWidth,width:e.width,height:e.height})),cards:[...document.querySelectorAll('[class*="deckArt"] > img')].slice(0,2).map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right}})}));
 await p.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(100);
 const bottom=await p.evaluate(()=>{const m=document.querySelector('main');const c=m?.lastElementChild;const nav=document.querySelector('nav[class*="dock"]');return {contentBottom:c?.getBoundingClientRect().bottom,dockTop:nav?.getBoundingClientRect().top,padding:m&&getComputedStyle(m).paddingBottom}});
 results.push({width,route,...initial,bottom});await p.screenshot({path:`qa-report/viewport-fixes/${width}-${route.slice(1)||'home'}-bottom.png`});await p.close();
}
writeFileSync('qa-report/viewport-fixes/measurements.json',JSON.stringify(results,null,2));
await browser.close();
for(const r of results){
 assert.equal(r.overflow,false,`${r.width} ${r.route}: overflow`);
 assert.ok(r.bottom.contentBottom<r.bottom.dockTop,`${r.width} ${r.route}: dock clearance`);
 for(const t of r.title)assert.equal(t.clipped,false,`${r.width}: ${t.text}`);
 for(const c of r.cards)assert.ok(c.left>=0&&c.right<=r.width,`${r.width}: Tarot containment`);
 for(const a of r.asset)assert.ok(a.loaded>0&&a.width>=48,'Zodiac icon must load at readable size');
 if(r.route==='/')assert.ok(r.shifts.reduce((n,s)=>n+s.value,0)<.1,`${r.width}: home CLS`);
}
console.log(`PASS ${results.length} boundary route checks`);
