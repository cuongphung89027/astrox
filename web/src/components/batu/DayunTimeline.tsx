import type {BatuDayunItem} from "@/lib/batu";
import styles from "./Batu.module.css";
export function DayunTimeline({dayun}:{dayun:BatuDayunItem[]}){
 const year=new Date().getFullYear();
 if(!dayun.length)return <p>Chưa có dữ liệu Đại vận.</p>;
 return <ol className={styles.timeline}>{dayun.map((d,i)=>{const active=year>=d.startYear&&year<=d.endYear;return <li key={i} data-current={active} aria-current={active?'step':undefined}><div className={styles.age}><strong>{d.startAge}</strong><span>đến {d.endAge} tuổi</span></div><article><div><span>{d.startYear} — {d.endYear}</span><h3>{d.viGanZhi}</h3>{active&&<small>Đang đi qua</small>}</div><b lang="zh-Hant">{d.hanGanZhi}</b></article></li>})}</ol>;
}
