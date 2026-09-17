"use client";

/**
 * KdResultPanel — kết quả gieo quẻ: 2 cột (quẻ chính & quẻ biến) + phân tích
 * Thể–Dụng–Ngũ hành. Toàn bộ dữ liệu port từ castHexagram của app cũ; quẻ
 * chính/biến vẽ SVG 6 hào, tên quẻ ghép tượng theo cách app cũ.
 */
import { Chip, GlassCard } from "@/components/kit";
import { PanelReveal } from "@/components/motion";
import type { CastResult } from "@/lib/kinhdich";
import { HAO_NAMES, TRIGRAMS, hexagramName } from "@/lib/kinhdich";
import { HexagramSvg, hexagramAriaLabel } from "./HexagramSvg";

interface KdResultPanelProps {
  result: CastResult;
}

function TrigramFact({ symbol, name, nature, elem, dir }: { symbol: string; name: string; nature: string; elem: string; dir: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-2.5">
      <p className="font-display text-sm font-extrabold text-muc">
        <span aria-hidden="true" className="mr-1.5 text-base">
          {symbol}
        </span>
        {name} <span className="font-semibold text-muc-2">({nature})</span>
      </p>
      <p className="mt-0.5 text-[11.5px] font-medium text-muc-2">
        Ngũ hành {elem} · phương {dir}
      </p>
    </div>
  );
}

export function KdResultPanel({ result }: KdResultPanelProps) {
  // Quẻ biến dựng lại từ dòng hào đã đảo hào động (port logic cũ).
  const bienLines = result.lines.map((l) => ({ ...l, bit: l.moving ? 1 - l.bit : l.bit, moving: false }));
  const mainName = hexagramName(result.upper, result.lower);
  const bienName = hexagramName(result.bienUpper, result.bienLower);

  return (
    <PanelReveal open className="mt-8">
      <div aria-live="polite" className="sr-only">
        Đã lập quẻ {mainName}, hào động {HAO_NAMES[result.movingPos]}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cột trái: quẻ chính + Thể–Dụng */}
        <div className="flex flex-col gap-5">
          <GlassCard variant="premium" className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muc-2">Quẻ chính · bản quẻ</p>
            <h3 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-muc">{mainName}</h3>
            <div className="mt-5 flex justify-center">
              <HexagramSvg lines={result.lines} label={hexagramAriaLabel(result.lines, mainName)} className="max-w-[200px]" />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {(
                [
                  ["Thượng quái", `${result.upper.name} ${result.upper.symbol} (${result.upper.nature})`],
                  ["Hạ quái", `${result.lower.name} ${result.lower.symbol} (${result.lower.nature})`],
                  ["Hào động", HAO_NAMES[result.movingPos]],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-xl bg-white/55 px-2 py-2.5 text-center">
                  <p className="text-[10.5px] font-semibold text-muc-2">{k}</p>
                  <p className="mt-0.5 text-[13px] font-bold text-muc">{v}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 sm:p-7">
            <h3 className="font-display text-lg font-extrabold text-muc">Quan hệ Thể – Dụng</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/70 bg-white/55 p-4">
                <Chip tone="ngoc">Thể quái · bản thân</Chip>
                <p className="mt-2.5 text-sm font-bold text-muc">
                  {result.the.name} {result.the.symbol} — {result.the.elem}
                </p>
                <p className="text-xs font-medium text-muc-2">{result.theIsLower ? "Hạ quái (chứa hào động)" : "Thượng quái (chứa hào động)"}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/55 p-4">
                <Chip tone="kim">Dụng quái · sự việc</Chip>
                <p className="mt-2.5 text-sm font-bold text-muc">
                  {result.dung.name} {result.dung.symbol} — {result.dung.elem}
                </p>
                <p className="text-xs font-medium text-muc-2">{result.theIsLower ? "Thượng quái" : "Hạ quái"}</p>
              </div>
              <div className="rounded-2xl border border-son/25 bg-son-tint/60 p-4 sm:col-span-2">
                <p className="text-sm font-extrabold text-son-deep">{result.relation.label}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muc-2">{result.relation.desc}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <TrigramFact
                symbol={result.upper.symbol}
                name={result.upper.name}
                nature={result.upper.nature}
                elem={result.upper.elem}
                dir={result.upper.dir}
              />
              <TrigramFact
                symbol={result.lower.symbol}
                name={result.lower.name}
                nature={result.lower.nature}
                elem={result.lower.elem}
                dir={result.lower.dir}
              />
            </div>
          </GlassCard>
        </div>

        {/* Cột phải: quẻ biến + quẻ hỗ + nhắc nhở */}
        <div className="flex flex-col gap-5">
          <GlassCard className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muc-2">Quẻ biến · xu hướng nếu tiếp diễn</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-muc">{bienName}</h3>
            <div className="mt-4 flex justify-center">
              <HexagramSvg lines={bienLines} label={hexagramAriaLabel(bienLines, bienName)} className="max-w-[170px] opacity-90" />
            </div>
            <p className="mt-4 rounded-xl bg-white/55 px-3.5 py-2.5 text-[13px] font-medium text-muc-2">
              <span className="font-bold text-muc">Quẻ hỗ</span> (động lực ngầm: hào 2-3-4 nội, 3-4-5 ngoại): Thượng{" "}
              {result.hoUpper.name} {result.hoUpper.symbol}, Hạ {result.hoLower.name} {result.hoLower.symbol}.
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-[12.5px] leading-relaxed text-muc-2">
              <strong className="text-muc">Nhất sự bất nhị chiêm:</strong> một việc không nên gieo quẻ hai lần liên tiếp. Chỉ gieo lại khi
              bối cảnh đã thay đổi rõ ràng hoặc sau vài ngày. Không có quẻ &ldquo;tốt&rdquo; hay &ldquo;xấu&rdquo; tuyệt đối — mỗi quẻ phản
              ánh xu hướng và thời thế, không phải định mệnh cố định.
            </p>
          </GlassCard>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="text-[11px] font-bold text-muc-2">Tiên Thiên số:</span>
        {TRIGRAMS.map((t) => (
          <span key={t.idx} className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-bold text-muc-2">
            {t.name} {t.idx}
          </span>
        ))}
      </div>
    </PanelReveal>
  );
}
