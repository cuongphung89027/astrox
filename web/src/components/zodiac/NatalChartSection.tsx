"use client";

/**
 * NatalChartSection — bản đồ sao chi tiết (chế độ riêng truy cập từ hub):
 * tính trực tiếp bằng astronomy-engine (port buildNatalChart), hiển thị
 * SVG vòng hoàng đạo 360° với 12 cung, 12 nhà, glyph hành tinh theo kinh độ,
 * đường góc chiếu nối giữa các hành tinh; kèm bảng hành tinh / 12 nhà /
 * góc chiếu. Vị trí giữ đúng phép chiếu cũ: natalPointAngle = 270 − kinh độ.
 */
import { Chip, GlassCard } from "@/components/kit";
import { TextsReveal } from "@/components/motion";
import { ZODIAC_SIGNS, normDeg, type NatalChart, type NatalPlanet } from "@/lib/zodiac";

/** Góc SVG của một kinh độ hoàng đạo — port natalPointAngle. */
function natalPointAngle(deg: number): number {
  return normDeg(270 - deg);
}

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

const SIZE = 440;
const C = SIZE / 2;
const R_SIGN_OUT = 208;
const R_SIGN_IN = 166;
const R_HOUSE_OUT = 166;
const R_HOUSE_IN = 116;
const R_PLANET = 94;
const R_ASPECT = 78;

const ASPECT_COLOR: Record<string, string> = {
  "Trùng tụ": "var(--color-ngoc)",
  "Lục hợp": "var(--color-ngoc)",
  "Tam hợp": "var(--color-ngoc)",
  "Vuông": "var(--color-cham)",
  "Đối đỉnh": "var(--color-son)",
};

function aspectColor(name: string): string {
  return ASPECT_COLOR[name] || "var(--color-muc-2)";
}

function NatalWheelSvg({ chart }: { chart: NatalChart }) {
  const planetPos = new Map<string, [number, number]>();
  chart.planets.forEach((p) => {
    planetPos.set(p.name, polar(C, C, R_ASPECT, natalPointAngle(p.longitude)));
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Bản đồ sao: 10 hành tinh trong 12 cung, 12 nhà và các góc chiếu, tính trực tiếp"
      className="mx-auto h-auto w-full max-w-[460px]"
    >
      {/* Vòng ngoài cách điệu + vòng cung hoàng đạo */}
      <circle cx={C} cy={C} r={R_SIGN_OUT + 9} fill="none" stroke="var(--color-kim)" strokeOpacity={0.5} strokeWidth={1.6} strokeDasharray="0.5 7" />
      <circle cx={C} cy={C} r={R_SIGN_OUT} fill="var(--color-cham)" fillOpacity={0.05} stroke="var(--color-cham)" strokeOpacity={0.35} strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_SIGN_IN} fill="var(--color-kem)" stroke="var(--color-cham)" strokeOpacity={0.35} strokeWidth={1.2} />
      <circle cx={C} cy={C} r={R_HOUSE_IN} fill="var(--color-sen)" fillOpacity={0.05} stroke="var(--color-cham)" strokeOpacity={0.3} strokeWidth={1} />

      {/* 12 cung: vạch chia + glyph */}
      {ZODIAC_SIGNS.map((s, i) => {
        const cuspAngle = natalPointAngle(i * 30);
        const [x1, y1] = polar(C, C, R_SIGN_OUT, cuspAngle);
        const [x2, y2] = polar(C, C, R_SIGN_IN, cuspAngle);
        const [gx, gy] = polar(C, C, (R_SIGN_OUT + R_SIGN_IN) / 2, natalPointAngle(i * 30 + 15));
        return (
          <g key={s.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-cham)" strokeOpacity={0.35} strokeWidth={1.2} />
            <text x={gx} y={gy + 7} textAnchor="middle" fontSize={19} fill="var(--color-cham)" fontWeight={600}>
              {s.symbol}
            </text>
            <title>{`${s.name} (${s.en})`}</title>
          </g>
        );
      })}

      {/* 12 nhà: vạch đỉnh + số nhà giữa hai đỉnh */}
      {chart.houses.map((h) => {
        const cuspAngle = natalPointAngle(h.longitude);
        const [x1, y1] = polar(C, C, R_HOUSE_OUT, cuspAngle);
        const [x2, y2] = polar(C, C, R_HOUSE_IN, cuspAngle);
        const [nx, ny] = polar(C, C, (R_HOUSE_OUT + R_HOUSE_IN) / 2, natalPointAngle(h.longitude + 15));
        return (
          <g key={h.number}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-cham)" strokeOpacity={0.3} strokeWidth={1} />
            <text x={nx} y={ny + 3.5} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-muc-2)">
              {h.number}
            </text>
          </g>
        );
      })}

      {/* Cung Mọc / Thiên Đỉnh nhấn mạnh */}
      {[
        { p: chart.points.ascendant, label: "AC" },
        { p: chart.points.midheaven, label: "MC" },
      ].map(({ p, label }) => {
        const a = natalPointAngle(p.longitude);
        const [x1, y1] = polar(C, C, R_SIGN_IN, a);
        const [x2, y2] = polar(C, C, R_HOUSE_IN, a);
        const [tx, ty] = polar(C, C, R_HOUSE_IN - 11, a);
        return (
          <g key={label}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-son)" strokeWidth={2} />
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="var(--color-son-deep)">
              {label}
            </text>
          </g>
        );
      })}

      {/* Đường góc chiếu nối giữa các hành tinh */}
      {chart.aspects.map((a, i) => {
        const pa = planetPos.get(a.a);
        const pb = planetPos.get(a.b);
        if (!pa || !pb) return null;
        return (
          <line
            key={`${a.a}-${a.b}-${i}`}
            x1={pa[0]}
            y1={pa[1]}
            x2={pb[0]}
            y2={pb[1]}
            stroke={aspectColor(a.aspect)}
            strokeOpacity={0.55}
            strokeWidth={1.5}
          >
            <title>{`${a.a} ${a.aspect} ${a.b} (${a.angle}°)`}</title>
          </line>
        );
      })}

      {/* Glyph hành tinh theo kinh độ */}
      {chart.planets.map((p) => {
        const a = natalPointAngle(p.longitude);
        const [x, y] = polar(C, C, R_PLANET, a);
        return (
          <g key={p.body}>
            <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--color-son-deep)">
              {p.symbol}
            </text>
            <title>{`${p.name} — ${p.sign.name} ${p.sign.degree.toFixed(1)}°, nhà ${p.house}`}</title>
          </g>
        );
      })}

      {/* Tâm bản đồ */}
      <circle cx={C} cy={C} r={4} fill="var(--color-kim-deep)" />
    </svg>
  );
}

