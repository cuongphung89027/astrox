"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { openLoginDialog } from "@/lib/login-dialog";
import { useProfile } from "@/lib/use-store";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { buildBatuChart, BATU_WX_LABEL, type WxKey } from "@/lib/batu";
import { FourPillars } from "./FourPillars";
import { WuxingBar } from "./WuxingBar";
import { DayunTimeline } from "./DayunTimeline";
import { BatuTopics } from "./BatuTopics";
import styles from "./Batu.module.css";
const ORDER = ["year","month","day","time"] as const;
const TABS = ["Mệnh bàn","Luận giải","Đại vận"];
export function BatuClient() {
 const {isModuleAllowed}=useAuth();
 const profile=useProfile();const {open}=useProfileModal();
 const [tab,setTab]=useState(0);
 const [activeElement,setActiveElement]=useState<WxKey|null>(null);
 const calculated=useMemo(()=>{if(!profile)return {chart:null,error:""};try{return {chart:buildBatuChart(profile),error:""};}catch(e){return {chart:null,error:e instanceof Error?e.message:"Không lập được mệnh bàn."};}},[profile]);
 const {chart,error}=calculated;
 if(!isModuleAllowed("batu"))return <section className={styles.page}><div className={styles.welcome}><FeatureIcon name="battu" size={40}/><h2>Mở Bát Tự của bạn</h2><button className={styles.primary} onClick={openLoginDialog}>Đăng nhập ↗</button></div></section>;
 return <section className={styles.page}>
  <h1 className="sr-only">Bát Tự</h1>
      <Link href="/tuonghop?mode=batu" style={{display:"inline-flex",alignItems:"center",minHeight:44,padding:"8px 16px",textDecoration:"underline",textUnderlineOffset:4}}>Xem cặp đôi ↗</Link>
  {!chart ? <div className={styles.welcome}>
    <div className={styles.emptyPillars} aria-hidden="true">{["年","月","日","時"].map((s,i)=><span key={s} style={{animationDelay:`${i*100}ms`}}>{s}</span>)}</div>
    <span className={styles.eyebrow}>TỨ TRỤ MỆNH LÝ</span><h2>Tứ trụ.<br/>Một dấu ấn riêng.</h2><p>Mở mệnh bàn từ ngày giờ sinh của bạn.</p>
    {error&&<p role="alert">{error}</p>}<button className={styles.primary} onClick={()=>open()}>{profile?"Chỉnh sửa hồ sơ":"Bổ sung hồ sơ"}<span>↗</span></button>
  </div> : <>
    <header className={styles.profile}><div><span>MỆNH BÀN CỦA</span><h2>{profile?.name}</h2></div><button onClick={()=>open()} aria-label="Chỉnh sửa hồ sơ Bát Tự"><FeatureIcon name="settings" size={20}/></button></header>
    <div className={styles.tabs} role="tablist" aria-label="Bát Tự">{TABS.map((label,i)=><button key={label} role="tab" id={`batu-tab-${i}`} aria-controls={`batu-panel-${i}`} aria-selected={tab===i} onClick={()=>setTab(i)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:2))%3;setTab(next);document.getElementById(`batu-tab-${next}`)?.focus();}}} tabIndex={tab===i?0:-1}>{label}</button>)}</div>
    <div hidden={tab!==0} role="tabpanel" id="batu-panel-0" aria-labelledby="batu-tab-0" className={styles.panel}>
      <div className={styles.masthead}><div><span className={styles.eyebrow}>NHẬT CHỦ</span><h2>{chart.pillars.day.viGan} {chart.pillars.day.wxKeyGan&&BATU_WX_LABEL[chart.pillars.day.wxKeyGan]}</h2><p>{profile?.dob.split('-').reverse().join('/')} · {profile?.hourChi.split(' (')[0]}</p></div><span className={styles.daySeal} lang="zh-Hant">{chart.pillars.day.hanGan}</span></div>
      <FourPillars chart={chart} active={activeElement} onSelect={setActiveElement}/>
      <div className={styles.insights}><section className={styles.elementCard}><header><h3>Ngũ hành</h3><span>8 chữ trong mệnh bàn</span></header><WuxingBar wuxing={chart.wuxing} active={activeElement} onSelect={setActiveElement}/></section><section className={styles.relationCard}><span className={styles.eyebrow}>GIỮA CÁC TRỤ</span><h3>Những mối liên hệ</h3><ul>{chart.relations.map((r,i)=><li key={i}><span aria-hidden="true">↗</span>{r.text}</li>)}</ul></section></div>
      <details className={styles.details}><summary>Chi tiết mệnh bàn</summary><p>{chart.lunarText}</p><div className={styles.tenGods}>{ORDER.map(key=><div key={key}><h4>{chart.pillars[key].label}</h4><p>{chart.pillars[key].shishenGan}</p><small>{chart.pillars[key].shishenZhi.join(' · ')}</small></div>)}</div></details>
    </div>
    <div hidden={tab!==1} role="tabpanel" id="batu-panel-1" aria-labelledby="batu-tab-1" className={styles.panel}><BatuTopics chart={chart}/></div>
    <div hidden={tab!==2} role="tabpanel" id="batu-panel-2" aria-labelledby="batu-tab-2" className={styles.panel}><header className={styles.periodHeading}><span className={styles.eyebrow}>NHỊP MƯỜI NĂM</span><h2>Đi qua những đại vận</h2></header><DayunTimeline dayun={chart.dayun}/></div>
  </>}
 </section>;
}
