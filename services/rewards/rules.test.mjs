import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_REWARDS, checkIn, registrationRewards, firstTopupReward, validateConfig} from './rules.ts';
const at = day => new Date(`2026-09-${day}T03:00:00Z`);
const fresh = {lastDay:null,streak:0,claimedMilestones:[]};
test('registration awards both parties; rejects unverified, existing and self referrals',()=>{
 const args={userId:'new',inviterId:'old',verified:true,isNew:true};
 assert.deepEqual(registrationRewards(args).map(x=>x.points),[5,5]);
 for(const bad of [{verified:false},{isNew:false},{inviterId:'new'}]) assert.deepEqual(registrationRewards({...args,...bad}),[]);
});
test('first paid settlement awards inviter only, once',()=>{
 const args={userId:'new',inviterId:'old',settled:true,paidAmount:10000,alreadyRewarded:false};
 assert.equal(firstTopupReward(args)[0].points,10);
 for(const bad of [{settled:false},{paidAmount:0},{alreadyRewarded:true},{inviterId:'new'}])assert.deepEqual(firstTopupReward({...args,...bad}),[]);
});
test('daily duplicate is no-op; Vietnam midnight advances day',()=>{
 const a=checkIn(fresh,new Date('2026-09-21T16:59:59Z'));
 assert.equal(a.points,2);assert.equal(a.state.lastDay,'2026-09-21');
 assert.equal(checkIn(a.state,new Date('2026-09-21T16:59:59Z')).points,0);
 assert.equal(checkIn(a.state,new Date('2026-09-21T17:00:00Z')).state.streak,2);
});
test('10 consecutive days yield 38 check-in points and 10 inviter points',()=>{
 let s=fresh,total=0,inviter=0;
 for(let d=1;d<=10;d++){const r=checkIn(s,at(String(d).padStart(2,'0')));s=r.state;total+=r.points;inviter+=r.inviterPoints;}
 assert.equal(total,38);assert.equal(inviter,10);assert.deepEqual(s.claimedMilestones,[3,7,10]);
 const next=checkIn(s,at('11'));assert.equal(next.points,2);assert.equal(next.inviterPoints,0);
});
test('missed day resets streak but does not reset lifetime milestone rewards',()=>{
 const r=checkIn({lastDay:'2026-09-01',streak:10,claimedMilestones:[3,7,10]},at('03'));
 assert.equal(r.state.streak,1);
 const next=checkIn({...r.state,lastDay:'2026-09-04',streak:2},at('05'));
 assert.equal(next.points,2);assert.equal(next.inviterPoints,0);
});
test('backdated event cannot move attendance backwards',()=>{
 assert.throws(()=>checkIn({lastDay:'2026-09-22',streak:3,claimedMilestones:[3]},at('21')));
});
test('admin config rejects invalid, duplicate or unbounded point values',()=>{
 assert.doesNotThrow(()=>validateConfig(DEFAULT_REWARDS));
 assert.throws(()=>validateConfig({...DEFAULT_REWARDS,daily:-1}));
 assert.throws(()=>validateConfig({...DEFAULT_REWARDS,daily:1.5}));
 assert.throws(()=>validateConfig({...DEFAULT_REWARDS,daily:NaN}));
 assert.throws(()=>validateConfig({...DEFAULT_REWARDS,milestones:[{day:3,user:3,inviter:2},{day:3,user:5,inviter:3}]}));
});
