"use client";
import {useState} from "react";
import {lettersOnly,letterValue} from "@/lib/numerology";
import styles from "./Numerology.module.css";
export function CipherBoard({name}:{name:string;calcSeq:number}){
 const [active,setActive]=useState<number|null>(null);
 return <><div className={styles.letters} aria-label={`Quy đổi chữ cái trong tên ${name}`}>{name.trim().split(/\s+/).map((word,wi)=><div key={wi}>{lettersOnly(word).split('').map((ch,i)=>{const value=letterValue(ch);return value?<span key={i} data-dim={active!==null&&active!==value}><strong>{ch}</strong><small>{value}</small></span>:null})}</div>)}</div><div className={styles.numberFilter} role="group" aria-label="Chọn con số trong tên">{[1,2,3,4,5,6,7,8,9].map(n=><button key={n} aria-pressed={active===n} onClick={()=>setActive(active===n?null:n)}>{n}</button>)}</div><p className={styles.gridStatus}>{active?`Đang làm nổi bật các chữ mang số ${active}.`:'Chạm một số để tìm trong tên của bạn.'}</p></>;
}
