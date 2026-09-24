"use client";
import { useFeatureResult } from "@/lib/use-feature-result";
import { trackFeature } from "@/lib/feature-telemetry";
import { refreshPromptRevision } from "@/lib/state";
import { PairCompatibility } from "./PairCompatibility";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {LoadingWhisper} from "@/components/kit/LoadingWhisper";
import {useEffect,useMemo,useRef,useState} from "react";
import {AiText} from "@/components/kit";
import {FeatureIcon} from "@/components/kit/FeatureIcon";
import {ReadingLoader} from "@/components/kit/ReadingLoader";
import {useProfileModal} from "@/components/profile/ProfileModal";
import {cacheFingerprint,readAiCache,writeAiCache} from "@/lib/state";
import {runAiPrompt} from "@/lib/api";
import {useProfile} from "@/lib/use-store";
import {ZODIAC_SIGNS,compatAnalysis,compatPrompt,extractJson,getZodiacSign,type CompatAiResult,type ZodiacSign} from "@/lib/zodiac";
import {CompatWheel} from "./CompatWheel";
import styles from "./Compat.module.css";
const signById=(id:string)=>ZODIAC_SIGNS.find(s=>s.id===id);
function SignPicker({value,onSelect,onClose}:{value:string;onSelect:(id:string)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const old=document.activeElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();return()=>{document.body.style.overflow=overflow;if(old instanceof HTMLElement&&old.isConnected)old.focus({preventScroll:true});};},[]);
 return <dialog ref={dialog} className={styles.picker} aria-label="Chọn cung hoàng đạo" onCancel={e=>{e.preventDefault();onClose();}}><header><h2>Chọn cung hoàng đạo</h2><button onClick={onClose} aria-label="Đóng chọn cung"><FeatureIcon name="close" size={20}/></button></header><div>{ZODIAC_SIGNS.map(s=><button key={s.id} onClick={()=>onSelect(s.id)} aria-pressed={s.id===value}><span>{s.symbol}{"\uFE0E"}</span><strong>{s.name}</strong><small>{s.element}</small></button>)}</div></dialog>;
}
function Reading({raw}:{raw:string}){
 let parsed:CompatAiResult|null=null;
 try{const p=extractJson<CompatAiResult>(raw);if(Array.isArray(p.strengths)&&p.strengths.every(s=>typeof s==='string')&&Array.isArray(p.watchouts)&&p.watchouts.every(s=>typeof s==='string')&&typeof p.advice==='string')parsed=p;}catch{}
 if(!parsed)return <AiText text={raw}/>;
 return <div className={styles.readingParts}><section><span className={styles.eyebrow}>ĐIỂM GẶP NHAU</span><h3>Điều kết nối hai bạn</h3><ul>{parsed.strengths.map((s,i)=><li key={i}><span aria-hidden="true">0{i+1}</span><AiText text={s}/></li>)}</ul></section><section><span className={styles.eyebrow}>DÀNH CHỖ CHO KHÁC BIỆT</span><h3>Điều cần dung hòa</h3><ul>{parsed.watchouts.map((s,i)=><li key={i}><span aria-hidden="true">↗</span><AiText text={s}/></li>)}</ul></section><section className={styles.advice}><header><FeatureIcon name="compat" size={23}/><h3>Gợi ý cho hai bạn</h3></header><AiText text={parsed.advice}/></section></div>;
}
function WesternCompatClient(){
 const profile=useProfile();const {open}=useProfileModal();
 const [aOverride,setA]=useState<string|null>(null),[bId,setB]=useState('');
 const aId=aOverride??getZodiacSign(profile?.dob)?.id??'';
 const [picker,setPicker]=useState<'a'|'b'|null>(null),[phase,setPhase]=useState<'choose'|'joining'|'result'>('choose');
 const [checked,setChecked]=useState<{a:string;b:string}|null>(null);
 const [raw,setRaw]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const markFresh = useFeatureResult(raw, "compat--pair", phase === "result" && !loading && !!profile);
 const req=useRef(0);
 const a=signById(aId),b=signById(bId),ca=checked?signById(checked.a):undefined,cb=checked?signById(checked.b):undefined;
 const analysis=useMemo(()=>ca&&cb?compatAnalysis(ca,cb):null,[ca,cb]);
 const key=checked?`${[checked.a,checked.b].sort().join('+')}::${cacheFingerprint()}`:'';
 const scope=key+JSON.stringify(profile),[previousScope,setPreviousScope]=useState<string|null>(null);
 if(scope!==previousScope){setPreviousScope(scope);setLoading(false);setError('');setRaw(key&&profile?readAiCache('compatibility',key):'');}
 useEffect(()=>()=>{req.current++;},[scope]);
 useEffect(()=>{if(phase==='result')trackFeature("result_view","compat","calculation");},[phase]);
 useEffect(()=>{if(phase!=='joining')return;const timer=setTimeout(()=>setPhase('result'),1100);return()=>clearTimeout(timer);},[phase]);
 const check=()=>{if(!a||!b)return;trackFeature("feature_start","compat","calculation");window.scrollTo({top:0,behavior:"instant"});setChecked({a:a.id,b:b.id});const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='reduced';setPhase(reduced?'result':'joining');};
 const reset=()=>{req.current++;setLoading(false);setChecked(null);setPhase('choose');setRaw('');setError('');};
 const run=async()=>{if(!ca||!cb||!analysis)return;if(!profile){open();return;}await refreshPromptRevision();const cached=readAiCache('compatibility',key);if(cached){setRaw(cached);return;}const id=++req.current;setLoading(true);setError('');try{const text=await runAiPrompt(compatPrompt(ca,cb,analysis,profile),{withChartImage:false,temperature:.6,serviceId:"compat--pair"});if(id!==req.current)return;writeAiCache('compatibility',key,text,{module:'compatibility',topic:'pair'});markFresh(text);setRaw(text);}catch(e){if(id===req.current)setError(e instanceof Error?e.message:'Không lấy được luận giải.');}finally{if(id===req.current)setLoading(false);}};
 const person=(sign:ZodiacSign|undefined,side:'a'|'b')=><button className={styles.person} onClick={()=>setPicker(side)} aria-label={`Chọn cung ${side==='a'?'người thứ nhất':'người thứ hai'}${sign?`: ${sign.name}`:''}`}><span>{side==='a'?'BẠN':'NGƯỜI ẤY'}</span><div className={styles.signSeal}>{sign?<b>{sign.symbol}{"\uFE0E"}</b>:<FeatureIcon name="profile" size={35}/>}</div><h3>{sign?.name??'Chọn cung'}</h3><small>{sign?`${sign.element} · Thay đổi`:'Chạm để chọn'}<i aria-hidden="true">⌄</i></small></button>;
 return <section className={styles.page}><h1 className="sr-only">Tương Hợp</h1>{phase==='choose'?<div className={styles.choose}><header className={styles.intro}><span className={styles.eyebrow}>HAI DẤU ẤN. MỘT KẾT NỐI.</span><h2>Gặp nhau ở đâu?</h2></header><div className={styles.pair}>{person(a,'a')}<span className={styles.pairLink} aria-hidden="true"><FeatureIcon name="compat" size={21}/></span>{person(b,'b')}</div><p className={styles.scope}>Đối chiếu theo cung Mặt Trời của hai người.</p><button className={styles.primary} disabled={!a||!b} onClick={check}>Khám phá sự kết nối <span>↗</span></button>{!profile&&<button className={styles.profileLink} onClick={()=>open()}>Dùng cung từ hồ sơ của bạn ↗</button>}</div>:ca&&cb&&analysis?<>
  <header className={styles.resultNav}><button onClick={reset} aria-label="Chọn lại hai cung">←</button><span>{phase==='joining'?'ĐANG KẾT NỐI':'HAI BẠN'}</span></header>
  <div className={styles.resultHero} data-joining={phase==='joining'}><div className={styles.pairNames}><h2>{ca.name}</h2><span>&</span><h2>{cb.name}</h2></div><CompatWheel a={ca} b={cb} pairKey={`${ca.id}:${cb.id}`}/>{phase==='joining'?<p className={styles.joiningText} role="status"><LoadingWhisper kind="compat"/></p>:<div className={styles.score}><strong>{analysis.percent}<small>/100</small></strong><h3>{analysis.relation}</h3><span>Chỉ số tham khảo theo cung Mặt Trời</span></div>}</div>
  {phase==='result'&&<div className={styles.resultBody}><div className={styles.elementPair}><span>{ca.element}</span><i>↔</i><span>{cb.element}</span></div><p className={styles.elementNote}>{analysis.elementNote}</p><details className={styles.details}><summary>Cách đối chiếu</summary><p>Khoảng cách giữa hai cung: {analysis.angle}° · {analysis.aspectLabel}. Chỉ số được tính theo quy tắc cung và nguyên tố, không phải xác suất thành công của mối quan hệ.</p></details><section className={styles.reading} aria-busy={loading}>{!profile?<div className={styles.profileInvite}><FeatureIcon name="compat" size={28}/><h3>Hiểu nhau sâu hơn</h3><p>Bổ sung hồ sơ để mở phần luận giải cho hai bạn.</p><button className={styles.primary} onClick={()=>open()}>Bổ sung hồ sơ ↗</button></div>:loading?<ReadingLoader kind="compat"/>:raw?<><Reading raw={raw}/><span className={styles.saved}>✓ Đã lưu luận giải</span></>:<><h3 className={styles.readingTitle}>Hiểu nhau sâu hơn</h3>{error&&<p role="alert" className={styles.error}>{error}</p>}<button className={styles.primary} onClick={run}>{error?'Thử lại':'Đọc luận giải hai bạn'}<span>↗</span></button></>}</section></div>}
 </>:null}{picker&&<SignPicker value={picker==='a'?aId:bId} onClose={()=>setPicker(null)} onSelect={id=>{if(picker==='a')setA(id);else setB(id);setPicker(null);}}/>}</section>;
}

export function CompatClient(){
 return <Suspense fallback={<ReadingLoader kind="compat"/>}><CompatModes/></Suspense>;
}
function CompatModes(){
 const profile=useProfile(),params=useSearchParams();
 const scope=profile?cacheFingerprint():'guest';
 const [selected,setMode]=useState<'tuvi'|'batu'|'western'|null>(null);
 const requested=params.get('mode');
 const mode=selected??(requested==='batu'||requested==='western'?requested:'tuvi');
 return <>
  <nav className={styles.modeNav} aria-label="Phương pháp tương hợp">
   {([['tuvi','Tử Vi'],['batu','Bát Tự'],['western','Cung hoàng đạo']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>setMode(id)} aria-pressed={mode===id}>{label}</button>)}
  </nav>
  <div hidden={mode==='western'}><PairCompatibility key={scope} mode={mode==='western'?'tuvi':mode}/></div>
  <div hidden={mode!=='western'}><WesternCompatClient key={scope}/></div>
 </>;
}
