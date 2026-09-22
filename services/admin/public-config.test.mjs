import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig } from './config.ts';
import { publicState } from './public-state.mjs';
test('unknown config has no impact on existing public routes',()=>{
 assert.deepEqual(publicState(null,'/tuvi'),{blocked:false,notice:null,announcement:''});
});
test('only published maintenance rules block target and notices obey time/module',()=>{
 const c=defaultConfig();c.billing.services[0].status='maintenance';c.content.notices=[{id:'n',title:'News',body:'Hello',module:'tuvi',enabled:true,startsAt:'2026-09-20T00:00:00Z',endsAt:'2026-09-30T00:00:00Z'}];
 assert.equal(publicState(c,'/tuvi',Date.parse('2026-09-22')).blocked,true);assert.equal(publicState(c,'/tarot',Date.parse('2026-09-22')).notice,null);assert.equal(publicState(c,'/tuvi',Date.parse('2026-10-22')).notice,null);
});
