/** Server-only calculations. Call with verified backend facts inside the wallet
 * transaction. These functions do not authenticate users or persist rewards. */
export type RewardConfig = {
  registrationUser: number;
  registrationInviter: number;
  firstTopupInviter: number;
  daily: number;
  milestones: ReadonlyArray<{ day: number; user: number; inviter: number }>;
};
export const DEFAULT_REWARDS: RewardConfig = Object.freeze({
  registrationUser: 5, registrationInviter: 5, firstTopupInviter: 10, daily: 2,
  milestones: Object.freeze([
    Object.freeze({day:3,user:3,inviter:2}),
    Object.freeze({day:7,user:5,inviter:3}),
    Object.freeze({day:10,user:10,inviter:5}),
  ]),
});
export function validateConfig(c: RewardConfig): void {
  const amounts = [c.registrationUser,c.registrationInviter,c.firstTopupInviter,c.daily];
  const days = new Set<number>();
  for (const m of c.milestones) {
    if (!Number.isSafeInteger(m.day) || m.day < 1 || days.has(m.day)) throw new Error('Invalid milestone day');
    days.add(m.day); amounts.push(m.user,m.inviter);
  }
  if (amounts.some(n=>!Number.isSafeInteger(n)||n<0) || !Number.isSafeInteger(amounts.reduce((a,b)=>a+b,0))) throw new Error('Invalid reward amount');
}
export type Reward = { userId: string; points: number; key: string };
type Referral = { userId: string; inviterId: string | null };
const validReferral = (r: Referral) => Boolean(r.userId && r.inviterId && r.userId !== r.inviterId);
// Keys exclude campaign version so republishing rules cannot reward an event twice.
export function registrationRewards(r: Referral & {verified:boolean;isNew:boolean}, c=DEFAULT_REWARDS): Reward[] {
  validateConfig(c);
  if (!r.verified || !r.isNew || !validReferral(r)) return [];
  return [
    {userId:r.userId,points:c.registrationUser,key:`referral:${r.userId}:signup:user`},
    {userId:r.inviterId!,points:c.registrationInviter,key:`referral:${r.userId}:signup:inviter`},
  ];
}
export function firstTopupReward(r: Referral & {settled:boolean;paidAmount:number;alreadyRewarded:boolean},c=DEFAULT_REWARDS): Reward[] {
  validateConfig(c);
  if (!validReferral(r)||!r.settled||!Number.isSafeInteger(r.paidAmount)||r.paidAmount<=0||r.alreadyRewarded) return [];
  return [{userId:r.inviterId!,points:c.firstTopupInviter,key:`referral:${r.userId}:first-paid-topup`}];
}
export type Attendance = {lastDay:string|null;streak:number;claimedMilestones:readonly number[]};
const DAY=86_400_000;
export function vietnamDay(now:Date):string {
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid server time');
  return new Date(now.getTime()+7*3_600_000).toISOString().slice(0,10);
}
/** Caller locks attendance row and writes state + both beneficiary ledger entries
 * atomically. Inviter reward is omitted when no eligible referral exists. */
export function checkIn(previous:Attendance,now:Date,c=DEFAULT_REWARDS) {
  validateConfig(c);
  const day=vietnamDay(now);
  if (!Number.isSafeInteger(previous.streak)||previous.streak<0) throw new Error('Invalid streak');
  let gap:number|null=null;
  if (previous.lastDay!==null) {
    const timestamp=Date.parse(`${previous.lastDay}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(previous.lastDay)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==previous.lastDay) throw new Error('Invalid attendance date');
    gap=(Date.parse(`${day}T00:00:00Z`)-timestamp)/DAY;
    if(gap<0) throw new Error('Backdated attendance');
  }
  if(gap===0) return {day,points:0,inviterPoints:0,milestones:[] as number[],duplicate:true,state:previous};
  const streak=gap===1?previous.streak+1:1;
  const claimed=new Set(previous.claimedMilestones);
  const earned=c.milestones.filter(m=>m.day===streak&&!claimed.has(m.day));
  for(const m of earned) claimed.add(m.day);
  return {
    day,points:c.daily+earned.reduce((n,m)=>n+m.user,0),
    inviterPoints:earned.reduce((n,m)=>n+m.inviter,0),milestones:earned.map(m=>m.day),duplicate:false,
    state:{lastDay:day,streak,claimedMilestones:[...claimed].sort((a,b)=>a-b)},
  };
}
