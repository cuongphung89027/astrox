const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const astronomy = require('astronomy-engine');
const fixture = require('./fixtures/natal-reference.json');
const mod = {};
new Function('exports', ts.transpile(fs.readFileSync('src/lib/natal-houses.ts','utf8'), {module:ts.ModuleKind.CommonJS}))(mod);
const diff = (a,b) => Math.abs(((a-b+540)%360)-180);
const bodies=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
for(const c of fixture.cases) {
 const date = new Date(`${c.date}T00:00:00Z`); date.setTime(date.getTime()+c.hour*3600000);
 const cusps=mod.placidusCusps(astronomy.SiderealTime(date)*15+c.lon,c.lat,astronomy.e_tilt(astronomy.MakeTime(date)).tobl);
 cusps.forEach((v,i)=>assert(diff(v,c.cusps[i])<0.002,`House ${i+1} ${c.date}: ${v} vs ${c.cusps[i]}`));
 bodies.forEach((body,i)=>assert(diff(astronomy.Ecliptic(astronomy.GeoVector(astronomy.Body[body],date,true)).elon,c.planets[i])<0.01,`${body} ${c.date}`));
}
require.extensions['.ts']=(m,file)=>m._compile(ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),file);
const {buildNatalChart,houseOf}=require('../src/lib/zodiac.ts');
const chart=buildNatalChart({dob:'2003-05-05',hourChi:'Hợi (21:00–22:59)',birthTime:'21:35',place:'Sơn La'});
assert.equal(chart.date,'2003-05-05T14:35:00.000Z');
assert(diff(chart.points.ascendant.longitude,266.320153)<0.002);
assert.equal(buildNatalChart({dob:'2003-05-05',hourChi:'Hợi',place:'Unknown'}),null);
chart.houses.forEach(h=>assert.equal(houseOf(h.longitude,chart.houses),h.number));
assert.equal(chart.big3.sun.house,5);
console.log('4 independent Swiss fixtures: 48 cusps <0.002°, 40 planet positions <0.01°. Exact time, unknown place and house boundaries passed.');