function PlanetRow({ p }: { p: NatalPlanet }) {
  return (
    <tr>
      <td className="whitespace-nowrap py-2 pr-3 font-bold text-muc">
        <span aria-hidden="true" className="mr-1.5 text-[15px] text-son-deep">
          {p.symbol}
        </span>
        {p.name}
      </td>
      <td className="py-2 pr-3 text-muc-2">
        {p.sign.symbol} {p.sign.name}
      </td>
      <td className="py-2 pr-3 tabular-nums text-muc-2">{p.sign.degree.toFixed(1)}°</td>
      <td className="py-2 tabular-nums font-bold text-muc">{p.house}</td>
    </tr>
  );
}

interface NatalChartSectionProps {
  chart: NatalChart | null;
  hasProfile: boolean;
  className?: string;
}

export function NatalChartSection({ chart, hasProfile, className }: NatalChartSectionProps) {
  if (!hasProfile || !chart) {
    return (
      <GlassCard className={className}>
        <div className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-muc-2">
            Cần hồ sơ (ngày sinh) để tính bản đồ sao. Mở{" "}
            <strong className="text-muc">Hồ sơ</strong> và bổ sung — giờ sinh và nơi sinh quyết định
            Cung Mọc, Thiên Đỉnh và các nhà.
          </p>
        </div>
      </GlassCard>
    );
  }

  const big3 = [chart.big3.sun, chart.big3.moon, chart.big3.ascendant];

  return (
    <div className={className}>
      <TextsReveal className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]" stagger={90}>
        <GlassCard className="ax-stagger-line">
          <div className="p-4 md:p-6">
            <NatalWheelSvg chart={chart} />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-muc-2">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block size-2 rounded-full bg-ngoc" /> Hội hợp (trùng tụ · lục hợp · tam hợp)
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block size-2 rounded-full bg-cham" /> Vuông
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="inline-block size-2 rounded-full bg-son" /> Đối đỉnh
              </span>
            </div>
            <p className="mt-4 text-center text-xs font-semibold text-kim-deep">
              {chart.planets.length} hành tinh · 12 nhà · {chart.aspects.length} góc chiếu
            </p>
          </div>
        </GlassCard>

        <div className="ax-stagger-line space-y-5">
          <GlassCard>
            <div className="p-5 md:p-6">
              <h3 className="font-display text-lg font-extrabold text-muc">Bộ ba cốt lõi</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {big3.map((p) => (
                  <div key={p.name} className="rounded-2xl border border-muc/10 bg-white/55 p-3">
                    <b className="block text-[13px] font-extrabold text-muc">{p.name}</b>
                    <span className="mt-1 block text-[12px] text-muc-2">
                      {p.sign.symbol} {p.sign.name} {p.sign.degree.toFixed(1)}°
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-muc-2">
                Hoàng đạo nhiệt đới · hệ thống nhà gần đúng. Vị trí hành tinh tính trực tiếp bằng
                astronomy-engine; giờ và nơi sinh quyết định Cung Mọc, Thiên Đỉnh và các nhà.
              </p>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="p-5 md:p-6">
              <h3 className="font-display text-lg font-extrabold text-muc">Hành tinh</h3>
              <div className="-mx-2 mt-2 overflow-x-auto px-2">
                <table className="w-full min-w-[300px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-muc/15 text-[11px] uppercase tracking-wide text-muc-2">
                      <th scope="col" className="py-2 pr-3 font-bold">Hành tinh</th>
                      <th scope="col" className="py-2 pr-3 font-bold">Cung</th>
                      <th scope="col" className="py-2 pr-3 font-bold">Độ</th>
                      <th scope="col" className="py-2 font-bold">Nhà</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.planets.map((p) => (
                      <PlanetRow key={p.body} p={p} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </div>
      </TextsReveal>

      <TextsReveal className="mt-5 grid gap-5 lg:grid-cols-2" stagger={90}>
        <GlassCard className="ax-stagger-line">
          <div className="p-5 md:p-6">
            <h3 className="font-display text-lg font-extrabold text-muc">12 nhà</h3>
            <div className="-mx-2 mt-2 overflow-x-auto px-2">
              <table className="w-full min-w-[280px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-muc/15 text-[11px] uppercase tracking-wide text-muc-2">
                    <th scope="col" className="py-2 pr-3 font-bold">Nhà</th>
                    <th scope="col" className="py-2 pr-3 font-bold">Cung bắt đầu</th>
                    <th scope="col" className="py-2 font-bold">Độ</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.houses.map((h) => (
                    <tr key={h.number}>
                      <td className="py-2 pr-3 font-bold tabular-nums text-muc">{h.number}</td>
                      <td className="py-2 pr-3 text-muc-2">
                        {h.sign.symbol} {h.sign.name}
                      </td>
                      <td className="py-2 tabular-nums text-muc-2">{h.sign.degree.toFixed(1)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="ax-stagger-line">
          <div className="p-5 md:p-6">
            <h3 className="font-display text-lg font-extrabold text-muc">Góc chiếu chính</h3>
            <div className="-mx-2 mt-2 overflow-x-auto px-2">
              <table className="w-full min-w-[320px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-muc/15 text-[11px] uppercase tracking-wide text-muc-2">
                    <th scope="col" className="py-2 pr-3 font-bold">Hành tinh</th>
                    <th scope="col" className="py-2 pr-3 font-bold">Góc</th>
                    <th scope="col" className="py-2 pr-3 font-bold">Hành tinh</th>
                    <th scope="col" className="py-2 font-bold">Khoảng cách</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.aspects.map((a, i) => (
                    <tr key={`${a.a}-${a.b}-${i}`}>
                      <td className="py-2 pr-3 text-muc">{a.a}</td>
                      <td className="py-2 pr-3">
                        <Chip
                          tone={a.aspect === "Đối đỉnh" ? "son" : a.aspect === "Vuông" ? "cham" : "ngoc"}
                        >
                          {a.aspect}
                        </Chip>
                      </td>
                      <td className="py-2 pr-3 text-muc">{a.b}</td>
                      <td className="py-2 tabular-nums text-muc-2">{a.angle}°</td>
                    </tr>
                  ))}
                  {chart.aspects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-3 text-muc-2">
                        Chưa có góc chiếu trong orb đang dùng.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>
      </TextsReveal>

      <p className="mt-4 text-center text-xs leading-relaxed text-muc-2">
        Dữ liệu thiên văn được tính trực tiếp trong trình duyệt; phần diễn giải bằng AI chỉ dùng
        dữ liệu này làm nguồn duy nhất.
      </p>
    </div>
  );
}
