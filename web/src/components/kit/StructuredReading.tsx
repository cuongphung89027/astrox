import { AiText } from "@/components/kit";
import styles from "./StructuredReading.module.css";

/** Preserve every paragraph, including responses cached with the older prompt. */
export function splitReadingSections(text: string) {
  const sections: {title: string; body: string}[] = [];
  for (const line of text.replace(/\bAI\b/g, "AstroX").replace(/bốn trụ/gi, match => match[0] === "B" ? "Tứ trụ" : "tứ trụ").split("\n")) {
    const heading = line.match(/^\s*(?:#{1,6}\s+(.+?)\s*$|(?:\d+[.)]\s*)?\*\*([^*]+)\*\*\s*[:：]?\s*(.*)$)/);
    if (heading) {
      sections.push({title: (heading[1] || heading[2]).replace(/\*\*/g, "").replace(/[:：]$/, "").trim(), body: heading[3] || ""});
    } else {
      if (!sections.length) sections.push({title: "", body: ""});
      sections[sections.length - 1].body += `\n${line}`;
    }
  }
  return sections.map(section => ({...section,body:section.body.trim()})).filter(section=>section.title || section.body);
}

export function StructuredReading({text}: {text:string}) {
  const sections = splitReadingSections(text);
  return <div className={styles.readingSections}>{sections.map((section,index)=>{
    const conclusion = /tổng hợp|lời khuyên|kết luận|hành động/i.test(section.title);
    return <section key={index} className={conclusion ? styles.readingConclusion : styles.readingSection}>
      {section.title && <header><span>{conclusion ? "↗" : String(index + 1).padStart(2,"0")}</span><h3>{section.title}</h3></header>}
      {section.body && <AiText text={section.body} />}
    </section>;
  })}</div>;
}
