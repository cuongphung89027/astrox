"use client";
import { useState } from "react";
import type { NatalChart } from "@/lib/zodiac";
import styles from "./Zodiac.module.css";
const symbols: Record<string,string> = {"Trùng tụ":"☌","Lục hợp":"⚹","Tam hợp":"△","Vuông":"□","Đối đỉnh":"☍"};
export function AspectMatrix({chart}:{chart:NatalChart}) {
  const [selected,setSelected] = useState<{a:string;b:string;aspect:string;angle:number}|null>(null);
  return <section className={styles.matrixSection}>
    <header><span>CÁC KẾT NỐI TRÊN BẦU TRỜI</span><h3>Ma trận góc chiếu</h3><p>Chạm vào một ô để xem hai hành tinh liên kết.</p></header>
    <div className={styles.matrix} style={{gridTemplateColumns:`repeat(${chart.planets.length},minmax(0,1fr))`}}>
      {chart.planets.flatMap((planet,row)=>chart.planets.slice(0,row+1).map((other,col)=>{
        const aspect=chart.aspects.find(a=>(a.a===planet.name&&a.b===other.name)||(a.b===planet.name&&a.a===other.name));
        const active=!!aspect&&selected===aspect;
        return row===col ? <span key={`${row}-${col}`} className={styles.matrixPlanet} style={{gridColumn:col+1,gridRow:row+1}} title={planet.name} aria-label={planet.name}>{planet.symbol.replace(/\uFE0F/g,"")}&#xfe0e;</span> : <button key={`${row}-${col}`} style={{gridColumn:col+1,gridRow:row+1}} aria-label={`${planet.name} và ${other.name}: ${aspect ? `${aspect.aspect}, ${aspect.angle} độ` : "không có góc chiếu chính trong phạm vi đang xét"}`} aria-pressed={active} data-tone={aspect?.aspect === "Vuông" || aspect?.aspect === "Đối đỉnh" ? "tension" : "soft"} onClick={()=>setSelected(aspect || {a:planet.name,b:other.name,aspect:"Không có góc chiếu chính",angle:Math.round(Math.min(Math.abs(planet.longitude-other.longitude),360-Math.abs(planet.longitude-other.longitude))*10)/10})}>{aspect ? symbols[aspect.aspect] || "·" : <span className={styles.noAspect}>·</span>}</button>;
      }))}
    </div>
    <div className={styles.matrixSelection} aria-live="polite">{selected ? <><strong>{selected.a} <span>↔</span> {selected.b}</strong><p>{selected.aspect} · {selected.angle}°</p></> : <><strong>Mỗi ô, một kết nối</strong><p>Đường chéo là các hành tinh. Dấu chấm là cặp không có góc chiếu chính.</p></>}</div>
    <div className={styles.matrixLegend}>{Object.entries(symbols).map(([name,symbol])=><span key={name}><b>{symbol}</b>{name}</span>)}</div>
  </section>;
}
