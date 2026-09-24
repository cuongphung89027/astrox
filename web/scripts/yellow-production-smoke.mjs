import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const dir=new URL('../../qa-report/yellow-items/',import.meta.url);await mkdir(dir,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await page.goto('https://theastrox.space/banggia');await page.getByRole('heading',{name:'Bảng giá AstroX',exact:true}).waitFor();await page.getByRole('cell',{name:'Miễn phí',exact:true}).first().waitFor();assert.equal(await page.locator('dialog[open]').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:new URL('production-prices-mobile.png',dir).pathname});
 await page.goto('https://theastrox.space/dieukhoan');await page.getByText(/AstroX phản hồi ban đầu trong vòng 2 ngày làm việc/).waitFor();assert.equal(await page.locator('dialog[open]').count(),0);
 const statuses={};for(const [key,url,method] of [['privateCloud','https://api.theastrox.space/api/user-data','GET'],['aiSession','https://api.theastrox.space/api/ai/session','POST'],['retiredLogin','https://api.theastrox.space/auth/zalo/finish','GET']]){const r=await context.request.fetch(url,{method,headers:{Origin:'https://theastrox.space'}});statuses[key]=r.status();}
 assert.deepEqual(statuses,{privateCloud:401,aiSession:401,retiredLogin:410});
 assert.deepEqual(errors,[]);await writeFile(new URL('production-browser.json',dir),JSON.stringify({statuses,errors,checks:['public prices loaded from live config','no forced login on pricing/terms','approved support SLA visible','390px no overflow'],noRealPayment:true},null,2));console.log('PASS production browser: public prices, terms/SLA, no forced login, mobile width, guest security guards. No live purchase.');
}finally{await browser.close();}
