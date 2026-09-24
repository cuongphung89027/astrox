/** Local UI contracts only: auth/pricing/AI APIs are stubbed, chart calculations are real. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:3347';
const out=new URL('../../qa-report/readings-motion/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[],checks=[];let calls=[];
async function go(page,url){await page.goto(url);await page.waitForLoadState('networkidle');}
async function checkpoint(page,name){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${name}`);checks.push(name);}
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{if(!localStorage.getItem('astrox_v2_state'))localStorage.setItem('astrox_v2_state',JSON.stringify({onboarded:true,profile:{name:'An QA',gender:'Nam',dob:'1990-01-01',hourChi:'Tý',place:'Hà Nội'},aiCache:{version:2,profiles:{},legacy:{}}}));});
  await context.route('**/api/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let data={};let status=200;
   if(path==='/api/me')data={user:null};
   else if(path==='/api/module-access')data={access:{}};
   else if(path==='/api/site-config')data={revision:1,config:{content:{},billing:{enabled:false,services:['kinhdich--interpretation','compat--tuvi-pair','compat--batu-pair','compat--pair'].map(id=>({id,module:id.split('--')[0],name:id,status:'free',points:0}))}}};
   else if(path==='/api/ai/session')status=401;
   else if(path==='/api/ai'){const body=req.postDataJSON();calls.push(body);data={languagePolicyVersion:'vi-reading-1',configRevision:1,choices:[{finish_reason:'stop',message:{content:'**Điểm đồng điệu**\n\nHai bạn cùng lắng nghe.\n\n**Gợi ý cho bạn**\n\nChia sẻ điều cần dung hòa.'}}]};}
   await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
  });
  const p=await context.newPage();await p.addLocatorHandler(p.getByRole('button',{name:'Đóng hộp thoại đăng nhập'}),async()=>{await p.getByRole('button',{name:'Đóng hộp thoại đăng nhập'}).click();});p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
  await go(p,base+'/kinhdich');await p.waitForLoadState('networkidle');
  assert.equal(await p.locator('#kd-method option').count(),7);await p.locator('#kd-method').selectOption('coins');assert.ok(await p.getByRole('button',{name:'Gieo quẻ',exact:true}).isEnabled());
  await checkpoint(p,`${width} coin input`);
  await p.screenshot({path:new URL(`${width}-setup.png`,out).pathname,fullPage:true});
  await p.getByRole('button',{name:'Gieo quẻ',exact:true}).click();await p.getByRole('heading',{name:'Quẻ của bạn'}).waitFor();await checkpoint(p,`${width} six coin result`);
  await p.screenshot({path:new URL(`${width}-coins.png`,out).pathname,fullPage:true});
  await p.getByRole('button',{name:'Lập quẻ khác',exact:true}).click();await p.getByLabel('Nhập kết quả gieo xu thật').check();
  for(let i=1;i<=6;i++)await p.getByLabel(`Giá trị hào ${i}`).selectOption('7');
  await p.getByRole('button',{name:'Lập quẻ',exact:false}).click();assert.ok((await p.locator('main').innerText()).includes('Thuần Càn'));assert.ok((await p.locator('main').innerText()).includes('Không có hào động'));
  await p.reload();await p.waitForLoadState('networkidle');assert.ok((await p.locator('main').innerText()).includes('Thuần Càn'));await checkpoint(p,`${width} history persisted`);
  for(const [method,input]of [['serial','AB00123456'],['phone','+84 912 345 678'],['digits','001234']]){
   await go(p,base+'/kinhdich');await p.locator('#kd-method').selectOption(method);await p.locator('#kd-digits').fill(input);await p.getByRole('button',{name:'Lập quẻ',exact:false}).click();await p.getByRole('heading',{name:'Quẻ của bạn'}).waitFor();await checkpoint(p,`${width} ${method}`);
   if(method==='phone'){const history=await p.evaluate(()=>localStorage.getItem('astrox_kd_history_v1'));assert.ok(!history.includes('0912345678'));await p.screenshot({path:new URL(`${width}-phone.png`,out).pathname,fullPage:true});}
  }
  await go(p,base+'/kinhdich');await p.locator('#kd-method').selectOption('numbers');await p.getByLabel('Tự nhập ba số').check();for(let i=1;i<=3;i++)await p.getByLabel(`Số ${i}`,{exact:true}).fill(String([1,6,6][i-1]));await p.getByRole('button',{name:'Lập quẻ',exact:false}).click();await p.getByText('Xem chi tiết quẻ').click();assert.ok((await p.locator('main').innerText()).includes('Thể: Càn'));
  await go(p,base+'/kinhdich');await p.locator('#kd-method').selectOption('time');await p.getByRole('button',{name:'Lập quẻ',exact:false}).click();await p.getByRole('heading',{name:'Quẻ của bạn'}).waitFor();await checkpoint(p,`${width} time`);
  await go(p,base+'/tuonghop?mode=tuvi');await p.waitForLoadState('networkidle');
  await p.locator('[name=personBName]').fill('Bình QA');await p.locator('[name=personBGender]').selectOption('Nam');await p.locator('[name=personBDob]').fill('1992-02-02');await p.locator('[name=personBHour]').selectOption('unknown');await p.getByRole('button',{name:'Lập hai lá số'}).click();await p.getByRole('alert').filter({hasText:'Cần biết giờ sinh'}).waitFor();
  const hours=await p.locator('[name=personBHour] option').allTextContents();const hourValue=hours.find(x=>x.startsWith('Ngọ'));await p.locator('[name=personBHour]').selectOption({label:hourValue});
  await p.getByRole('button',{name:'Lập hai lá số'}).click();await p.getByRole('heading',{name:'Hai lá số, hai góc nhìn'}).waitFor();await p.getByText(/Xem dữ kiện đã tính cho hai bạn/).click();await checkpoint(p,`${width} tuvi same-sex pair`);
  await p.getByRole('button',{name:'Đọc luận giải hai bạn'}).click();await p.getByText('Hai bạn cùng lắng nghe.',{exact:true}).waitFor();assert.equal(calls.at(-1).serviceId,'compat--tuvi-pair');assert.equal(calls.at(-1).promptDescriptor.id,'compat.tuviPair.v1');
  await p.screenshot({path:new URL(`${width}-tuvi-pair.png`,out).pathname,fullPage:true});
  const count=calls.length;await p.locator('[name=personBName]').fill('Bình mới');assert.equal(await p.getByText('Hai bạn cùng lắng nghe.',{exact:true}).count(),0);
  await p.getByRole('navigation',{name:'Phương pháp tương hợp'}).getByRole('button',{name:'Bát Tự',exact:true}).click();assert.equal(await p.locator('[name=personBName]').inputValue(),'Bình mới');await p.locator('[name=personBPlace]').selectOption('Đà Nẵng');await p.getByRole('button',{name:'Lập hai lá số'}).click();await p.getByRole('heading',{name:'Hai lá số, hai góc nhìn'}).waitFor();await p.getByRole('button',{name:'Đọc luận giải hai bạn'}).click();await p.getByText('Hai bạn cùng lắng nghe.',{exact:true}).waitFor();assert.equal(calls.length,count+1);assert.equal(calls.at(-1).serviceId,'compat--batu-pair');assert.ok(!/\p{Script=Han}/u.test(calls.at(-1).promptDescriptor.values[0]));await checkpoint(p,`${width} batu pair`);
  await p.screenshot({path:new URL(`${width}-batu-pair.png`,out).pathname,fullPage:true});
  await p.getByRole('navigation',{name:'Phương pháp tương hợp'}).getByRole('button',{name:'Cung hoàng đạo'}).click();await p.getByRole('navigation',{name:'Phương pháp tương hợp'}).getByRole('button',{name:'Tử Vi',exact:true}).click();assert.equal(await p.locator('[name=personBName]').inputValue(),'Bình mới');checks.push(`${width} pair mode retention`);
  // Reopen a paid legacy pair reading without any inference request.
  await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('astrox_v2_state'));const fp=Object.keys(s.aiCache.profiles).find(k=>Object.keys(s.aiCache.profiles[k].compatibility||{}).length);s.aiCache.profiles[fp].compatibility[JSON.stringify(['original-tuvi','Bình cũ','Nam','1992-02-02',fp])]={text:'Bài cặp đôi đã mua từ trước.'};localStorage.setItem('astrox_v2_state',JSON.stringify(s));});
  await go(p,base+'/tuonghop?mode=tuvi');await p.locator('[name=personBName]').fill('Bình cũ');await p.locator('[name=personBGender]').selectOption('Nam');await p.locator('[name=personBDob]').fill('1992-02-02');const legacyCalls=calls.length;await p.getByText('Luận giải đã lưu từ phiên bản trước',{exact:true}).click();await p.getByText('Bài cặp đôi đã mua từ trước.',{exact:true}).waitFor();assert.equal(calls.length,legacyCalls);checks.push(`${width} legacy paid pair preserved`);
  await go(p,base+'/kinhdich');await p.locator('#kd-method').selectOption('coins');
  await p.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await p.locator('[class*=goldCoin]').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.emulateMedia({reducedMotion:'no-preference'});
  await p.evaluate(()=>document.documentElement.dataset.motion='reduced');
  assert.equal(await p.locator('[class*=goldCoin]').first().evaluate(e=>getComputedStyle(e).animationName),'none');
  checks.push(`${width} system and app reduced-motion`);
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('report.json',out),JSON.stringify({checks,errors,aiCalls:calls.length,api:'mocked; no charge or live provider request'},null,2));console.log(`PASS ${checks.length} browser checkpoints; ${calls.length} mocked AI calls; no page errors.`);
}finally{await browser.close();}
