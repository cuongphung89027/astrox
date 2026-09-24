"use client";
import Link from "next/link";
import type { RewardsSummary } from "@/lib/api";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { PointCoin } from "./PointCoin";
import styles from "./EarnPointsView.module.css";

type Props = {summary: RewardsSummary|null; preview: boolean; failed?: boolean; checkingIn: boolean; adBusy: boolean; copied: boolean; referralLink: string; onCheckin:()=>void; onCopy:()=>void; onAd:()=>void};
export function EarnPointsView({summary:s,preview,failed=false,checkingIn,adBusy,copied,referralLink,onCheckin,onCopy,onAd}:Props){
 const a=s?.attendance, r=s?.referral, ad=s?.ads;
 const streak=a?.streak??0, milestones=a?.milestones??[], target=milestones.find(m=>!a?.claimed.includes(m.day)&&m.day>streak)?.day??Math.max(7,streak);
 const open=Boolean(s?.enabled&&a?.enabled), today=Boolean(a?.today);
 const adsOpen=Boolean(s?.enabled&&ad?.enabled), referralOpen=Boolean(s?.enabled&&r?.enabled);
 const loading=!s&&!preview&&!failed;
 return <div className={styles.page}>
  {preview&&<small>Chế độ xem thử · không ghi nhận phần thưởng</small>}
  <section className={styles.daily} aria-labelledby="daily-title">
   <div className={styles.dailyTop}><span className={styles.eyebrow}><FeatureIcon name="calendar" size={16}/> MỖI NGÀY MỘT CHÚT</span><span className={styles.status}>{today?'Đã nhận hôm nay':open?'Sẵn sàng nhận':loading?'Đang tải…':failed?'Chưa tải được':'Tạm đóng'}</span></div>
   <div className={styles.dailyMain}><div><h3 id="daily-title">Ghé AstroX.<br/>Nhận thêm Point.</h3><p className={styles.reward}><PointCoin size={24}/><strong>{a?`+${a.daily}`:'—'}</strong><span>Point / ngày</span></p></div><div className={styles.orbit} aria-label={`Chuỗi ${streak} ngày`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="53"/><circle cx="60" cy="60" r="53" pathLength="100" strokeDasharray={`${Math.min(100,streak/target*100)} 100`}/></svg><div><strong>{streak}</strong><span>ngày liên tiếp</span></div><i aria-hidden="true">✦</i></div></div>
   <div className={styles.dailyBottom}><span>{today?'Hẹn bạn ngày mai.':target>streak?`Thêm ${target-streak} ngày đến mốc tiếp theo`:'Bắt đầu một thói quen nhỏ.'}</span><button onClick={onCheckin} disabled={!open||today||checkingIn}>{checkingIn?'Đang nhận…':today?'Đã điểm danh ✓':'Điểm danh ngay'}<span aria-hidden="true">↗</span></button></div>
  </section>
  {milestones.length>0&&<section className={styles.journey} aria-label="Mốc thưởng điểm danh"><header><h3>Hành trình của bạn</h3><span>{a?.claimed.length??0}/{milestones.length} mốc</span></header><div className={styles.milestones}>{milestones.map((m,i)=>{const done=a?.claimed.includes(m.day);return <article key={m.day} data-done={done} style={{animationDelay:`${i*70}ms`}}><span className={styles.marker}>{done?'✓':'✦'}</span><small>Ngày {m.day}</small><strong>+{m.points}<span> Point</span></strong><p>{done?'Đã nhận':`Còn ${Math.max(0,m.day-streak)} ngày`}</p></article>;})}</div></section>}
  <div className={styles.grid}>
   <section className={styles.card}><div className={styles.cardTop}><span className={styles.icon}><FeatureIcon name="invite" size={24}/></span><span className={styles.badge}>{referralOpen?'Cùng nhau nhận thưởng':loading?'Đang tải…':failed?'Chưa tải được':'Tạm đóng'}</span></div><h3>Rủ bạn, thêm vui.</h3><p className={styles.rate}><strong>{r?`+${r.registrationInviter}`:'—'}</strong> Point / bạn mới</p><div className={styles.stats}><div><strong>{r?.invited??'—'}</strong><span>Bạn đã mời</span></div><div><strong>{r?.earned.toLocaleString('vi-VN')??'—'}</strong><span>Point đã nhận</span></div></div><button className={styles.action} onClick={onCopy} disabled={!referralOpen||!referralLink}>{copied?'Đã sao chép ✓':'Sao chép link mời'}<span aria-hidden="true">↗</span></button><details><summary>Cách nhận thưởng</summary><p>Bạn bè đăng ký Zalo lần đầu qua link của bạn. Người mới nhận +{r?.registrationUser??0} Point.</p>{r?.firstTopupEnabled&&<p>Thêm +{r.firstTopupInviter} Point khi bạn bè nạp lần đầu{r.firstTopupMinVnd?` từ ${r.firstTopupMinVnd.toLocaleString('vi-VN')}đ`:''}.</p>}{milestones.filter(m=>(m.inviterPoints??0)>0).map(m=><p key={m.day}>Bạn bè điểm danh mốc {m.day} ngày: +{m.inviterPoints} Point.</p>)}</details></section>
   <section className={styles.card}><div className={styles.cardTop}><span className={styles.icon}><FeatureIcon name="play" size={24}/></span><span className={styles.badge}>{adsOpen?'Đang mở':loading?'Đang tải…':failed?'Chưa tải được':'Sắp mở'}</span></div><h3>Một phút khám phá.</h3><p className={styles.rate}><strong>{ad?`+${ad.points}`:'—'}</strong> Point / quảng cáo</p><div className={styles.adProgress}><div><strong>{ad?.used??0}<small> / {ad?.dailyLimit??0}</small></strong><span>Lượt hôm nay</span></div><progress aria-label="Lượt quảng cáo đã nhận hôm nay" max={Math.max(1,ad?.dailyLimit??1)} value={ad?.used??0}/></div><button className={styles.action} onClick={onAd} disabled={!adsOpen||adBusy||(ad?.used??0)>=(ad?.dailyLimit??0)}>{adBusy?'Đang mở…':!adsOpen?'Chưa có quảng cáo':(ad?.used??0)>=(ad?.dailyLimit??0)?'Đã đủ lượt hôm nay':'Xem & nhận Point'}<span aria-hidden="true">▷</span></button><details><summary>Điều kiện nhận Point</summary><p>Point được cộng khi mạng quảng cáo xác nhận đủ điều kiện. Đóng sớm sẽ không nhận thưởng. Chờ {ad?.cooldownSeconds??0} giây giữa hai lượt.</p></details></section>
  </div>
  <footer className={styles.footer}><details><summary>Quy tắc điểm danh</summary><p>Tính theo giờ Việt Nam. Bỏ một ngày thì chuỗi tính lại; mỗi mốc thưởng chỉ nhận một lần cho mỗi tài khoản.</p></details><Link href="/hoso?section=points">Xem lịch sử Point ↗</Link></footer>
 </div>;
}
