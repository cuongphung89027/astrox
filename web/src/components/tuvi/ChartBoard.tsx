"use client";

/**
 * ChartBoard — bánh lá số 12 cung, lưới 4×4 kiểu lá số truyền thống nhưng theo
 * design system "Mặt Trời Đông Sơn": mỗi cung 1 GlassCard, cung Mệnh viền son +
 * DongSonSun nhỏ. Sao chip màu theo ngũ hành (Kim vàng, Mộc ngọc, Thủy chàm,
 * Hỏa son, Thổ nâu kem-2). Reveal stagger dùng đúng cơ chế ax-stagger sẵn có.
 * Mobile: lưới giữ 4 cột trong khung cuộn ngang để chữ vẫn đọc được.
 */
import { GlassCard } from "@/components/kit";
import { DongSonSun } from "@/components/kit/motifs";
import { NumberPopIn, PanelReveal, ShimmerText, useInView } from "@/components/motion";
import { menhPalace, starElement, yearStemBranch, type ZiweiChart, type ZiweiPalace, type ZiweiStar, type StarElement } from "@/lib/tuvi";
import type { Profile } from "@/lib/types";
import { formatDob } from "@/lib/utils";

const STAR_TONES: Record<StarElement, string> = {
  Kim: "bg-kim-tint text-kim-deep",
  Mộc: "bg-ngoc-tint text-ngoc-deep",
  Thủy: "bg-cham/10 text-cham",
  Hỏa: "bg-son-tint text-son-deep",
  Thổ: "bg-kem-2 text-muc-2",
};

