"use client";
import { useEffect, useRef, useState } from 'react';
import { AiText } from '@/components/kit';
import { ReadingLoader } from '@/components/kit/ReadingLoader';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { useProfile } from '@/lib/use-store';
import { useFeatureResult } from '@/lib/use-feature-result';
import { runAiPrompt } from '@/lib/api';
import { usePaidPrice } from '@/lib/use-paid-price';
import { cacheFingerprint, readAiCache, writeAiCache, refreshPromptRevision } from '@/lib/state';
import { buildCoupleReading, coupleCacheKey, couplePrompt, COUPLE_PLACES, type CouplePerson, type CoupleMode } from '@/lib/couples';
import { HOUR_CHI_OPTIONS } from '@/lib/utils';
import styles from './Compat.module.css';
const blank:CouplePerson={name:'',gender:'',dob:'',hourChi:'',place:''};
function PersonEditor({person,onChange,label,id,mode}:{person:CouplePerson;onChange:(p:CouplePerson)=>void;label:string;id:string;mode:CoupleMode}) {
 const update=(field:keyof CouplePerson,value:string)=>onChange({...person,[field]:value});
 return <fieldset className={styles.partnerCard}><legend className="sr-only">{label}</legend><div className={styles.personHeading}><h2>{label}</h2></div>
  <label className={styles.formField}>Tên gọi<input name={`${id}Name`} required maxLength={100} autoComplete="off" value={person.name} onChange={e=>update('name',e.target.value)}/></label>
  <div className={styles.fieldRow}>
   <label className={styles.formField}>Tham số bộ tính<select name={`${id}Gender`} required value={person.gender} onChange={e=>update('gender',e.target.value)}><option value="">Chọn tham số</option><option>Nam</option><option>Nữ</option></select></label>
   <label className={styles.formField}>Ngày sinh dương lịch<input name={`${id}Dob`} type="date" min="1900-01-01" max="2100-12-31" required value={person.dob} onChange={e=>update('dob',e.target.value)}/></label>
  </div>
  <div className={`${styles.fieldRow} ${styles.birthRow}`}>
   <label className={styles.formField}>Giờ sinh<select name={`${id}Hour`} required value={person.hourChi} onChange={e=>update('hourChi',e.target.value)}><option value="">Chọn giờ sinh</option><option value="unknown">Không biết giờ sinh</option>{HOUR_CHI_OPTIONS.map(h=><option key={h} value={h}>{h}</option>)}</select></label>
   {mode==='batu'&&<label className={styles.formField}>Nơi sinh<select name={`${id}Place`} required value={person.place} onChange={e=>update('place',e.target.value)}><option value="">Chọn nơi được hỗ trợ</option>{COUPLE_PLACES.map(p=><option key={p}>{p}</option>)}{person.place&&!COUPLE_PLACES.includes(person.place)&&<option value={person.place}>{person.place} — chưa hỗ trợ</option>}</select></label>}
  </div>
  {person.hourChi==='unknown'&&<p className={styles.fieldHint}>Chưa đủ dữ liệu để lập lá số đầy đủ. Hãy bổ sung giờ sinh; hệ thống không tự gán giờ Tý.</p>}
 </fieldset>;
}
export function PairCompatibility({mode}:{mode:CoupleMode}) {
 const profile=useProfile(),{open}=useProfileModal();
 const [a,setA]=useState<CouplePerson>(()=>profile?{name:profile.name,gender:profile.gender,dob:profile.dob,hourChi:HOUR_CHI_OPTIONS.find(h=>h.split(' (')[0].replace('Tí','Tý')===profile.hourChi.split(' (')[0].replace('Tí','Tý'))??profile.hourChi,place:profile.place}:{...blank});
 const [b,setB]=useState<CouplePerson>({...blank});
 const [reading,setReading]=useState<ReturnType<typeof buildCoupleReading>|null>(null),[text,setText]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const request=useRef(0),serviceId=`compat--${mode}-pair`;
 const price=usePaidPrice(serviceId,reading?couplePrompt(reading):undefined);
 const markFresh=useFeatureResult(text,serviceId,!loading&&!!profile);
 // The previous feature used only the saved profile and partner date. Keep its
 // purchased text accessible separately from the new two-chart calculation.
 const oldProfileMatches=profile&&a.name===profile.name&&a.gender===profile.gender&&a.dob===profile.dob&&a.place===profile.place&&a.hourChi.split(' (')[0].replace('Tí','Tý')===profile.hourChi.split(' (')[0].replace('Tí','Tý');
 const legacyText=mode==='tuvi'&&oldProfileMatches&&b.name.trim()&&b.gender&&b.dob?readAiCache('compatibility',JSON.stringify(['original-tuvi',b.name.trim(),b.gender,b.dob,cacheFingerprint()])):'';
 const [previousMode,setPreviousMode]=useState(mode);
 if(previousMode!==mode){setPreviousMode(mode);setReading(null);setText('');setError('');setLoading(false);}
 useEffect(()=>()=>{request.current++;},[mode]);
 const change=(side:'a'|'b',value:CouplePerson)=>{request.current++;setLoading(false);setReading(null);setText('');setError('');(side==='a'?setA:setB)(value);};
 const calculate=()=>{request.current++;setText('');setError('');try{setReading(buildCoupleReading(mode,a,b));}catch(e){setReading(null);setError(e instanceof Error?e.message:'Không lập được hai lá số.');}};
 const run=async()=>{
  if(!reading||loading)return;if(!profile){open();return;}
  const id=++request.current,scope=cacheFingerprint();const current=()=>id===request.current&&scope===cacheFingerprint();
  setLoading(true);setError('');
  try{
   await refreshPromptRevision();if(!current())return;
   const key=coupleCacheKey(mode,a,b,scope),cached=readAiCache('compatibility',key);
   if(cached){setText(cached);return;}
   const result=await runAiPrompt(couplePrompt(reading),{serviceId,withChartImage:false});if(!current())return;
   writeAiCache('compatibility',key,result,{module:'compat',topic:`${mode}-pair`});markFresh(result);setText(result);
  }catch(e){if(current())setError(e instanceof Error?e.message:'Không lấy được luận giải.');}finally{if(id===request.current)setLoading(false);}
 };
 return <section key={mode} className={`${styles.page} ${styles.pairPage}`}><header className={styles.compatIntro}><div className={styles.connectionEmblem} aria-hidden="true"><i/><i/><span>✦</span><b/><b/></div><span className={styles.eyebrow}>HAI CON NGƯỜI. MỘT KẾT NỐI.</span><h1>Hiểu nhau hơn.</h1><p>Đối chiếu hai {mode==='tuvi'?'lá số Tử Vi':'mệnh bàn Bát Tự'} để tìm điểm đồng điệu và cách dung hòa khác biệt.</p></header>
  <form className={styles.compatForm} onSubmit={e=>{e.preventDefault();calculate();}}><div className={styles.formPair}><PersonEditor id="personA" label="Bạn" mode={mode} person={a} onChange={p=>change('a',p)}/><PersonEditor id="personB" label="Người ấy" mode={mode} person={b} onChange={p=>change('b',p)}/></div>
   <p className={styles.inclusiveNote}>Hai bạn có thể cùng giới hoặc khác giới. Nam/Nữ là tham số của bộ tính truyền thống, không thay thế bản dạng giới và không quy định vai trò trong mối quan hệ.</p>
   {mode==='batu'&&<p className={styles.scope}>Hiện hỗ trợ 5 thành phố Việt Nam. Giờ được lấy ở giữa can giờ, hiệu chỉnh theo kinh độ và UTC+7; chưa hỗ trợ nơi sinh khác.</p>}
   <button className={`${styles.primary} ${styles.compatSubmit}`} type="submit" disabled={loading}>Lập hai lá số <span aria-hidden="true">↗</span></button>
  </form>
  {legacyText&&<details className={styles.details}><summary>Luận giải đã lưu từ phiên bản trước</summary><p className={styles.scope}>Bài đã lưu dùng hồ sơ của bạn và ngày sinh người ấy theo cách xem trước đây. Mở lại không gọi AI.</p><AiText text={legacyText}/></details>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {reading&&<section className={styles.compatResult} aria-label="Cơ sở đối chiếu"><h2 className={styles.readingTitle}>Hai lá số, hai góc nhìn</h2><p className={styles.scope}>{reading.limits}</p><details className={styles.details}><summary>Xem dữ kiện đã tính cho hai bạn ({reading.evidence.length})</summary><ul className={styles.evidenceList}>{reading.evidence.map((r,i)=><li key={i}><strong>{r.a}</strong><strong>{r.b}</strong><span>{r.relation}</span></li>)}</ul></details><section aria-label="Luận giải cặp đôi" aria-busy={loading}>{loading?<ReadingLoader kind="compat"/>:text?<AiText text={text}/>:<button type="button" className={styles.primary} disabled={price.pending} onClick={()=>void run()}>{error?'Thử luận giải lại':'Đọc luận giải hai bạn'}{price.paid && ` · ${price.text}`} ↗</button>}</section></section>}
  <p className={styles.scope}>Góc nhìn văn hóa tham khảo, không quyết định giá trị hay tương lai của mối quan hệ.</p>
 </section>;
}
