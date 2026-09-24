import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../out/',import.meta.url)));
const artifacts=fileURLToPath(new URL('../../qa-report/rewards/',import.meta.url));
await mkdir(artifacts,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!path.extname(file)&&(await stat(file+'.html').catch(()=>null))?.isFile())file+='.html';
  else if((await stat(file).catch(()=>null))?.isDirectory())file=path.join(file,'index.html');
  res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.REWARDS_QA_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const errors=[];let points=10,today=false,used=0,starts=0,grants=0,sdkLoads=0,txns=[];
const rewardConfig={enabled:true,registrationEnabled:true,registrationInviter:5,firstTopupEnabled:true,firstTopupInviter:10,ads:{enabled:true,points:5,dailyLimit:5}};
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
await context.route('**/api/**',async route=>{
 const r=route.request(),url=new URL(r.url());let data={},status=200;
 if(url.pathname==='/api/me')data={user:{id:'reward-user',display_name:'Reward tester'},points};
 else if(url.pathname==='/api/module-access')data={access:{}};
 else if(url.pathname==='/api/site-config')data={revision:2,config:{content:{},billing:{enabled:false,packages:[],services:[]},rewards:rewardConfig}};
 else if(url.pathname==='/api/user-data')data={_syncRevision:0,profile:{name:'An',gender:'Nam',dob:'1990-01-01',hourChi:'Tí',place:'Hà Nội'}};
 else if(url.pathname==='/api/points/history')data={transactions:txns,nextCursor:null};
 else if(url.pathname==='/api/topup/history')data={orders:[]};
 else if(url.pathname==='/api/rewards/summary')data={enabled:true,ads:{enabled:true,points:5,dailyLimit:5,used,cooldownSeconds:90},attendance:{enabled:true,daily:2,lastDay:today?'2026-09-24':null,streak:today?1:0,claimed:[],today,milestones:[{day:3,points:3,inviterPoints:2},{day:7,points:5,inviterPoints:3},{day:10,points:10,inviterPoints:5}]},referral:{enabled:true,code:'ABC123',invited:0,earned:0,registrationInviter:5,registrationUser:5,firstTopupEnabled:true,firstTopupInviter:10}};
 else if(url.pathname==='/api/rewards/checkin'){if(today){status=409;data={error:'already_checked_in'};}else{today=true;points+=2;txns.unshift({id:'checkin',delta:2,reason:'attendance',created_at:new Date().toISOString()});data={ok:true,day:'2026-09-24',streak:1,points:2,milestones:[],inviterPoints:0};}}
 else if(url.pathname==='/api/rewards/ads/start'){starts++;data={id:'ad-'+starts,points:5,adUnit:'/1234/test'};}
 else if(url.pathname==='/api/rewards/ads/grant'){grants++;points+=5;used++;txns.unshift({id:'ad',delta:5,reason:'ad_reward',created_at:new Date().toISOString()});data={ok:true,points:5};}
 else if(url.pathname.startsWith('/api/rewards/ads/'))data={ok:true};
 await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
});
await context.route('https://securepubads.g.doubleclick.net/tag/js/gpt.js',async route=>{sdkLoads++;await route.fulfill({contentType:'text/javascript',body:`(()=>{const listeners=new Map(),slot={addService:()=>slot};const pending=window.googletag.cmd;window.qaAdEvent=async name=>listeners.get(name)?.({slot,makeRewardedVisible:()=>true});window.googletag={apiReady:true,cmd:{push:fn=>fn()},enums:{OutOfPageFormat:{REWARDED:1}},defineOutOfPageSlot:()=>slot,pubads:()=>({addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)}),enableServices:()=>{},setConfig:()=>{},display:()=>setTimeout(()=>window.qaAdEvent('rewardedSlotReady'),0),destroySlots:()=>{}};pending.forEach(fn=>fn());})()`});});
const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/hoso?section=points&ref=ABC123#rewards');await page.getByRole('button',{name:'Điểm danh ngay',exact:true}).waitFor();
 assert.ok(page.url().includes('section=points'));assert.ok(!page.url().includes('ref='));assert.equal(sdkLoads,0);
 assert.equal(await page.getByRole('heading',{name:'Kiếm thêm Point'}).evaluate(el=>getComputedStyle(el.parentElement).opacity),'1','Reward section must be painted, not only present in DOM');
 await page.getByRole('button',{name:'Điểm danh ngay',exact:true}).click();await page.getByRole('button',{name:'Đã điểm danh hôm nay ✓',exact:true}).waitFor();assert.equal(points,12);assert.equal(await page.getByRole('button',{name:'Đã điểm danh hôm nay ✓',exact:true}).isDisabled(),true);
 assert.ok((await page.getByLabel('Link giới thiệu của bạn').inputValue()).endsWith('/?ref=ABC123'));await page.getByRole('button',{name:'Sao chép link giới thiệu'}).click();assert.ok((await page.evaluate(()=>navigator.clipboard.readText())).endsWith('/?ref=ABC123'));
 for(const width of [360,390,1440]){await page.setViewportSize({width,height:900});await page.getByRole('heading',{name:'Kiếm thêm Point'}).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(artifacts,`wallet-${width}.png`),fullPage:true});}
 await page.getByRole('button',{name:'Xem quảng cáo nhận Point',exact:true}).click();assert.equal(sdkLoads,0);assert.equal(starts,0);await page.getByRole('button',{name:'Để sau',exact:true}).click();assert.equal(starts,0);
 await page.getByRole('button',{name:'Xem quảng cáo nhận Point',exact:true}).click();await page.getByRole('button',{name:'Đồng ý xem',exact:true}).click();await page.waitForFunction(()=>Boolean(window.qaAdEvent));await page.waitForTimeout(200);await page.evaluate(()=>window.qaAdEvent('rewardedSlotClosed'));await page.getByRole('button',{name:'Xem quảng cáo nhận Point',exact:true}).waitFor();assert.equal(grants,0);assert.equal(points,12);
 await page.getByRole('button',{name:'Xem quảng cáo nhận Point',exact:true}).click();await page.getByRole('button',{name:'Đồng ý xem',exact:true}).click();await page.waitForTimeout(300);await page.evaluate(()=>{window.qaAdEvent('rewardedSlotGranted');window.qaAdEvent('rewardedSlotGranted');window.qaAdEvent('rewardedSlotClosed');});await page.getByText('Đã nhận +5 Point từ quảng cáo.',{exact:true}).waitFor();assert.equal(grants,1);assert.equal(points,17);await page.getByText('Thưởng xem quảng cáo',{exact:true}).waitFor();assert.deepEqual(errors,[]);
 console.log('PASS 360/390/1440 wallet, check-in/history, referral copy/query preservation, ad opt-in/cancel/duplicate grant; mocked APIs + SDK, no real provider operation.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
