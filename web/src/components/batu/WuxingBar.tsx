import type {CSSProperties} from "react";
import {BATU_WX_LABEL,type WxKey} from "@/lib/batu";
import styles from "./Batu.module.css";
const ORDER:WxKey[]=['moc','hoa','tho','kim','thuy'];
export const ELEMENT_COLORS:Record<WxKey,string>={moc:'#52775b',hoa:'#ad6452',tho:'#95774e',kim:'#ab8c43',thuy:'#557d8f'};
export function WuxingBar({wuxing,active=null,onSelect}:{wuxing:Record<WxKey,number>;active?:WxKey|null;onSelect?:(key:WxKey|null)=>void}){
 const total=Object.values(wuxing).reduce((a,b)=>a+b,0)||1;
 return <div className={styles.elementRows}>{ORDER.map(key=><button key={key} onClick={()=>onSelect?.(active===key?null:key)} aria-pressed={active===key} aria-label={`${BATU_WX_LABEL[key]}: ${wuxing[key]} trên ${total} chữ, ${Number((wuxing[key]/total*100).toFixed(1))}%`} data-dim={Boolean(active&&active!==key)} style={{'--element':ELEMENT_COLORS[key]} as CSSProperties}><span className={styles.elementName}><i/>{BATU_WX_LABEL[key]}</span><span className={styles.horizontalTrack}><i style={{width:`${wuxing[key]/total*100}%`}}/></span><strong>{Number((wuxing[key]/total*100).toFixed(1))}<small>%</small></strong></button>)}</div>;
}
