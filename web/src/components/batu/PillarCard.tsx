import type {CSSProperties} from "react";
import type {BatuPillar} from "@/lib/batu";
import styles from "./Batu.module.css";
export function PillarCard({pillar,style,className}:{pillar:BatuPillar;style?:CSSProperties;className?:string}) {
 return <article className={`${styles.pillar} ${className??""}`} data-day={pillar.label.includes('Ngày')} style={style}>
  <span>{pillar.label.replace('Trụ ','')}</span>
  <div><strong lang="zh-Hant">{pillar.hanGan}</strong><small>{pillar.viGan}</small></div>
  <i aria-hidden="true"/>
  <div><strong lang="zh-Hant">{pillar.hanZhi}</strong><small>{pillar.viZhi}</small></div>
 </article>;
}
