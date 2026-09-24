import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../out/',import.meta.url)));
const artifacts=fileURLToPath(new URL('../../qa-report/tarot-compat/',import.meta.url));
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
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
const hash=value=>[2166136261,374761393,668265263,2246822519].map(seed=>{let h=seed;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}).join('');
let aiCalls=0;
const errors=[];
async function setup(gender='Nam',width=390,{motion='reduce',failFirst=false}={}){
 let requests=0;
 const context=await browser.newContext({viewport:{width,height:844},reducedMotion:motion});
 const profile={name:'An',gender,dob:'1990-01-01',hourChi:'Tí',place:'Hà Nội'};
 const fp=hash(JSON.stringify({profile,image:''}));
 const tarot={first:{text:'Bài Tarot cũ thứ nhất.',updatedAt:Date.now()-1000},second:{text:'Bài Tarot cũ thứ hai.',updatedAt:Date.now()}};
 const bucket={tuviTopics:{},tuviPeriod:{today:{},week:{},month:{}},zodiacTopics:{},zodiacPeriod:{today:{},week:{},month:{}},kinhDich:{},compatibility:{},batuTopics:{},numerologyTopics:{},tarot};
 await context.addInitScript(({profile,fp,bucket})=>{if(!localStorage.getItem('astrox_v2_state'))localStorage.setItem('astrox_v2_state',JSON.stringify({profile,ziweiChart:null,chartImageBase64:null,onboarded:true,aiCache:{version:2,profiles:{[fp]:bucket},legacy:{}}}));},{profile,fp,bucket});
 await context.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let data={};
  if(url.pathname==='/api/site-config')data={config:{billing:{enabled:true,services:[{id:'compat--pair',module:'compat',name:'Tương hợp',status:'free',points:0}]},content:{}},revision:1};
  else if(url.pathname==='/api/me')data={user:{id:'qa-user',display_name:'An'},points:0};
  else if(url.pathname==='/api/module-access')data={access:{}};
  else if(url.pathname==='/api/ai'){
   aiCalls++;requests++;const request=route.request().postDataJSON();
   assert.equal(request.serviceId,'compat--pair');
   assert.equal(request.promptDescriptor.values[1],gender);
   assert.ok(['Nam','Nữ'].includes(request.promptDescriptor.values[6]));
   assert.ok(JSON.stringify(request.messages).includes('LGBTQ+'));
   await new Promise(resolve=>setTimeout(resolve,450));
   if(failFirst&&requests===1){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Lỗi thử nghiệm, vui lòng thử lại.'})});return;}
   data={configRevision:1,choices:[{message:{content:JSON.stringify({percent:80,strengths:['Tôn trọng lẫn nhau.'],watchouts:['Lắng nghe nhiều hơn.'],advice:'Cùng chia sẻ điều hai bạn mong muốn.'})},finish_reason:'stop'}]};
  }
  await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 return {context,page,requestCount:()=>requests};
}
try{
 const {context,page}=await setup();
 await page.goto(base+'/');
 await page.getByText('2 luận giải trong nhật ký',{exact:true}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());console.log(errors);await page.screenshot({path:path.join(artifacts,'debug-home.png')});throw e;});
 await page.getByRole('link').filter({hasText:'2 luận giải trong nhật ký'}).click();
 await page.getByRole('heading',{name:'Các lượt trải đã luận giải'}).waitFor();
 assert.equal(await page.locator('li').filter({has:page.getByRole('button',{name:/Luận giải đã lưu/})}).count(),2);
 await page.getByRole('button',{name:/Luận giải đã lưu/}).first().click();
 await page.getByText('Bài Tarot cũ thứ hai.',{exact:true}).waitFor();
 assert.equal(aiCalls,0,'Reading old Tarot must not call AI');
 await page.screenshot({path:path.join(artifacts,'tarot-recovered-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Quay lại danh sách lượt trải'}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:/Xoá lượt trải ngày/}).first().click();
 await page.goto(base+'/');await page.getByText('1 luận giải trong nhật ký',{exact:true}).waitFor();
 await context.close();
 for(const [gender,partner,width] of [['Nam','Nam',390],['Nữ','Nữ',360],['Nam','Nữ',1440],['Nữ','Nam',390]]){
  const {context,page,requestCount}=await setup(gender,width,{motion:width===1440?'no-preference':'reduce',failFirst:width===360});await page.goto(base+'/tuonghop');
  await page.getByRole('heading',{name:'Hiểu nhau hơn.'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());console.log(errors);await page.screenshot({path:path.join(artifacts,'debug-compat.png')});throw e;});
  assert.equal(await page.getByRole('combobox',{name:'Giới tính',exact:true}).inputValue(),'');
  await page.getByRole('textbox',{name:'Tên người ấy'}).fill('Bình');
  await page.getByRole('combobox',{name:'Giới tính',exact:true}).selectOption(partner);
  await page.getByLabel('Ngày sinh',{exact:true}).fill('1991-02-02');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
  await page.getByRole('heading',{name:'Hiểu nhau hơn.'}).click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:path.join(artifacts,`compat-${gender}-${partner}-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Đang luận giải…'}).isDisabled());
  if(width===360){await page.getByRole('alert').filter({hasText:'Lỗi thử nghiệm'}).waitFor();await page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).click();}
  await page.getByRole('heading',{name:'Câu chuyện của hai bạn'}).waitFor();
  const calls=requestCount();
  await page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).click();
  await page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).waitFor();
  assert.equal(requestCount(),calls,'cached compatibility does not call AI');
  if(width===1440){await page.waitForTimeout(700);await page.screenshot({path:path.join(artifacts,'restored-result-desktop.png'),fullPage:true});}
  await page.getByText('Tôn trọng lẫn nhau.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Cung hoàng đạo',exact:true}).click();
  await page.getByRole('heading',{name:'Gặp nhau ở đâu?'}).waitFor();
  await context.close();
 }
 assert.equal(aiCalls,5);assert.deepEqual(errors,[]);
 console.log('PASS: Tarot recovery, deletion/count, no AI charge on old readings; four gender pairings; loading/error/retry/cache; reduced motion; 360/390/1440px; no page errors.');
 console.log('Screenshots:',artifacts);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
