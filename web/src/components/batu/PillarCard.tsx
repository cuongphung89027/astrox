/**
 * PillarCard — một trụ Bát Tự: can trên, chi dưới, chữ Hán to font-display
 * nhuộm màu theo ngũ hành (Kim vàng / Mộc ngọc / Thuỷ chàm / Hoả son /
 * Thổ nâu), kèm Việt ngữ, Thập Thần và con giáp.
 * Nhận className/style để TextsReveal gắn class stagger khi reveal.
 */
import type { CSSProperties } from "react";
import { GlassCard, Chip } from "@/components/kit";
import { BATU_BRANCH_VI, BATU_STEM_VI, BATU_WX_COLOR, BATU_WX_LABEL } from "@/lib/batu";
import type { BatuPillar as Pillar } from "@/lib/batu";

interface PillarCardProps {
  pillar: Pillar;
  className?: string;
  style?: CSSProperties;
}

export function PillarCard({ pillar, className, style }: PillarCardProps) {
  const ganColor = pillar.wxKeyGan ? BATU_WX_COLOR[pillar.wxKeyGan] : undefined;
  const zhiColor = pillar.wxKeyZhi ? BATU_WX_COLOR[pillar.wxKeyZhi] : undefined;
  const animal = BATU_BRANCH_VI[pillar.hanZhi]?.animal;
  const yy = BATU_STEM_VI[pillar.hanGan]?.yy;

  return (
    <GlassCard className={`h-full ${className ?? ""}`} style={style}>
      <div className="p-4 text-center sm:p-5">
      <Chip tone="neutral" className="mx-auto">
        {pillar.label}
      </Chip>

      {/* Thiên Can */}
      <p
        className="mt-3 font-display text-[44px] font-extrabold leading-none tracking-tight sm:text-5xl"
        style={{ color: ganColor }}
        lang="zh-Hant"
      >
        {pillar.hanGan}
      </p>
      <p className="mt-1.5 text-[13px] font-bold text-muc">
        {pillar.viGan}
        {yy ? <span className="font-medium text-muc-2"> · {yy}</span> : null}
      </p>
      {pillar.shishenGan ? (
        <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muc-2">{pillar.shishenGan}</p>
      ) : null}

      <div aria-hidden="true" className="mx-auto my-3 h-px w-10 bg-muc/15" />

      {/* Địa Chi */}
      <p
        className="font-display text-[44px] font-extrabold leading-none tracking-tight sm:text-5xl"
        style={{ color: zhiColor }}
        lang="zh-Hant"
      >
        {pillar.hanZhi}
      </p>
      <p className="mt-1.5 text-[13px] font-bold text-muc">
        {pillar.viZhi}
        {animal ? <span className="font-medium text-muc-2"> · {animal}</span> : null}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1">
        {pillar.wxKeyGan ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold"
            style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: ganColor }}
          >
            {BATU_WX_LABEL[pillar.wxKeyGan]}
          </span>
        ) : null}
        {pillar.wxKeyZhi ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-extrabold"
            style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: zhiColor }}
          >
            {BATU_WX_LABEL[pillar.wxKeyZhi]}
          </span>
        ) : null}
      </div>

      {pillar.shishenZhi.length > 0 ? (
        <p className="mt-2 text-[11px] font-semibold leading-snug text-muc-2">{pillar.shishenZhi.join(" · ")}</p>
      ) : null}
      </div>
    </GlassCard>
  );
}
