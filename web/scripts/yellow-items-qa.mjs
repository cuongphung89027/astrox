import {createServer} from 'node:http';
import {readFile,stat,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../out/',import.meta.url)));
const artifacts=fileURLToPath(new URL('../../qa-report/yellow-items/',import.meta.url));
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
const errors=[];let aiCalls=0;let remote={_syncRevision:1,profile:{name:'Cloud An',gender:'Nam',dob:'1990-01-01',hourChi:'Tí',place:'Hà Nội'},aiCache:{version:2,profiles:{},legacy:{}}};
async function setup(owner='a'){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const log=[];
 await context.route('**/api/**',async route=>{
  const r=route.request(),url=new URL(r.url());let data={};let status=200;
  if(url.pathname==='/api/me')data={user:owner?{id:owner,display_name:owner}:null,points:owner==='a'?100:0};
  else if(url.pathname==='/api/module-access')data={access:{}};
  else if(url.pathname==='/api/site-config')data={revision:1,config:{content:{},billing:{enabled:true,packages:[{id:'p',amountVnd:50000,points:50}],services:[{id:'compat--pair',module:'compat',name:'Tương hợp',status:'paid',points:10}]}}};
  else if(url.pathname==='/api/user-data'){
   log.push(r.method());if(r.method()==='GET')data=owner==='a'?remote:{_syncRevision:0};
   else if(r.method()==='PUT'){const b=r.postDataJSON();if(owner==='a'){if(b.expectedRevision!==remote._syncRevision){status=409;}else {remote={...b.payload,_syncRevision:remote._syncRevision+1};data={revision:remote._syncRevision};}}else data={revision:1};}
  }else if(url.pathname==='/api/ai/session')data={token:'qa-only',userId:owner};
  else if(url.pathname==='/api/ai'){aiCalls++;assert.equal(r.postDataJSON().expectedPoints,10);data={choices:[{finish_reason:'stop',message:{content:JSON.stringify({percent:80,strengths:['Tôn trọng nhau.'],watchouts:['Lắng nghe.'],advice:'Cùng chia sẻ.'})}}]};}
  else if(url.pathname==='/api/topup/history')data={orders:[]};
  await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));return {context,page,log};
}
try{
 const guest=await setup(null);await guest.page.goto(base+'/banggia');await guest.page.getByRole('cell',{name:'10 Point',exact:true}).waitFor();await guest.page.getByText('50.000đ',{exact:true}).waitFor();assert.equal(await guest.page.locator('dialog[open]').count(),0);await guest.page.screenshot({path:path.join(artifacts,'public-prices-mobile.png'),fullPage:true});await guest.context.close();
 const a=await setup();await a.page.goto(base+'/hoso');await a.page.getByRole('heading',{name:'Cloud An',exact:true}).waitFor();await a.page.getByText('Đã đồng bộ với tài khoản',{exact:true}).waitFor();assert.equal(a.log[0],'GET');
 await a.page.goto(base+'/tuonghop');await a.page.getByRole('textbox',{name:'Tên người ấy'}).fill('Bình');await a.page.getByRole('combobox',{name:'Giới tính',exact:true}).selectOption('Nam');await a.page.getByLabel('Ngày sinh',{exact:true}).fill('1991-02-02');await a.page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).click();await a.page.getByRole('dialog',{name:'Xác nhận lượt luận giải'}).waitFor();assert.equal(aiCalls,0);await a.page.getByRole('button',{name:'Để sau',exact:true}).click();await a.page.getByRole('alert').filter({hasText:'Chưa trừ Point'}).waitFor();assert.equal(aiCalls,0);
 await a.page.getByRole('button',{name:'Khám phá sự kết nối',exact:true}).click();await a.page.getByRole('button',{name:'Đồng ý · 10 Point'}).click();await a.page.getByRole('heading',{name:'Câu chuyện của hai bạn'}).waitFor();assert.equal(aiCalls,1);await a.page.waitForTimeout(1300);assert.ok(Object.keys(remote.aiCache.profiles).length);await a.context.close();
 const second=await setup();await second.page.goto(base+'/hoso');await second.page.getByRole('heading',{name:'Cloud An',exact:true}).waitFor();await second.page.getByText('Đã đồng bộ với tài khoản',{exact:true}).waitFor();const local=await second.page.evaluate(()=>JSON.parse(localStorage.getItem('astrox_v2_state:account:zalo:a')));assert.ok(JSON.stringify(local.aiCache).includes('Tôn trọng nhau.'));for(const route of ['/battu','/thansohoc','/cunghoangdao','/tuvi','/kinhdich']){await second.page.goto(base+route);await second.page.locator('main').first().waitFor();await second.page.waitForTimeout(500);assert.ok(await second.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}await second.context.close();
 const b=await setup('b');await b.page.goto(base+'/hoso');await b.page.getByText('Đã đồng bộ với tài khoản',{exact:true}).waitFor();assert.ok(!(await b.page.locator('body').innerText()).includes('Cloud An'));await b.context.close();
 const cancel=await setup();await cancel.page.goto(base+'/hoso?cancel=true&status=CANCELLED');await cancel.page.getByText('Bạn đã hủy thanh toán. Chưa ghi nhận nạp Point.',{exact:true}).waitFor();await cancel.context.close();assert.deepEqual(errors,[]);
 console.log('PASS public guest prices, new-device cloud restore including saved AI, account isolation, paid consent cancel/accept, cancellation notice, no browser errors. APIs mocked; no real purchase.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
