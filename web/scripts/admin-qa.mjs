import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const base=process.env.ADMIN_QA_BASE||'http://localhost:3311';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local mutation test: localhost only.');
const password=JSON.parse(readFileSync(new URL('../../.dev-admin/credentials.json',import.meta.url),'utf8')).password;
const out=new URL('../qa-report/admin/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];const results=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/admin');await page.getByLabel('Mật khẩu quản trị').fill(password);await page.getByRole('button',{name:'Đăng nhập'}).click();await page.getByRole('heading',{name:'Tổng quan.',exact:true}).waitFor();assert.equal(await page.locator('.ax-liquid-topbar').count(),0);
 const session=await(await context.request.get(base+'/api/admin/session')).json();
 const initial=await(await context.request.get(base+'/api/admin/config')).json();
 const navigate=async view=>{await page.goto(`${base}/admin?view=${view}`);await page.locator('main h1').waitFor();};
 await navigate('rewards');await page.getByLabel('Point mỗi ngày',{exact:true}).fill('3');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await page.getByText('Đã lưu bản nháp.',{exact:false}).waitFor();await page.reload();await page.getByLabel('Point mỗi ngày',{exact:true}).waitFor();assert.equal(await page.getByLabel('Point mỗi ngày',{exact:true}).inputValue(),'3');results.push('draft save survives reload');
 await navigate('content');await page.getByLabel('Thông báo chung',{exact:true}).fill('Kiểm thử cấu hình AstroX');await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await page.getByText('Đã lưu bản nháp.',{exact:false}).waitFor();await page.getByRole('button',{name:/^Áp dụng/}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.locator('textarea').fill('Local QA: public projection');await dialog.getByRole('button',{name:'Xác nhận áp dụng'}).click();await dialog.waitFor({state:'hidden'});assert.equal((await(await context.request.get(base+'/api/site-config')).json()).config.content.announcement,'Kiểm thử cấu hình AstroX');results.push('publish updates public consumer');
 await page.goto(base+'/');await page.getByText('Kiểm thử cấu hình AstroX',{exact:true}).waitFor();assert.equal(await page.locator('.ax-liquid-topbar').count(),1);results.push('public shell preserved and published notice rendered');
 const latest=await(await context.request.get(base+'/api/admin/config')).json();const headers={origin:base,'x-admin-csrf':session.csrf};let r=await context.request.put(base+'/api/admin/config',{headers,data:{config:initial.draft,expectedRevision:latest.revision}});assert.equal(r.status(),200);const saved=await(await context.request.get(base+'/api/admin/config')).json();r=await context.request.post(base+'/api/admin/publish',{headers,data:{expectedRevision:saved.revision,note:'Restore local QA baseline'}});assert.equal(r.status(),200);
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});for(const view of ['overview','providers','billing','services','payos','zalo','walletbackend','rewards','content','operations','access','users','wallet','reports','audit']){await navigate(view);await page.waitForTimeout(60);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${view} overflows at ${width}`);if(['overview','providers','rewards','billing'].includes(view))await page.screenshot({path:fileURLToPath(new URL(`${view}-${width}.png`,out)),fullPage:true});}results.push(`15 screens without horizontal overflow at ${width}px`);}
 assert.deepEqual(errors,[]);writeFileSync(new URL('results.json',out),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors}));
}finally{await browser.close()}
