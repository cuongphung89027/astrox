import type {ZodiacSign} from "@/lib/zodiac";
import styles from "./Compat.module.css";
export function CompatWheel({a,b,pairKey}:{a:ZodiacSign;b:ZodiacSign;pairKey:string}){
 return <svg key={pairKey} viewBox="0 0 360 224" className={styles.wheel} role="img" aria-label={`Hai cung ${a.name} và ${b.name}`}>
  {[a,b].map((sign,i)=><g key={i} className={i===0?styles.leftRing:styles.rightRing}>
   <circle cx={i?224:136} cy="112" r="86" fill={i?'#d8c084':'#729679'} fillOpacity=".07" stroke={i?'#d8c084':'#91b096'} strokeOpacity=".5"/>
   <circle cx={i?224:136} cy="112" r="74" fill="none" stroke={i?'#d8c084':'#91b096'} strokeOpacity=".35" strokeDasharray="1 6"/>
   <circle cx={i?224:136} cy="112" r="61" fill="none" stroke="#d8c084" strokeOpacity=".12"/>
   <text x={i?248:112} y="126" textAnchor="middle" fontSize="42" fill={i?'#e0c992':'#c6d7b6'}>{sign.symbol}{'\uFE0E'}</text>
  </g>)}<g className={styles.meeting}><path d="m180 99 3.8 9.2L193 112l-9.2 3.8L180 125l-3.8-9.2L167 112l9.2-3.8Z" fill="#d8c084"/><circle cx="180" cy="112" r="22" fill="none" stroke="#d8c084" strokeOpacity=".2"/></g>
 </svg>;
}
