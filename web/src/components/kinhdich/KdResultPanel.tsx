"use client";
import type { CastResult } from "@/lib/kinhdich";
import { HAO_NAMES, hexagramName } from "@/lib/kinhdich";
import { HexagramSvg, hexagramAriaLabel } from "./HexagramSvg";
import styles from "./KinhDich.module.css";
interface KdResultPanelProps { result: CastResult; }
export function KdResultPanel({ result }: KdResultPanelProps) {
  // Quẻ biến dựng lại từ dòng hào đã đảo hào động (port logic cũ).
  const bienLines = result.lines.map((l) => ({ ...l, bit: l.moving ? 1 - l.bit : l.bit, moving: false }));
  const mainName = hexagramName(result.upper, result.lower);
  const bienName = hexagramName(result.bienUpper, result.bienLower);

  return <section className={styles.quietResult}>
    <div className={styles.oracleSeal}>
      <div className={styles.sealMain}><div className={styles.sealText}><span>QUẺ CHÍNH</span><h3>{mainName}</h3><small>{HAO_NAMES[result.movingPos]} động</small></div><div className={styles.sealFigure}><HexagramSvg lines={result.lines} label={hexagramAriaLabel(result.lines,mainName)}/></div></div>
      <div className={styles.sealChange}><span aria-hidden="true">↳</span><div><small>CHUYỂN THÀNH</small><h4>{bienName}</h4></div><HexagramSvg lines={bienLines} label={hexagramAriaLabel(bienLines,bienName)}/></div>
    </div>
    <details className={styles.castDetails}><summary>Xem chi tiết quẻ</summary>
      <p>{result.relation.label} · {result.relation.desc}</p>
      <p>Thể: {result.the.name} · {result.the.elem}. Dụng: {result.dung.name} · {result.dung.elem}.</p>
      <p>Ba số: {result.s1} · {result.s2} · {result.s3}</p><p>Thượng quái: {result.upper.name} · Hạ quái: {result.lower.name}</p><p>Quẻ hỗ: {result.hoUpper.name} / {result.hoLower.name}</p>
    </details>
  </section>;
}