function StarChip({ star }: { star: ZiweiStar }) {
  const el = starElement(star.name);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none md:text-[11px] ${
        el ? STAR_TONES[el] : "bg-white/70 text-muc-2"
      }`}
    >
      {star.name}
      {star.mutagen ? <span className="text-[9px] font-extrabold">{star.mutagen}</span> : null}
    </span>
  );
}

interface CellProps {
  p: ZiweiPalace;
  isMenh: boolean;
  delayMs: number;
}

function PalaceCell({ p, isMenh, delayMs }: CellProps) {
  const minors = [...p.minorStars, ...p.adjectiveStars].slice(0, 8);
  return (
    <li
      className="ax-stagger-line"
      style={{ transitionDelay: `${delayMs}ms` }}
      aria-label={`Cung ${p.name} tại ${p.earthlyBranch}`}
    >
      <GlassCard
        className={`flex h-full flex-col gap-1.5 p-3 transition-transform duration-200 hover:-translate-y-0.5 ${
          isMenh ? "ring-2 ring-son" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muc-2">
          <span>{p.earthlyBranch}</span>
          <span className="font-semibold normal-case tracking-normal text-muc-2/70">{p.decadal}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isMenh ? <DongSonSun size={14} className="shrink-0 text-son" /> : null}
          <span className="font-display text-[13px] font-extrabold tracking-tight text-muc md:text-sm">{p.name}</span>
          {p.isBodyPalace ? (
            <span className="gold-ring inline-flex items-center rounded-full bg-kim-tint px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-kim-deep">
              Thân
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {p.majorStars.length ? (
            p.majorStars.map((s) => <StarChip key={s.name} star={s} />)
          ) : (
            <span className="text-[10px] italic text-muc-2">Vô chính diệu</span>
          )}
        </div>
        {minors.length ? (
          <div className="flex flex-wrap gap-1">
            {minors.map((s, i) => (
              <StarChip key={`${s.name}-${i}`} star={s} />
            ))}
          </div>
        ) : null}
        <p className="mt-auto pt-1 text-[10px] font-semibold text-muc-2/80">
          {[p.changSheng, p.isOriginalPalace ? "Lai Nhân" : ""].filter(Boolean).join(" · ")}
        </p>
      </GlassCard>
    </li>
  );
}

function ChartCenter({ chart, profile, delayMs }: { chart: ZiweiChart; profile: Profile; delayMs: number }) {
  const menh = menhPalace(chart);
  return (
    <li className="col-span-2 row-span-2 ax-stagger-line" style={{ transitionDelay: `${delayMs}ms` }}>
      <div className="glass flex h-full flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] p-4 text-center">
        <DongSonSun size={46} className="text-son" />
        <p className="font-display text-lg font-extrabold tracking-tight text-muc md:text-xl">
          {profile.name || "Lá số của bạn"}
        </p>
        <p className="text-[11px] leading-relaxed text-muc-2 md:text-xs">
          {formatDob(profile.dob)} · {profile.gender} · Giờ {profile.hourChi}
        </p>
        {chart.meta.fiveElementsClass ? (
          <ShimmerText text={chart.meta.fiveElementsClass} className="text-sm font-extrabold" />
        ) : null}
        <p className="text-[11px] leading-relaxed text-muc-2">
          Mệnh chủ: {chart.meta.soul || "—"} · Thân chủ: {chart.meta.body || "—"}
        </p>
        <p className="text-[11px] text-muc-2">
          Mệnh tại {menh?.earthlyBranch || "—"}
          {chart.meta.zodiac ? ` · Con giáp: ${chart.meta.zodiac}` : ""}
        </p>
      </div>
    </li>
  );
}

function SummaryRow({ chart }: { chart: ZiweiChart }) {
  const menh = menhPalace(chart);
  const menhStars = menh ? menh.majorStars.map((s) => s.name).join(" · ") : "";
  const stats = [
    { label: "Mệnh chính", value: menhStars || "Vô chính diệu", pop: false, shimmer: false },
    { label: "Cung Mệnh", value: menh ? `${menh.name} tại ${menh.earthlyBranch}` : "—", pop: false, shimmer: false },
    { label: "Ngũ hành bản mệnh", value: chart.meta.fiveElementsClass || "—", pop: false, shimmer: true },
    { label: "Thiên can năm sinh", value: yearStemBranch(chart), pop: true, shimmer: false },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {stats.map((st) => (
        <li key={st.label}>
          <GlassCard className="flex h-full flex-col gap-1.5 p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muc-2">{st.label}</span>
            {st.pop ? (
              <NumberPopIn value={st.value} className="font-display text-lg font-extrabold text-muc md:text-xl" />
            ) : st.shimmer ? (
              <ShimmerText text={st.value} className="font-display text-lg font-extrabold md:text-xl" />
            ) : (
              <span className="font-display text-lg font-extrabold text-muc md:text-xl">{st.value}</span>
            )}
          </GlassCard>
        </li>
      ))}
    </ul>
  );
}

export function ChartBoard({ chart, profile }: { chart: ZiweiChart; profile: Profile }) {
  // Cơ chế reveal: container .ax-stagger + .is-shown (useInView) — đúng CSS sẵn có.
  const { ref, inView } = useInView<HTMLUListElement>();
  const isMenh = (p: ZiweiPalace) => p.name === "Mệnh";

  // Thứ tự ô port từ renderZiweiNative: 0..4, trung tâm 2×2, 5..11.
  const head = chart.palaces.slice(0, 5);
  const tail = chart.palaces.slice(5);

  return (
    <PanelReveal open className="space-y-4">
      <SummaryRow chart={chart} />
      <div className="overflow-x-auto">
        <ul
          ref={ref}
          className={`ax-stagger grid min-w-[640px] grid-cols-4 gap-2 md:min-w-0 md:gap-3 ${inView ? "is-shown" : ""}`}
        >
          {head.map((p, i) => (
            <PalaceCell key={p.index} p={p} isMenh={isMenh(p)} delayMs={100 + i * 45} />
          ))}
          <ChartCenter chart={chart} profile={profile} delayMs={100 + 5 * 45} />
          {tail.map((p, i) => (
            <PalaceCell key={p.index} p={p} isMenh={isMenh(p)} delayMs={100 + (i + 6) * 45} />
          ))}
        </ul>
      </div>
      <p className="text-xs leading-relaxed text-muc-2">
        Cung viền son là cung <strong className="font-bold text-muc">Mệnh</strong>. Chip màu theo ngũ hành sao: vàng
        (Kim), ngọc (Mộc), chàm (Thủy), son (Hỏa), nâu kem (Thổ).
      </p>
    </PanelReveal>
  );
}
