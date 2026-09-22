import {chromium} from 'playwright';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const base='http://localhost:3311';
const password=JSON.parse(readFileSync(new URL('../../.dev-admin/credentials.json',import.meta.url))).password;
const out=new URL('../qa-report/admin/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));let requests=0;
const rows=Array.from({length:45},(_,i)=>({id:`test-${i+1}`,display_name:i===0?'Đặng Ngọc Ánh':`Người thử ${i+1}`,email:`test${i+1}@example.invalid`,balance:i+1,status:i%2?'pending':'paid',detail:{source:'Browser QA fixture only'},extra:'Thông tin đầy đủ'}));
try{
 await page.goto(base+'/admin');await page.getByLabel('Mật khẩu quản trị').fill(password);await page.getByRole('button',{name:'Đăng nhập'}).click();await page.getByRole('heading',{name:'Tổng quan.',exact:true}).waitFor();
 await page.route('**/api/admin/data/users',route=>{requests++;return route.fulfill({json:{available:true,rows}})});
 await page.goto(base+'/admin?view=users');await page.getByText('1–20 / 45 bản ghi · Trang 1/3',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Trang sau',exact:true}).click();await page.getByText('21–40 / 45 bản ghi · Trang 2/3',{exact:true}).waitFor();
 await page.getByRole('searchbox').fill('dang ngoc');await page.getByText('1–1 / 1 bản ghi · Trang 1/1',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Xem bản ghi test-1',exact:true}).click();await page.locator('dd').filter({hasText:'Thông tin đầy đủ'}).waitFor();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất CSV (1)',exact:true}).click();const download=await pending;const path=await download.path();const csv=readFileSync(path,'utf8');assert.ok(csv.includes('Đặng Ngọc Ánh'));assert.ok(!csv.includes('test2@example.invalid'));
 await page.getByRole('searchbox').fill('');await page.getByLabel('Trạng thái',{exact:true}).selectOption('paid');await page.getByText('1–20 / 23 bản ghi · Trang 1/2',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Số dư Point',exact:false}).click();await page.locator('th[aria-sort=ascending]').waitFor();await page.getByRole('button',{name:'Số dư Point',exact:false}).click();await page.locator('th[aria-sort=descending]').waitFor();await page.waitForFunction(()=>document.querySelector('tbody tr')?.textContent?.includes('test-45'));assert.match(await page.locator('tbody tr').first().innerText(),/test-45/);
 const beforeRefresh=requests;await page.getByRole('button',{name:'Làm mới dữ liệu',exact:true}).click();await page.getByText('1–20 / 45 bản ghi · Trang 1/3',{exact:true}).waitFor();assert.ok(requests>beforeRefresh);
 for(const width of [1440,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:fileURLToPath(new URL(`data-${width}.png`,out)),fullPage:true});}
 await page.route('**/api/admin/data/rewards',route=>route.fulfill({json:{available:true,rows:[{id:'reward-fixture',points:5,status:'credited'}]}}));
 await page.route('**/api/admin/data/ai',route=>route.fulfill({json:{available:true,rows:[{id:'ai-fixture',service_id:'tuvi',status:'success',attempts:[{providerId:'test-only',outcome:'success'}]}]}}));
 await page.goto(base+'/admin?view=reports');await page.getByRole('button',{name:'Lịch sử thưởng',exact:true}).click();await page.getByRole('cell',{name:'reward-fixture',exact:true}).waitFor();
 await page.getByRole('button',{name:'Hoạt động AI',exact:true}).click();await page.getByRole('cell',{name:'ai-fixture',exact:true}).waitFor();assert.equal(await page.getByRole('cell',{name:'reward-fixture',exact:true}).count(),0);
 assert.deepEqual(errors,[]);const results=['Vietnamese search and pagination','status filtering and numeric sorting','complete record details','filtered CSV download','data refresh','responsive table at 4 widths'];writeFileSync(new URL('data-results.json',out),JSON.stringify({results,errors},null,2));console.log({results,errors});
}finally{await browser.close()}
