"use client";
import {useMemo,useState} from "react";
import {useProfile} from "@/lib/use-store";
import {useAuth} from "@/lib/auth";
import {openLoginDialog} from "@/lib/login-dialog";
import {useProfileModal} from "@/components/profile/ProfileModal";
import {FeatureIcon} from "@/components/kit/FeatureIcon";
import {ReadingQuestion} from "@/components/kit/ReadingQuestion";
import {buildNumerologyChart,coreMetrics,extraMetrics,personalMetrics,NUMEROLOGY_TOPICS} from "@/lib/numerology";
import {CipherBoard} from "./CipherBoard";
import {TopicPanel} from "./TopicPanel";
import {BirthGrid,NumberCycles} from "./NumberDiagrams";
import styles from "./Numerology.module.css";
const TABS=['Của bạn','Biểu đồ','Chu kỳ','Luận giải'];
export function NumerologyClient(){
 const profile=useProfile();const {open}=useProfileModal();const {isModuleAllowed}=useAuth();
 const [tab,setTab]=useState(0),[topicId,setTopicId]=useState<string|null>(null);
 const calculated=useMemo(()=>{if(!profile)return {chart:null,error:''};try{return {chart:buildNumerologyChart({fullName:profile.fullName?.trim()||profile.name,dob:profile.dob}),error:''};}catch(e){return {chart:null,error:e instanceof Error?e.message:'Không tính được chỉ số.'};}},[profile]);
 const {chart,error}=calculated;const topic=NUMEROLOGY_TOPICS.find(t=>t.id===topicId);
 const choose=(id:string)=>{setTopicId(id);setTab(3);};
 if(!isModuleAllowed('numerology'))return <section className={styles.page}><div className={styles.welcome}><FeatureIcon name="numerology" size={40}/><h2>Mở Thần Số Học của bạn</h2><button className={styles.primary} onClick={openLoginDialog}>Đăng nhập ↗</button></div></section>;
 return <section className={styles.page}><h1 className="sr-only">Thần Số Học</h1>{!chart?<div className={styles.welcome}><div className={styles.emptyOrbit} aria-hidden="true"><FeatureIcon name="numerology" size={80}/><i/><b/></div><span className={styles.eyebrow}>DẤU ẤN NHỮNG CON SỐ</span><h2>Mỗi con số.<br/>Một phần của bạn.</h2><p>Khám phá từ họ tên đầy đủ và ngày sinh.</p>{error&&<p role="alert">{error}</p>}<button className={styles.primary} onClick={()=>open()}>{profile?'Chỉnh sửa hồ sơ':'Bổ sung hồ sơ'}<span>↗</span></button></div>:<>
  <header className={styles.profile}><div><span className={styles.eyebrow}>DẤU ẤN CỦA</span><h2>{profile?.name}</h2></div><button onClick={()=>open()} aria-label="Chỉnh sửa hồ sơ Thần Số Học"><FeatureIcon name="settings" size={20}/></button></header>
  <nav className={styles.tabs} role="tablist" aria-label="Thần Số Học">{TABS.map((label,i)=><button key={label} id={`num-tab-${i}`} role="tab" aria-selected={tab===i} aria-controls={`num-panel-${i}`} tabIndex={tab===i?0:-1} onClick={()=>setTab(i)} onKeyDown={e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:3))%4;setTab(next);document.getElementById(`num-tab-${next}`)?.focus();}}}>{label}</button>)}</nav>
  <div className={styles.panel} hidden={tab!==0} role="tabpanel" id="num-panel-0" aria-labelledby="num-tab-0">
   <button className={styles.lifePath} onClick={()=>choose('life-path')} aria-label={`Số chủ đạo ${chart.lifePath}, xem luận giải`}><div className={styles.lifeCopy}><span>SỐ CHỦ ĐẠO</span><h2>Nhịp riêng<br/>của bạn.</h2><small>Khám phá đường đời <span aria-hidden="true">↗</span></small></div><div className={styles.numberOrbit}><i/><i/><strong key={chart.lifePath}>{chart.lifePath}</strong><b aria-hidden="true">✦</b></div></button>
   <div className={styles.core}>{coreMetrics(chart).slice(1).map((m,i)=><button key={m.key} onClick={()=>choose(i===0?'destiny':'inner-self')}><span>{m.label.replace('Số ','')}</span><strong>{m.value}</strong><small>{i===0?'Tài năng trong tên gọi':i===1?'Điều bạn khao khát':'Cách bạn hiện diện'}</small><i aria-hidden="true">↗</i></button>)}</div>
   <div className={styles.extra}>{extraMetrics(chart).map(m=><div key={m.key}><span>{m.label.replace('Số ','')}</span><strong>{m.value}</strong><p>{m.desc}</p></div>)}</div>
   {!profile?.fullName&&<button className={styles.nameNote} onClick={()=>open()}>Đang tính theo tên “{chart.name}”. Bổ sung họ tên khai sinh ↗</button>}
  </div>
  <div className={styles.panel} hidden={tab!==1} role="tabpanel" id="num-panel-1" aria-labelledby="num-tab-1"><section className={styles.surface}><header className={styles.sectionHeading}><span className={styles.eyebrow}>TỪ NGÀY BẠN SINH</span><h2>Chín ô. Một dấu ấn.</h2></header><BirthGrid chart={chart}/></section><section className={styles.nameCard}><header className={styles.sectionHeading}><span className={styles.eyebrow}>TỪ TÊN BẠN MANG</span><h2>{chart.name}</h2></header><CipherBoard name={chart.name} calcSeq={0}/></section><details className={styles.details}><summary>Các chỉ số nợ nghiệp</summary><p>{chart.karmicDebts.length?chart.karmicDebts.map(k=>`${k.label} (${k.raw})`).join(' · '):'Không có số nợ nghiệp theo cách tính hiện tại.'}</p><small>Quy tắc này khác nhau giữa các trường phái.</small></details></div>
  <div className={styles.panel} hidden={tab!==2} role="tabpanel" id="num-panel-2" aria-labelledby="num-tab-2"><div className={styles.periodHeader}><span className={styles.eyebrow}>{chart.now.day}/{chart.now.month}/{chart.now.year}</span><h2>Nhịp sống của bạn</h2></div><div className={styles.personal}>{personalMetrics(chart).map((m,i)=><article key={m.key}><span>{m.label}</span><strong>{m.value}</strong>{i===0&&<button onClick={()=>choose('personal-year')}>Xem luận giải ↗</button>}</article>)}</div><header className={styles.sectionHeading}><span className={styles.eyebrow}>BỐN CHẶNG ĐƯỜNG</span><h2>Đỉnh cao & thử thách</h2></header><NumberCycles chart={chart}/><button className={styles.textButton} onClick={()=>choose('cycles')}>Đọc hành trình của bạn ↗</button></div>
  <div className={styles.panel} hidden={tab!==3} role="tabpanel" id="num-panel-3" aria-labelledby="num-tab-3">{topic?<><button className={styles.back} onClick={()=>setTopicId(null)}>← Các chủ đề</button><ReadingQuestion label="GÓC NHÌN BẠN CHỌN">{topic.title}</ReadingQuestion><TopicPanel key={`${topic.id}:${chart.name}:${profile?.dob}`} topic={topic} chart={chart} profile={profile}/></>:<><header className={styles.sectionHeading}><span className={styles.eyebrow}>HIỂU MÌNH SÂU HƠN</span><h2>Điều bạn muốn khám phá</h2></header><div className={styles.topics}>{NUMEROLOGY_TOPICS.map((t,i)=><button key={t.id} onClick={()=>choose(t.id)}><span>{String(i+1).padStart(2,'0')}<i>↗</i></span><h3>{t.title}</h3><p>{t.desc}</p></button>)}</div></>}</div>
 </>}</section>;
}
