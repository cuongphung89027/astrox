import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const out = '/tmp/astrox-ads-qa';
await mkdir(out, { recursive: true });
let passed = 0;
try {
 for (const width of [390, 1440]) {
  for (const path of ['/', '/en', '/licham', '/en/lunar-calendar']) {
   const page = await browser.newPage({ viewport: { width, height: 900 } });
   await page.route('**/pagead2.googlesyndication.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `window.adsbygoogle={push(){window.adRequests=(window.adRequests||0)+1;const n=document.querySelector('ins.adsbygoogle');n.dataset.adStatus='filled';n.style.background='#efe9dc';n.textContent='Ad creative · QA only';}};` }));
   await page.goto('http://localhost:3338'+path);
   await page.waitForLoadState('networkidle');
   const ad = page.locator('[data-ad-placement]');
   await ad.scrollIntoViewIfNeeded();
   await page.waitForFunction(() => window.adRequests === 1);
   assert.equal(await ad.count(), 1);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), true);
   const box = await ad.boundingBox(); assert.ok(box.width <= width);
   await ad.screenshot({ path: `${out}/${width}-${path.replaceAll('/','_')||'home'}.png` });
   if (path === '/') await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
   passed++; await page.close();
  }
 }
 for (const mode of ['unfilled', 'blocked']) {
  const page = await browser.newPage();
  await page.route('**/pagead2.googlesyndication.com/**', r => mode==='blocked' ? r.abort() : r.fulfill({contentType:'application/javascript',body:"window.adsbygoogle={push(){document.querySelector('ins.adsbygoogle').dataset.adStatus='unfilled';}}"}));
  await page.goto('http://localhost:3338/'); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForFunction(() => !document.querySelector('[data-ad-placement]'));
  if (mode === 'blocked') {
   const note = page.locator('[data-ad-support]');
   await note.waitFor({timeout:3000});
   await note.getByRole('button').click();
   assert.equal(await note.count(), 0);
   await page.reload(); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
   await page.waitForTimeout(1200);
   assert.equal(await note.count(), 0);
  } else assert.equal(await page.locator('[data-ad-support]').count(), 0);
  passed++;await page.close();
 }
 for (const path of ['/tarot', '/en/profile', '/admin']) {
  const page=await browser.newPage();let requests=0;
  await page.route('**/pagead2.googlesyndication.com/**', r=>{requests++;return r.abort();});
  await page.goto('http://localhost:3338'+path);await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('[data-ad-placement]').count(),0);assert.equal(requests,0);passed++;await page.close();
 }
 console.log(JSON.stringify({passed,screenshots:out}));
} finally {await browser.close();}
