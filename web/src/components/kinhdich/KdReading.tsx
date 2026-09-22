import { AiText } from "@/components/kit";
import { splitReadingSections } from "@/components/kit/StructuredReading";
import styles from "./KinhDich.module.css";

/** Older saved readings keep their full text, with technical sections folded away. */
export function KdReading({text}:{text:string}) {
 const sections=splitReadingSections(text);
 const main=sections.find(s=>/điều đáng chú ý|ý nghĩa chung|tổng quan/i.test(s.title))??sections.find(s=>s.body);
 const advice=sections.find(s=>/gợi ý cho bạn|lời khuyên|hành động/i.test(s.title)&&s!==main);
 const rest=sections.filter(s=>s!==main&&s!==advice);
 return <div className={styles.focusReading}>
  {main&&<section><AiText text={main.body||main.title}/></section>}
  {advice&&<section className={styles.readingAdvice}><header className={styles.adviceHeading}><span aria-hidden="true">↗</span><h4>Gợi ý cho bạn</h4></header><AiText text={advice.body||advice.title}/></section>}
  {rest.length>0&&<details className={styles.readingBasis}><summary>Cơ sở luận quẻ</summary>{rest.map((s,i)=><section key={i}>{s.title&&<h4>{s.title}</h4>}<AiText text={s.body}/></section>)}</details>}
 </div>;
}
