"use client";
import {useState} from "react";
import type {NumerologyChart} from "@/lib/numerology";
import styles from "./Numerology.module.css";
export function BirthGrid({chart}:{chart:NumerologyChart}){
 const [selected,setSelected]=useState<number|null>(null);const order=[3,6,9,2,5,8,1,4,7];
 return <><div className={styles.birthGrid}>{order.map((n,i)=><button key={n} aria-pressed={selected===n} aria-label={`Số ${n}: xuất hiện ${chart.grid.counts[n]||0} lần`} data-present={Boolean(chart.grid.counts[n])} onClick={()=>setSelected(n)} style={{animationDelay:`${i*45}ms`}}><strong>{n}</strong><span>{chart.grid.counts[n]?`${chart.grid.counts[n]} lần`:'—'}</span></button>)}</div><p className={styles.gridStatus} role="status">{selected?`Số ${selected} ${chart.grid.counts[selected]?`xuất hiện ${chart.grid.counts[selected]} lần`:'không xuất hiện'} trong ngày sinh.`:'Chạm một số để xem số lần xuất hiện.'}</p><div className={styles.missing}><span>Số khuyết</span><strong>{chart.grid.missing.length?chart.grid.missing.join(' · '):'Không có'}</strong></div></>;
}
export function NumberCycles({chart}:{chart:NumerologyChart}){
 return <ol className={styles.cycles}>{chart.pinnacles.map((p,i)=>{const current=chart.now.age>=p.startAge&&chart.now.age<p.endAge;return <li key={i} data-current={current} aria-current={current?'step':undefined}><div className={styles.cycleMark}><span>0{i+1}</span><i/></div><article><div><span>{p.startAge}–{p.endAge===999?'…':p.endAge} tuổi</span><h3>Đỉnh cao {i+1}</h3><small>Thử thách · {p.challenge}</small>{current&&<em>Đang đi qua</em>}</div><strong>{p.pinnacle}</strong></article></li>})}</ol>;
}
