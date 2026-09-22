import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const css=readFileSync('src/components/tuvi/PeriodPanel.module.css','utf8');
const whisper=readFileSync('src/components/kit/LoadingWhisper.module.css','utf8');
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:320,height:500}});
 await page.setContent(`<style>${whisper}\n${css}</style><div class="progress"><ol><li data-state="active"><span class="stepIndicator" aria-hidden="true"></span><span class="whisper" data-loading-whisper="period"><span class="phrase">AstroX đang kết nối các mốc thời gian…</span></span><strong>12s</strong></li></ol></div>`);
 const caption=await page.locator('[data-loading-whisper]').evaluate(el=>({width:el.getBoundingClientRect().width,animation:getComputedStyle(el).animationName}));
 assert.equal(caption.animation,'none','The caption must not inherit the spinner animation');
 assert.ok(caption.width>100,'Caption must have readable width, not spinner dimensions');
 assert.equal(await page.locator('.stepIndicator').evaluate(el=>getComputedStyle(el).animationName),'spin');
 await page.locator('.phrase').evaluate(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=1000;}));
 await page.screenshot({path:'/tmp/astrox-loading-progress-fixed.png'});
 console.log('PASS: only indicator spins; loading caption remains readable at 320px');
}finally{await browser.close();}
