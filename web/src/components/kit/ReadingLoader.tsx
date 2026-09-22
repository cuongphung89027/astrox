"use client";
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import { useEffect, useState, type CSSProperties } from "react";
import { FeatureIcon } from "./FeatureIcon";
import styles from "./ReadingLoader.module.css";

type Kind = "tuvi" | "tarot" | "zodiac" | "battu" | "numerology" | "compat";
const COPY: Record<Kind,[string,string]> = {
 tuvi:["TỬ VI","Đọc lá số của bạn…"], tarot:["TAROT","Lắng nghe những lá bài…"],
 zodiac:["CUNG HOÀNG ĐẠO","Kết nối những vì sao…"], battu:["BÁT TỰ","Đọc tứ trụ của bạn…"],
 numerology:["THẦN SỐ HỌC","Khám phá dấu ấn con số…"], compat:["TƯƠNG HỢP","Tìm điểm giao của hai bạn…"],
};
const delay=(i:number)=>({"--delay":`${i*140}ms`} as CSSProperties);
export function ReadingLoader({kind,label,showElapsed=true,showWhisper=true}:{kind:Kind;label?:string;showElapsed?:boolean;showWhisper?:boolean}) {
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[]);
 return <div className={styles.loader} data-reading-loader={kind} role="status" aria-live="polite">
  <div className={styles.art} data-kind={kind} aria-hidden="true">
   {kind==="tuvi"&&<svg viewBox="0 0 64 64" fill="none">{[[8,8],[21,8],[34,8],[47,8],[47,21],[47,34],[47,47],[34,47],[21,47],[8,47],[8,34],[8,21]].map(([x,y],i)=><rect className={styles.pulse} style={delay(i)} key={i} x={x} y={y} width="9" height="9" rx="2" fill="currentColor"/>)}<path d="m32 23 2.5 6.5L41 32l-6.5 2.5L32 41l-2.5-6.5L23 32l6.5-2.5Z" stroke="currentColor"/></svg>}
   {kind==="tarot"&&<div className={styles.cards}>{[0,1,2].map(i=><span key={i} style={{...delay(i),"--angle":`${(i-1)*16}deg`,"--offset":`${(i-1)*13}px`} as CSSProperties}><FeatureIcon name="tarot" size={24}/></span>)}</div>}
   {kind==="zodiac"&&<><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="23" stroke="currentColor" opacity=".22"/><ellipse cx="32" cy="32" rx="27" ry="13" transform="rotate(-35 32 32)" stroke="currentColor" opacity=".5"/><path d="m32 22 2.8 7.2L42 32l-7.2 2.8L32 42l-2.8-7.2L22 32l7.2-2.8Z" stroke="currentColor"/></svg><svg className={styles.orbit} viewBox="0 0 64 64"><circle cx="32" cy="9" r="3" fill="currentColor"/></svg></>}
   {kind==="battu"&&<svg viewBox="0 0 64 64" fill="none">{[0,1,2,3].map(i=><g className={styles.pillar} key={i} style={delay(i)}><rect x={8+i*13} y={i===0||i===3?17:9} width="9" height={i===0||i===3?34:42} rx="3" stroke="currentColor"/><path d={`M${10+i*13} 29h5m-5 10h5`} stroke="currentColor"/></g>)}<path d="M5 55h54" stroke="currentColor" opacity=".3"/></svg>}
   {kind==="numerology"&&<div className={styles.numberScene}>
    <svg viewBox="0 0 160 160" fill="none"><circle cx="80" cy="80" r="68" stroke="currentColor" opacity=".13"/><circle cx="80" cy="80" r="53" stroke="currentColor" opacity=".18" strokeDasharray="1 5"/><g className={styles.numberWeave}><path d="M80 28 125 106H35Z" pathLength="1"/><path d="m80 132 45-78H35Z" pathLength="1"/></g><circle className={styles.numberGlow} cx="80" cy="80" r="31" fill="#e5ead9"/></svg>
    <div className={styles.numberCenter}><FeatureIcon name="numerology" size={40}/></div>
    <div className={styles.numberWheel}>{Array.from({length:9},(_,i)=><span key={i} style={{"--angle":`${i*40}deg`,"--delay":`${i*110}ms`} as CSSProperties}><b>{i+1}</b></span>)}</div>
   </div>}
   {kind==="compat"&&<svg viewBox="0 0 64 64" fill="none"><circle className={styles.leftRing} cx="24" cy="32" r="17" stroke="currentColor"/><circle className={styles.rightRing} cx="40" cy="32" r="17" stroke="currentColor"/><path className={styles.pulse} d="m32 26 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="currentColor"/></svg>}
  </div>
  <div className={styles.copy}><span>{COPY[kind][0]}</span><p>{label??COPY[kind][1]}</p>{showWhisper&&<small><LoadingWhisper kind={kind}/></small>}</div>
  {showElapsed&&<span className={styles.time} aria-hidden="true">{elapsed}s</span>}
 </div>;
}
