import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const dir=new URL('../../qa-report/rewards/',import.meta.url);await mkdir(dir,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const violations=[];await page.exposeFunction('qaViolation',v=>violations.push(v));await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>window.qaViolation({directive:e.effectiveDirective,blocked:e.blockedURI})));
 let adRequests=0;page.on('request',r=>{if(r.url().includes('doubleclick.net')||r.url().includes('googlesyndication.com'))adRequests++;});page.setDefaultTimeout(20000);
 await page.goto('https://theastrox.space/banggia');await page.getByRole('heading',{name:'Bảng giá AstroX',exact:true}).waitFor();await page.getByRole('cell',{name:'Miễn phí',exact:true}).first().waitFor();assert.equal(await page.locator('dialog[open]').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:new URL('production-prices-mobile.png',dir).pathname});
 await page.goto('https://theastrox.space/dieukhoan');await page.getByText(/AstroX phản hồi ban đầu trong vòng 2 ngày làm việc/).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
 const config=await(await context.request.get('https://theastrox.space/api/site-config')).json();assert.equal(config.revision,2);assert.equal(config.config.rewards.enabled,true);assert.equal(config.config.rewards.ads.enabled,false);assert.equal(config.config.billing.services.filter(x=>x.status==='free').length,77);
 await page.goto('https://theastrox.space/hoso?section=points');await page.getByRole('heading',{name:'AstroX Point',exact:true}).first().waitFor();await page.waitForTimeout(800);const nonce=await page.locator('script[nonce]').first().evaluate(el=>el.nonce);assert.ok(nonce);assert.equal(adRequests,0);
 const statuses={};for(const [key,url,method] of [['summary','https://api.theastrox.space/api/rewards/summary','GET'],['checkin','https://api.theastrox.space/api/rewards/checkin','POST'],['adStart','https://api.theastrox.space/api/rewards/ads/start','POST'],['adGrant','https://api.theastrox.space/api/rewards/ads/grant','POST']]){const r=await context.request.fetch(url,{method,headers:{Origin:'https://theastrox.space'}});statuses[key]=r.status();}assert.deepEqual(statuses,{summary:401,checkin:401,adStart:401,adGrant:401});
 assert.deepEqual(violations,[]);
 assert.deepEqual(errors,[]);await writeFile(new URL('production-browser.json',dir),JSON.stringify({release:'2026-09-24-rewards-1',configRevision:config.revision,statuses,errors,violations,adRequests,checks:['77 free services preserved','check-in/referrals enabled','ads disabled','prices/terms/wallet render with strict nonce CSP','no Google ad request without consent','390px no overflow'],noAuthenticatedLiveCredit:true,noRealPayment:true,noRealAd:true},null,2));console.log('PASS production: rewards revision 2 enabled, ads off, 77 free services, prices/terms/wallet render, nonce CSP has no violations, no unconsented ads, guest reward guards 401. No real login/payment/ad.');
}finally{await browser.close();}
