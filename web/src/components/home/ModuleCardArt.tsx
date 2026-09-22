"use client";

/**
 * ModuleCardArt v4 — composition "oracle card": MỘT trục dọc giữa cho cả card.
 *
 * Quy tắc bố cục (không phải trang trí rải):
 *  1. Motif hero ở tâm vùng trên — đường kính ĐỒNG NHẤT cả 6 card (tính nhất
 *     quán khi lật qua lại), canh giữa tuyệt đối.
 *  2. Không sticker rời (mây/sếu/tre/sen/sao bay) — mọi thứ thuộc về hệ motif
 *     tròn hoặc hệ trụ canh giữa.
 *  3. Số La Mã + vạch ngang ở đỉnh, khối title ở đáy — do ModuleStack dựng.
 */

export const TEAL = "#175e54";
export const GOLD = "#c9973f";
export const KEM = "#f6f1e3";
export const INDIGO = "#1c2e4a";

/* Vùng motif: canh giữa tuyệt đối, kích thước chuẩn chung */
function Zone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 top-[10%] h-[48%] ${dark ? "ax-art-dark" : ""}`}
    >
      {children}
    </div>
  );
}

function Motif({ children }: { children: React.ReactNode }) {
  return (
    <div className="ax-motif flex h-full items-center justify-center">
      <div className="relative aspect-square h-full">{children}</div>
    </div>
  );
}

/* hào quang sau motif */
function Halo({ tone = "gold" }: { tone?: "gold" | "cream" }) {
  const bg =
    tone === "gold"
      ? "radial-gradient(circle,rgba(201,151,63,0.20)_0%,rgba(201,151,63,0.05)_56%,transparent_75%)"
      : "radial-gradient(circle,rgba(253,249,239,0.16)_0%,rgba(253,249,239,0.04)_56%,transparent_75%)";
  return (
    <div
      className="absolute left-1/2 top-1/2 aspect-square w-[94%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: bg }}
    />
  );
}

/* vòng ngoài: 1 nét mảnh + 1 vòng vạch chia — KHUNG chuẩn cho mọi motif tròn */
function OrbitRing({ className, tone = "gold" }: { className?: string; tone?: "gold" | "cream" }) {
  const stroke = tone === "gold" ? GOLD : "rgba(246,241,227,0.6)";
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="90" fill="none" stroke={stroke} strokeWidth="1" opacity=".75" />
      <circle cx="100" cy="100" r="78" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 9.7" opacity=".45" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  I. Tử Vi — mặt trời Đông Sơn tâm + 12 con giáp trên vòng          */
/* ------------------------------------------------------------------ */
export function ArtTuVi() {
  const SLUGS = ["chuot", "trau", "ho", "meo", "rong", "ran", "ngua", "de", "khi", "ga", "cho", "lon"];
  return (
    <Zone>
      <Motif>
        <Halo />
        <OrbitRing className="absolute inset-0" />
        <img
          src="/assets/modules/el/sun.png"
          alt=""
          className="absolute inset-0 m-auto w-[44%] drop-shadow-[0_8px_20px_rgba(201,151,63,0.35)]"
          draggable={false}
        />
        {SLUGS.map((s, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          const r = 46;
          return (
            <span
              key={s}
              className="absolute grid size-[10%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fdf9ef] shadow-[0_2px_6px_rgba(38,25,15,0.10)] ring-1 ring-[#c9973f]/55"
              style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
            >
              <span
                className="block size-[60%] bg-[#b8860f]"
                style={{
                  maskImage: `url(/assets/zodiac/${s}.png)`,
                  WebkitMaskImage: `url(/assets/zodiac/${s}.png)`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                }}
              />
            </span>
          );
        })}
      </Motif>
    </Zone>
  );
}

/* ------------------------------------------------------------------ */
/*  II. Cung Hoàng Đạo — trăng tâm + 12 symbol line-art tự vẽ          */
/* ------------------------------------------------------------------ */

/* 12 symbol cung hoàng đạo vẽ bằng SVG stroke — không phụ thuộc font hệ
   thống (glyph Unicode render mảnh, lệch nhau giữa các ký tự). ViewBox 24,
   stroke 1.7, bo đầu nét — đồng nhất cả 12. */
const ZODIAC_SIGNS: { name: string; paths: string[] }[] = [
  { name: "Bạch Dương", paths: ["M12 5.5C7.5 5.5 5 8.5 5 12.5", "M12 5.5c4.5 0 7 3 7 7"] },
  { name: "Kim Ngưu", paths: ["M12 20.5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", "M7.2 8.2C6 5 7.4 2.8 9.8 2.2", "M16.8 8.2c1.2-3.2-.2-5.4-2.6-6"] },
  { name: "Song Tử", paths: ["M8.6 5.5v13", "M15.4 5.5v13", "M6 5.5h12", "M6 18.5h12"] },
  { name: "Cự Giải", paths: ["M16.5 6.2a5.3 5.3 0 0 0-5.3 5.3", "M7.5 17.8a5.3 5.3 0 0 1 5.3-5.3"] },
  { name: "Sư Tử", paths: ["M8.2 12.4a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M8.2 12.4c0 4 2 6.4 5.4 6.4 2.5 0 3.7-2 2.3-3.4"] },
  { name: "Xử Nữ", paths: ["M6.4 16.8V7.4", "M6.4 9.4c0-2 1.5-3 3-3s3 1 3 3v7.2", "M12.4 9.4c0-2 1.5-3 3-3s3 1 3 3v4.2c0 2-1.5 3.4-3.4 3.4"] },
  { name: "Thiên Bình", paths: ["M6.5 15.5h11", "M6.5 11.5h11", "M8.3 11.5a3.7 3.7 0 0 1 7.4 0"] },
  { name: "Bọ Cạp", paths: ["M6.4 16.5V8", "M6.4 10c0-2 1.5-3 3-3s3 1 3 3v6.7", "M12.4 10c0-2 1.5-3 3-3s3 1 3 3v4c0 1.9-1.1 3.1-2.7 3.3", "M16.9 17.6l1.5-2.4", "M16.9 17.6l2.7-.5"] },
  { name: "Nhân Mã", paths: ["M5.5 18.5L18.5 5.5", "M12.5 5.5h6v6", "M8.2 12.2l3.6 3.6"] },
  { name: "Ma Kết", paths: ["M5.6 7v8.2c0 2.6 1.7 4.2 3.9 4.2 1.9 0 3.4-1.4 3.4-3.4V9.4", "M12.9 9.4c0 2.9 1.5 4.7 3.9 4.7 1.7 0 2.9-1.1 2.9-2.7 0-1.1-.7-1.9-1.7-1.9-.8 0-1.4.5-1.4 1.3"] },
  { name: "Bảo Bình", paths: ["M4.8 9.2l2.4-2.4 2.4 2.4 2.4-2.4 2.4 2.4 2.4-2.4 2.4 2.4", "M4.8 15.2l2.4-2.4 2.4 2.4 2.4-2.4 2.4 2.4 2.4-2.4 2.4 2.4"] },
  { name: "Song Ngư", paths: ["M7 5c-2 2.6-2 11.4 0 14", "M17 5c2 2.6 2 11.4 0 14", "M7 12h10"] },
];

function ZodiacSymbol({ index, x, y }: { index: number; x: number; y: number }) {
  const sign = ZODIAC_SIGNS[index];
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="10.5" fill="#fdf9ef" stroke={GOLD} strokeWidth="0.8" opacity=".55" />
      <g transform="translate(-7.2 -7.2) scale(0.6)" fill="none" stroke="#b8860f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {sign.paths.map((d, pi) => (
          <path key={pi} d={d} />
        ))}
      </g>
    </g>
  );
}

export function ArtZodiac() {
  return (
    <Zone>
      <Motif>
        <Halo />
        <OrbitRing className="absolute inset-0" />
        <svg viewBox="0 0 200 200" className="absolute inset-0">
          {ZODIAC_SIGNS.map((_, i) => {
            const a = ((-90 + i * 30) * Math.PI) / 180;
            return <ZodiacSymbol key={i} index={i} x={100 + 58 * Math.cos(a)} y={100 + 58 * Math.sin(a)} />;
          })}
        </svg>
        <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto w-[38%] drop-shadow-[0_8px_18px_rgba(232,182,76,0.45)]">
          <path d="M64 8a42 42 0 1 0 0 84A44 44 0 0 1 64 8Z" fill="#e8b64c" />
          <circle cx="70" cy="30" r="2.4" fill={KEM} opacity=".9" />
          <circle cx="60" cy="20" r="1.5" fill={KEM} opacity=".7" />
        </svg>
      </Motif>
    </Zone>
  );
}

/* ------------------------------------------------------------------ */
/*  III. Kinh Dịch — âm dương tâm + 8 quẻ trên vòng (nền chàm)        */
/* ------------------------------------------------------------------ */
export function ArtKinhDich() {
  const TRIGRAMS = [
    [1, 1, 1], [0, 0, 1], [1, 0, 1], [0, 1, 1],
    [0, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 0],
  ];
  return (
    <Zone dark>
      <Motif>
        <Halo tone="cream" />
        <OrbitRing tone="cream" className="absolute inset-0" />
        <svg viewBox="0 0 200 200" className="absolute inset-0">
          {TRIGRAMS.map((bars, i) => {
            const a = i * 45;
            const rad = ((a - 90) * Math.PI) / 180;
            const cx = 100 + 56 * Math.cos(rad);
            const cy = 100 + 56 * Math.sin(rad);
            return (
              <g key={i} transform={`translate(${cx} ${cy}) rotate(${a})`}>
                {bars.map((solid, b) => (
                  <g key={b} transform={`translate(-10 ${-4 + b * 4})`}>
                    {solid ? (
                      <rect width="20" height="2.6" rx="1.3" fill={GOLD} />
                    ) : (
                      <>
                        <rect width="8" height="2.6" rx="1.3" fill={GOLD} />
                        <rect x="12" width="8" height="2.6" rx="1.3" fill={GOLD} />
                      </>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
        <svg viewBox="0 0 32 32" className="absolute inset-0 m-auto w-[28%] drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <circle cx="16" cy="16" r="15" fill={KEM} />
          <path d="M16 1a15 15 0 0 1 0 30 7.5 7.5 0 0 1 0-15A7.5 7.5 0 0 0 16 1Z" fill={INDIGO} />
          <circle cx="16" cy="8.5" r="2.1" fill={INDIGO} />
          <circle cx="16" cy="23.5" r="2.1" fill={KEM} />
        </svg>
      </Motif>
    </Zone>
  );
}

/* ------------------------------------------------------------------ */
/*  IV. Bát Tự — 4 trụ canh giữa trên đế, cân đối tuyệt đối           */
/* ------------------------------------------------------------------ */
export function ArtBattu() {
  return (
    <Zone>
      <Motif>
        <Halo />
        {/* bàn đế + 4 trụ — trục giữa tuyệt đối */}
        <svg viewBox="0 0 200 200" className="absolute inset-0">
          <line x1="18" y1="148" x2="182" y2="148" stroke={GOLD} strokeWidth="1" opacity=".5" />
          <line x1="30" y1="154" x2="170" y2="154" stroke={GOLD} strokeWidth="1" opacity=".3" />
          {["年", "月", "日", "時"].map((ch, i) => {
            const x = [38, 78, 122, 162][i];
            return (
              <g key={ch}>
                <rect x={x - 13} y={54} width="26" height="90" rx="4" fill="#fdf9ef" stroke={GOLD} strokeWidth="1.2" />
                <text x={x} y={102} textAnchor="middle" fontSize="17" fill={TEAL} fontWeight="700" fontFamily="serif">
                  {ch}
                </text>
              </g>
            );
          })}
        </svg>
      </Motif>
    </Zone>
  );
}

/* ------------------------------------------------------------------ */
/*  V. Thần Số Học — 9 số trên vòng, sao 4 cánh tâm                   */
/* ------------------------------------------------------------------ */
export function ArtThanso() {
  return (
    <Zone>
      <Motif>
        <Halo />
        <OrbitRing className="absolute inset-0" />
        {Array.from({ length: 9 }).map((_, i) => {
          const a = ((i * 40 - 90) * Math.PI) / 180;
          const r = 44;
          return (
            <span
              key={i}
              className="absolute grid size-[12%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fdf9ef] font-display text-[3.6cqw] font-bold text-[#b8860f] shadow-[0_2px_6px_rgba(38,25,15,0.10)] ring-1 ring-[#c9973f]/65"
              style={{ left: `${50 + r * Math.cos(a)}%`, top: `${50 + r * Math.sin(a)}%` }}
            >
              {i + 1}
            </span>
          );
        })}
        <div className="absolute inset-0 m-auto grid h-[26%] w-[26%] place-items-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(232,182,76,0.35),transparent_70%)]" />
          <svg viewBox="0 0 24 24" className="relative w-[60%] drop-shadow-[0_4px_10px_rgba(201,151,63,0.4)]">
            <path d="M12 1.5l2.3 8.2 8.2 2.3-8.2 2.3L12 22.5l-2.3-8.2L1.5 12l8.2-2.3L12 1.5Z" fill={GOLD} />
          </svg>
        </div>
      </Motif>
    </Zone>
  );
}

/* ------------------------------------------------------------------ */
/*  VI. Tarot — 3 lá quạt cân đối, lá giữa nổi                         */
/* ------------------------------------------------------------------ */
export function ArtTarot() {
  const CARDS = [
    { rot: -20, x: -38, face: <path d="M24 6a18 18 0 1 0 0 36A20 20 0 0 1 24 6Z" fill="#e8b64c" /> },
    { rot: 0, x: 0, face: <circle cx="24" cy="24" r="9" fill={GOLD} /> },
    { rot: 20, x: 38, face: <path d="M24 8l1.6 5.9L31 15.5l-5.4 1.6L24 23l-1.6-5.9-5.4-1.6 5.4-1.6L24 8Z" fill={GOLD} /> },
  ];
  return (
    <Zone>
      <Motif>
        <Halo />
        {CARDS.map((c, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 aspect-[5/7] w-[38%] rounded-[10%] bg-[#fdf9ef] shadow-[0_14px_28px_-8px_rgba(23,94,84,0.35)] ring-[1.5px] ring-[#c9973f]"
            style={{
              transform: `translate(calc(-50% + ${c.x}%), -50%) rotate(${c.rot}deg)`,
              zIndex: i === 1 ? 2 : 1,
            }}
          >
            <svg viewBox="0 0 48 48" className="absolute inset-0 m-auto w-[52%]">
              {c.face}
            </svg>
            <span className="absolute inset-[7%] rounded-[8%] border border-dashed border-[#c9973f]/40" />
          </div>
        ))}
      </Motif>
    </Zone>
  );
}

/* giữ export tương thích import cũ */
export function ChipIco() {
  return null;
}
