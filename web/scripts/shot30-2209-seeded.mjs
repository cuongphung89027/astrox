import { chromium } from "playwright";
const BASE = "http://localhost:3311";
const OUT = new URL("../qa-report/viewport30-2209-seeded/", import.meta.url);
const VPS = [[320,568],[360,640],[360,780],[360,800],[375,667],[375,812],[384,832],[385,854],[390,844],[393,852],[393,873],[412,915],[414,736],[414,896],[430,932],[600,960],[768,1024],[800,1280],[810,1080],[820,1180],[834,1194],[1024,1366],[1280,720],[1280,800],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440]];
const ROUTES = ["/","/trangchu","/tuvi","/cunghoangdao","/kinhdich","/battu","/thansohoc","/tarot","/tuonghop","/hoso"];
const EDGE = [[320,568],[390,844],[768,1024],[1024,1366],[1440,900],[2560,1440]];
const SEED = `localStorage.setItem('astrox_v2_state', JSON.stringify({ onboarded: true, profile: { name: 'QA', fullName: 'QA Seeded', gender: 'Nam', dob: '1991-06-15', hourChi: 'Ngọ (11h-13h)', place: 'Hà Nội' } }));`;
const browser = await chromium.launch();
let n = 0;
const jobs = [];
for (const [w,h] of VPS) jobs.push([w,h,"/"]);
for (const r of ROUTES.slice(1)) for (const [w,h] of EDGE) jobs.push([w,h,r]);
for (let i=0;i<jobs.length;i+=3){
  await Promise.all(jobs.slice(i,i+3).map(async ([w,h,r])=>{
    const ctx = await browser.newContext({viewport:{width:w,height:h}});
    await ctx.addInitScript(SEED);
    const p = await ctx.newPage();
    const slug = r==="/"?"home":r.slice(1);
    try {
      await p.goto(BASE+r,{waitUntil:"domcontentloaded",timeout:25000});
      await p.waitForTimeout(2500);
      const {mkdirSync} = await import("node:fs");
      const {join} = await import("node:path");
      const {fileURLToPath} = await import("node:url");
      const dir = fileURLToPath(OUT); mkdirSync(dir,{recursive:true});
      await p.screenshot({path: join(dir,`${w}x${h}-${slug}.png`)});
      n++; process.stdout.write(`ok ${w}x${h} ${r} (${n}/${jobs.length})\n`);
    } catch(e){ process.stdout.write(`FAIL ${w}x${h} ${r}: ${String(e).slice(0,100)}\n`); }
    await ctx.close();
  }));
}
await browser.close();
console.log("DONE",n,"/",jobs.length);
