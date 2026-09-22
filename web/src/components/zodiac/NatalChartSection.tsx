"use client";

/**
 * NatalChartSection — bản đồ sao chi tiết (chế độ riêng truy cập từ hub):
 * tính trực tiếp bằng astronomy-engine (port buildNatalChart), hiển thị
 * SVG vòng hoàng đạo 360° với 12 cung, 12 nhà, glyph hành tinh theo kinh độ,
 * đường góc chiếu nối giữa các hành tinh; kèm bảng hành tinh / 12 nhà /
 * góc chiếu. Vị trí giữ đúng phép chiếu cũ: natalPointAngle = 270 − kinh độ.
 */
import { Chip, GlassCard } from "@/components/kit";
import styles from "./Zodiac.module.css";
import { AspectMatrix } from "./AspectMatrix";
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
  "Vuông": "#819578",
  "Đối đỉnh": "#ad9670",
};

function aspectColor(name: string): string {
  return ASPECT_COLOR[name] || "var(--color-muc-2)";
}

function NatalWheelSvg({ chart }: { chart: NatalChart }) {
  const natalPointAngle = (deg: number) => normDeg(180 + chart.points.ascendant.longitude - deg);
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
      <circle cx={C} cy={C} r={R_SIGN_OUT + 9} fill="none" stroke="#c2b17e" strokeOpacity={0.5} strokeWidth={1.6} strokeDasharray="0.5 7" />
      <circle cx={C} cy={C} r={R_SIGN_OUT} fill="#819578" fillOpacity={0.05} stroke="#819578" strokeOpacity={0.35} strokeWidth={1.5} />
      <circle cx={C} cy={C} r={R_SIGN_IN} fill="var(--color-kem)" stroke="#819578" strokeOpacity={0.35} strokeWidth={1.2} />
      <circle cx={C} cy={C} r={R_HOUSE_IN} fill="#466b52" fillOpacity={0.05} stroke="#819578" strokeOpacity={0.3} strokeWidth={1} />

      {Array.from({length:72},(_,i)=>{
        const angle=natalPointAngle(i*5);
        const [x1,y1]=polar(C,C,R_SIGN_IN,angle);
        const [x2,y2]=polar(C,C,R_SIGN_IN-(i%6===0?8:3),angle);
        return <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#869779" strokeWidth={.6} />;
      })}
      {/* 12 cung: vạch chia + glyph */}
      {ZODIAC_SIGNS.map((s, i) => {
        const cuspAngle = natalPointAngle(i * 30);
        const [x1, y1] = polar(C, C, R_SIGN_OUT, cuspAngle);
        const [x2, y2] = polar(C, C, R_SIGN_IN, cuspAngle);
        const [gx, gy] = polar(C, C, (R_SIGN_OUT + R_SIGN_IN) / 2, natalPointAngle(i * 30 + 15));
        return (
          <g key={s.id}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#819578" strokeOpacity={0.35} strokeWidth={1.2} />
            <text x={gx} y={gy + 7} textAnchor="middle" fontSize={19} fill="#819578" fontWeight={600}>
              {s.symbol.replace(/\uFE0F/g, "")}&#xfe0e;
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
        const [nx, ny] = polar(C, C, (R_HOUSE_OUT + R_HOUSE_IN) / 2, natalPointAngle(h.longitude + normDeg(chart.houses[h.number % 12].longitude - h.longitude) / 2));
        return (
          <g key={h.number}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#819578" strokeOpacity={0.3} strokeWidth={1} />
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
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ad9670" strokeWidth={2} />
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#335b45">
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
            <text x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill="#335b45">
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
  exactTime?: boolean;
  className?: string;
}

export function NatalChartSection({ chart, hasProfile, className, exactTime }: NatalChartSectionProps) {
  if (!hasProfile || !chart) {
    return (
      <GlassCard className={className}>
        <div className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-muc-2">
            {hasProfile ? "Chưa xác định được tọa độ nơi sinh. Hãy kiểm tra nơi sinh trong hồ sơ; AstroX không tự thay bằng một địa điểm khác." : "Bổ sung ngày, giờ và nơi sinh trong hồ sơ để lập bản đồ sao."}
          </p>
        </div>
      </GlassCard>
    );
  }

  const big3 = [chart.big3.sun, chart.big3.moon, chart.big3.ascendant];

  return <div className={`${styles.chartLayout} ${className || ""}`}>
    <section className={styles.skyMap}>
      <header><span>{exactTime ? "BẦU TRỜI LÚC BẠN SINH" : "BẢN ĐỒ ƯỚC TÍNH THEO KHUNG GIỜ"}</span><h2>Dấu ấn thiên thể</h2></header>
      <NatalWheelSvg chart={chart} />
      <div className={styles.mapLegend}><span>● Hài hòa</span><span>○ Thử thách</span></div>
    </section>
    <AspectMatrix chart={chart} />
    <div className={styles.chartSidebar}>
      <div className={styles.bigThree}>{big3.map((p,i)=><div key={p.name}><span>{["Mặt Trời","Mặt Trăng","Cung Mọc"][i]}</span><strong>{p.sign.name}</strong><small>{p.sign.degree.toFixed(1)}°</small></div>)}</div>
      <div className={styles.chartNote}><strong>Hoàng đạo nhiệt đới · Hệ nhà Placidus</strong><p>{exactTime ? "Dùng giờ sinh đến phút." : "Chưa có giờ chính xác: đang dùng giữa khung giờ sinh."} Múi giờ UTC+7.</p><p>Tọa độ: {chart.latitude.toFixed(4)}° Bắc, {chart.longitude.toFixed(4)}° Đông · {chart.place}</p></div>
      <details className={styles.chartDisclosure} open><summary>Hành tinh <span>{chart.planets.length}</span></summary><div className={styles.planetList}>{chart.planets.map(p=><div key={p.body}><span>{p.name}</span><strong>{p.sign.name}<small>{p.sign.degree.toFixed(1)}° · Nhà {p.house}</small></strong></div>)}</div></details>
      <details className={styles.chartDisclosure}><summary>Mười hai nhà <span>12</span></summary><div className={styles.houseList}>{chart.houses.map(h=><div key={h.number}><span>{String(h.number).padStart(2,"0")}</span><strong>{h.sign.name}<small>{h.sign.degree.toFixed(1)}°</small></strong></div>)}</div></details>
      <details className={styles.chartDisclosure}><summary>Góc chiếu <span>{chart.aspects.length}</span></summary><div className={styles.aspectList}>{chart.aspects.map((a,i)=><div key={i}><strong>{a.a} <span>↔</span> {a.b}</strong><small>{a.aspect} · {a.angle}°</small></div>)}{!chart.aspects.length && <p>Chưa có góc chiếu trong phạm vi đang xét.</p>}</div></details>
    </div>
  </div>;
}
