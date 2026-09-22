import { chromium } from "playwright";
const BASE = "http://localhost:3311";
const OUT = new URL("../qa-report/viewport30-2209/", import.meta.url);
const VPS = [[320,568],[360,640],[360,780],[360,800],[375,667],[375,812],[384,832],[385,854],[390,844],[393,852],[393,873],[412,915],[414,736],[414,896],[430,932],[600,960],[768,1024],[800,1280],[810,1080],[820,1180],[834,1194],[1024,1366],[1280,720],[1280,800],[1366,768],[1440,900],[1536,864],[1600,900],[1920,1080],[2560,1440]];
const ROUTES = ["/","/trangchu","/tuvi","/cunghoangdao","/kinhdich","/battu","/thansohoc","/tarot","/tuonghop","/hoso"];
const browser = await chromium.launch();
let n = 0;
// home full 30 + routes bien (320x568, 390x844, 768x1024, 1024x1366, 1440x900, 2560x1440)
const EDGE = [[320,568],[390,844],[768,1024],[1024,1366],[1440,900],[2560,1440]];
const jobs = [];
for (const [w,h] of VPS) jobs.push([w,h,"/",false]);
for (const r of ROUTES.slice(1)) for (const [w,h] of EDGE) jobs.push([w,h,r,false]);
for (let i=0;i<jobs.length;i+=3){
  await Promise.all(jobs.slice(i,i+3).map(async ([w,h,r])=>{
    const ctx = await browser.newContext({viewport:{width:w,height:h}});
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
