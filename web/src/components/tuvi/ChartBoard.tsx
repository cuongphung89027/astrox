"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { menhPalace, starElement, yearStemBranch, type ZiweiChart, type ZiweiStar } from "@/lib/tuvi";
import type { Profile } from "@/lib/types";
import { formatDob } from "@/lib/utils";
import { zodiacAsset } from "@/lib/earthly-branches";
import styles from "./ChartBoard.module.css";

// Fixed earthly-branch positions around the central 2 × 2 space.
const POSITIONS: Record<string, [number, number]> = {
  "Tỵ": [1, 1], "Tị": [1, 1], "Ngọ": [1, 2], "Mùi": [1, 3], "Thân": [1, 4],
  "Thìn": [2, 1], "Dậu": [2, 4], "Mão": [3, 1], "Tuất": [3, 4],
  "Dần": [4, 1], "Sửu": [4, 2], "Tý": [4, 3], "Tí": [4, 3], "Hợi": [4, 4],
};
const BRANCHES = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const branchIndex = (branch: string) => BRANCHES.indexOf(branch === "Tí" ? "Tý" : branch === "Tị" ? "Tỵ" : branch);
const TONES: Record<string, string> = { Kim: "#8b681f", Mộc: "#266647", Thủy: "#31568e", Hỏa: "#a83f38", Thổ: "#845735" };

function Star({ star }: { star: ZiweiStar }) {
  return <span className={styles.star} style={{ color: TONES[starElement(star.name) || ""] }}>
    {star.name}{star.brightness && <small> ({star.brightness})</small>}{star.mutagen && <b className={styles.mutagen}> {star.mutagen}</b>}
  </span>;
}

export function ChartBoard({ chart, profile }: { chart: ZiweiChart; profile: Profile }) {
  const menh = menhPalace(chart);
  const boardRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Record<string, [number, number]>>({});
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const bounds = board.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const next: Record<string, [number, number]> = {};
      board.querySelectorAll<HTMLElement>("[data-branch]").forEach(cell => {
        const branch = cell.dataset.branch!;
        const [row, col] = POSITIONS[branch] || [1, 1];
        const rect = cell.getBoundingClientRect();
        const x = col === 1 ? rect.right : col === 4 ? rect.left : rect.left + rect.width / 2;
        const y = row === 1 ? rect.bottom : row === 4 ? rect.top : rect.top + rect.height / 2;
        next[branch] = [(x - bounds.left) / bounds.width * 100, (y - bounds.top) / bounds.height * 100];
      });
      setAnchors(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    board.querySelectorAll("[data-branch]").forEach(cell => observer.observe(cell));
    measure();
    return () => observer.disconnect();
  }, [chart]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const active = selected ?? hovered;
  const activeIndex = active ? branchIndex(active) : -1;
  const related = activeIndex < 0 ? [] : [0, 4, 8, 6].map(offset => chart.palaces.find(p => branchIndex(p.earthlyBranch) === (activeIndex + offset) % 12)).filter(p => p !== undefined);
  const points = related.map(p => anchors[p.earthlyBranch]).filter((point): point is [number, number] => !!point);
  const toggle = (branch: string) => { setSelected(current => current === branch ? null : branch); setHovered(null); };
  return <div>
    <div className={styles.scroll} role="region" aria-label="Lá số đầy đủ 12 cung">
      <div ref={boardRef} className={styles.board} data-active={!!active} onPointerLeave={() => setHovered(null)} onKeyDown={e => { if (e.key === "Escape") { setSelected(null); setHovered(null); } }}>
        {points.length === 4 && <svg className={styles.connections} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={points.slice(0, 3).map(p => p.join(",")).join(" ")} className={styles.trine} />
          <line x1={points[0][0]} y1={points[0][1]} x2={points[3][0]} y2={points[3][1]} className={styles.opposition} />
        </svg>}
        {chart.palaces.map(p => {
          const [row, column] = POSITIONS[p.earthlyBranch] || [1, 1];
          return <section key={p.index} data-branch={p.earthlyBranch} aria-label={`Cung ${p.name} tại ${p.earthlyBranch}`} className={styles.palace} data-related={related.some(item => item.index === p.index)} data-selected={active === p.earthlyBranch}
            onPointerEnter={e => { if (e.pointerType === "mouse") setHovered(p.earthlyBranch); }} data-menh={p.name === "Mệnh"} style={{ gridRow: row, gridColumn: column } as CSSProperties}>
            <img className={styles.zodiacWatermark} src={zodiacAsset(p.earthlyBranch)} alt="" aria-hidden="true" width={180} height={180} />
            <header><span>{p.heavenlyStem} {p.earthlyBranch}</span><span>{p.decadal}</span></header>
            <h3><button type="button" className={styles.palaceButton} aria-label={`Chọn cung ${p.name} tại ${p.earthlyBranch}`} aria-pressed={selected === p.earthlyBranch} onClick={() => toggle(p.earthlyBranch)} onFocus={() => setHovered(p.earthlyBranch)} onBlur={() => setHovered(null)}>{p.name}{p.isBodyPalace && <small> · THÂN</small>}</button></h3>
            <div className={styles.major}>{p.majorStars.length ? p.majorStars.map((s, i) => <Star key={i} star={s} />) : <span className={styles.noMajor}>Vô chính diệu</span>}</div>
            <div className={styles.minor}>{[...p.minorStars, ...p.adjectiveStars].map((s, i) => <Star key={i} star={s} />)}</div>
            <footer><span>{p.changSheng}</span>{p.isOriginalPalace && <span>Lai Nhân</span>}</footer>
          </section>;
        })}
        <section className={styles.center} aria-label="Thông tin trung tâm lá số">
          <p className={styles.brand}>ASTROX · TỬ VI ĐẨU SỐ</p>
          <h2>{profile.name || "Lá số Tử Vi"}</h2>
          <dl>
            <div><dt>Ngày sinh</dt><dd>{formatDob(profile.dob)}</dd></div>
            <div><dt>Năm sinh</dt><dd>{yearStemBranch(chart)}</dd></div>
            <div><dt>Giờ sinh</dt><dd>{profile.hourChi}</dd></div>
            <div><dt>Giới tính</dt><dd>{profile.gender}</dd></div>
            <div><dt>Cục</dt><dd>{chart.meta.fiveElementsClass || "—"}</dd></div>
            <div><dt>Mệnh chủ</dt><dd>{chart.meta.soul || "—"}</dd></div>
            <div><dt>Thân chủ</dt><dd>{chart.meta.body || "—"}</dd></div>
            <div><dt>Mệnh tại</dt><dd>{menh?.earthlyBranch || "—"}</dd></div>
          </dl>
          <p className={styles.centerNote}>Thông tin lấy từ hồ sơ của bạn</p>
        </section>
      </div>
    </div>
    <div className={styles.relationship}>
      <p aria-live="polite">{related.length === 4 ? <><strong>{related[0].name}</strong><span> · Tam hợp: {related[1].name}, {related[2].name}</span><span> · Xung chiếu: {related[3].name}</span></> : "Chạm một cung để xem tam hợp và xung chiếu."}</p>
      {selected && <button type="button" onClick={() => { setSelected(null); setHovered(null); }}>Bỏ chọn ×</button>}
    </div>
    <p className={styles.legend}>Đường xanh: tam hợp · Đường vàng: xung chiếu. Màu chữ sao thể hiện ngũ hành.</p>
  </div>;
}
