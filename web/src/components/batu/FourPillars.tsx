import type {CSSProperties} from "react";
import {BATU_WX_LABEL,type BatuChart,type WxKey} from "@/lib/batu";
import {ELEMENT_COLORS} from "./WuxingBar";
import { zodiacAsset } from "@/lib/earthly-branches";
import styles from "./Batu.module.css";
const ORDER=['year','month','day','time'] as const;
export function FourPillars({chart,active,onSelect}:{chart:BatuChart;active:WxKey|null;onSelect:(key:WxKey|null)=>void}) {
 return <section className={styles.chartBoard} aria-label="Sơ đồ tứ trụ Bát Tự">
  <div className={styles.chartColumns}>{ORDER.map(key=><div key={key} data-day={key==='day'}><span>{chart.pillars[key].label}</span>{key==='day'&&<small>Nhật chủ</small>}</div>)}</div>
  {(['Gan','Zhi'] as const).map((part,row)=><div key={part} className={styles.chartRow}><div className={styles.rowLabel}><span>{row===0?'THIÊN CAN':'ĐỊA CHI'}</span><i/></div><div className={styles.chartCells}>{ORDER.map((key,i)=>{const p=chart.pillars[key],element=p[`wxKey${part}`];return <button key={key} aria-label={`${p.label}: ${p[`vi${part}`]}${element?`, hành ${BATU_WX_LABEL[element]}`:''}`} aria-pressed={Boolean(element&&active===element)} onClick={()=>onSelect(element&&element!==active?element:null)} data-dim={Boolean(active&&active!==element)} data-day={key==='day'} style={{'--ink':element?ELEMENT_COLORS[element]:'#64816b',animationDelay:`${i*90+row*140}ms`} as CSSProperties}>{part === "Zhi" && <img className={styles.branchAnimal} src={zodiacAsset(p.viZhi)} alt="" aria-hidden="true" width={56} height={56}/>}<strong lang="zh-Hant">{p[`han${part}`]}</strong><span>{p[`vi${part}`]}</span><small>{element&&BATU_WX_LABEL[element]}</small></button>})}</div></div>)}
  <div className={styles.chartHint}>{active?<><span>Đang xem hành {BATU_WX_LABEL[active]}</span><button onClick={()=>onSelect(null)}>Xem tất cả</button></>:<span>Chạm vào can, chi để xem hành tương ứng.</span>}</div>
 </section>;
}
