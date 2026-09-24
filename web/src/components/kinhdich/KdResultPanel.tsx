"use client";
import type { CastResult } from "@/lib/kinhdich";
import { KD_METHODS, hexagramName } from "@/lib/kinhdich";
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
      <div className={styles.sealMain}><div className={styles.sealText}><span>QUẺ CHÍNH</span><h3>{mainName}</h3><small>{result.lines.some(l=>l.moving) ? `Hào động: ${result.lines.filter(l=>l.moving).map(l=>l.pos).join(", ")}` : "Không có hào động"}</small></div><div className={styles.sealFigure}><HexagramSvg lines={result.lines} label={hexagramAriaLabel(result.lines,mainName)}/></div></div>
      <div className={styles.sealChange}><span aria-hidden="true">↳</span><div><small>CHUYỂN THÀNH</small><h4>{bienName}</h4></div><HexagramSvg lines={bienLines} label={hexagramAriaLabel(bienLines,bienName)}/></div>
    </div>
    <details className={styles.castDetails}><summary>Xem chi tiết quẻ</summary>
      <p>{KD_METHODS[result.method || "numbers"]}{result.algorithmVersion === "legacy-v1" ? " · Bản đã lưu trước đây" : ""}</p>
      {result.method !== "coins" && <><p>{result.relation.label} · {result.relation.desc}</p>
      <p>Thể: {result.the.name} · {result.the.elem}. Dụng: {result.dung.name} · {result.dung.elem}.</p>
      {result.method === "numbers" && <p>Ba số: {result.s1} · {result.s2} · {result.s3}</p>}<p>Thượng quái: {result.upper.name} · Hạ quái: {result.lower.name}</p><p>Quẻ hỗ: {hexagramName(result.hoUpper,result.hoLower)}</p></>}
      {result.metadata?.normalized && <p>Dữ liệu: {String(result.metadata.normalized)}</p>}
      {result.metadata?.timestamp && <p>Thời điểm: {new Date(String(result.metadata.timestamp)).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})} (UTC+7). Âm lịch: {String(result.metadata.lunarDay)}/{String(result.metadata.lunarMonth)}/{String(result.metadata.lunarYear)}{result.metadata.leapMonth ? " · tháng nhuận" : ""}. Chi năm: {String(result.metadata.yearBranch)} · chi giờ: {String(result.metadata.hourBranch)}.</p>}
      {result.method === "coins" && <p>Giá trị hào từ dưới lên: {(result.metadata?.values as number[])?.join(" · ")}</p>}
    </details>
  </section>;
}
