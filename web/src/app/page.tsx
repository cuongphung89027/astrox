"use client";

/**
 * Trang chủ flagship AstroX v5 — "Mặt Trời Đông Sơn".
 *
 * 1. Hero editorial: mặt trời khổng lồ quay cực chậm, H1 display gradient
 *    son→kim, texts-reveal, marquee chủ đề.
 * 2. Bento 6 module (grid 12 cột, kích thước KHÁC NHAU) — glass + motif Việt;
 *    card Kinh Dịch nền chàm đậm là khoảnh khắc tương phản.
 * 3. Marquee 12 con giáp (ảnh /assets/zodiac, có width/height chống CLS).
 * 4. Khoảnh khắc Đông Sơn cuối trang + CTA lặp.
 *
 * Không gọi API nào — chỉ đọc profile local để đổi nhãn CTA.
 */
import { DongSonSun, DrumRing, Lotus, LyCloudDivider } from "@/components/kit/motifs";
import { Btn, Chip, GlassCard, ModuleLockBadge, SectionTitle } from "@/components/kit";
import { CardTilt, NumberPopIn, ShimmerText, TextsReveal } from "@/components/motion";
import { useProfile } from "@/lib/use-store";
import Link from "next/link";

const TOPICS = ["Tử Vi", "Kinh Dịch", "Hoàng Đạo", "Bát Tự", "Thần Số", "Tarot"];

const ZODIAC = [
  { src: "/assets/zodiac/chuot.png", name: "Tý · Chuột" },
  { src: "/assets/zodiac/trau.png", name: "Sửu · Trâu" },
  { src: "/assets/zodiac/ho.png", name: "Dần · Hổ" },
  { src: "/assets/zodiac/meo.png", name: "Mão · Mèo" },
  { src: "/assets/zodiac/rong.png", name: "Thìn · Rồng" },
  { src: "/assets/zodiac/ran.png", name: "Tỵ · Rắn" },
  { src: "/assets/zodiac/ngua.png", name: "Ngọ · Ngựa" },
  { src: "/assets/zodiac/de.png", name: "Mùi · Dê" },
  { src: "/assets/zodiac/khi.png", name: "Thân · Khỉ" },
  { src: "/assets/zodiac/ga.png", name: "Dậu · Gà" },
  { src: "/assets/zodiac/cho.png", name: "Tuất · Chó" },
  { src: "/assets/zodiac/lon.png", name: "Hợi · Lợn" },
];

/* Mũi tên → chạy nhẹ khi hover card. */
function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`size-4 transition-transform duration-200 group-hover:translate-x-1 ${className ?? ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 10h12m0 0-4.5-4.5M15.5 10 11 14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Vòng xoáy sóng Kinh Dịch — 3 dải sin trắng mờ dần. */
function ContrastWaves() {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-16 w-full">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M0 ${28 + i * 12} Q 20 ${12 + i * 12} 40 ${28 + i * 12} T 80 ${28 + i * 12} T 120 ${28 + i * 12} T 160 ${28 + i * 12} T 200 ${28 + i * 12} T 240 ${28 + i * 12}`}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          opacity={[0.3, 0.16, 0.08][i]}
        />
      ))}
    </svg>
  );
}

/* Âm dương nhỏ — vẽ thuần path. */
function YinYang({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#fff" />
      <path d="M16 1a15 15 0 0 1 0 30 7.5 7.5 0 0 1 0-15 7.5 7.5 0 0 0 0-15Z" fill="var(--color-cham)" />
      <circle cx="16" cy="8.5" r="2.3" fill="var(--color-cham)" />
      <circle cx="16" cy="23.5" r="2.3" fill="#fff" />
    </svg>
  );
}

/* Ngôi sao Hoàng Đạo nhỏ. */
function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.1 6.9 18.8l1-5.6-4.1-4 5.7-.8L12 3.2Z" />
    </svg>
  );
}

/* Bốn trụ Bát Tự đứng trên nền đất. */
function FourPillars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 74" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={6} strokeLinecap="round" opacity={0.4}>
        <path d="M10 16v42M30 8v50M50 22v36M70 12v46" />
        <path d="M6 66h68" strokeWidth={5} />
      </g>
    </svg>
  );
}

/* Thẻ bài Tarot mini xoay nghiêng. */
function MiniTarotCard({ className, rotate }: { className?: string; rotate: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute flex size-[62px] flex-col items-center justify-center gap-1 rounded-xl bg-white shadow-[0_10px_26px_-10px_rgba(224,77,134,0.55)] ring-1 ring-sen/30 ${rotate} ${className ?? ""}`}
    >
      <StarGlyph className="size-7 text-sen-deep" />
      <span className="block h-[2px] w-7 rounded-full bg-sen-tint" />
    </div>
  );
}

export default function Home() {
  const profile = useProfile();
  const heroCta = profile ? `Xem lá số của ${profile.name}` : "Lập lá số miễn phí";

  return (
    <>
      {/* ============================== HERO ============================== */}
      <section className="relative overflow-hidden">
        {/* Mặt trời khổng lồ mờ, quay rất chậm phía sau */}
        <DongSonSun
          size={860}
          className="ax-spin-slow pointer-events-none absolute select-none text-son/[0.13]"
          style={{ right: -270, top: -310, ["--sun-spin-dur" as string]: "150s" }}
        />
        <DongSonSun
          size={260}
          className="ax-spin-slow pointer-events-none absolute select-none text-kim/25"
          style={{ left: -70, bottom: 60, ["--sun-spin-dur" as string]: "95s" }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-14 md:pb-20 md:pt-24">
          <TextsReveal className="max-w-3xl" stagger={90}>
            <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-son-deep">
              <DongSonSun size={14} className="text-son" />
              Tử vi công nghệ kiểu Việt
            </p>

            <h1 className="pt-6 font-display text-[clamp(2.9rem,7.6vw,6.2rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-muc">
              Vận trình của bạn,
              <br />
              rọi bằng{" "}
              <span className="bg-gradient-to-r from-son via-son-deep to-kim bg-clip-text text-transparent">
                ánh sáng nghìn năm
              </span>
              .
            </h1>

            <p className="max-w-xl pt-6 text-base leading-relaxed text-muc-2 md:text-lg">
              Sáu công cụ huyền học — Tử Vi, Kinh Dịch, Hoàng Đạo, Bát Tự, Thần Số, Tarot — trong một
              lớp liquid glass tươi sáng, nhanh và dễ đồng hành.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-9">
              <Btn href="/tuvi" size="lg" variant="primary" arrow>
                {heroCta}
              </Btn>
              <Btn href="/kinhdich" size="lg" variant="ghost">
                Gieo một quẻ
              </Btn>
            </div>
          </TextsReveal>
        </div>

        {/* Marquee chủ đề kết hero */}
        <div className="ax-marquee relative border-y border-kim/30 bg-white/35 py-3.5 backdrop-blur-sm">
          <p className="sr-only">Các chủ đề của AstroX: Tử Vi, Kinh Dịch, Hoàng Đạo, Bát Tự, Thần Số, Tarot.</p>
          <div className="ax-marquee-track" aria-hidden="true" style={{ ["--marquee-dur" as string]: "30s" }}>
            {[0, 1].map((half) => (
              <ul key={half} className="flex shrink-0 items-center">
                {TOPICS.map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-7 pr-7 font-display text-[13px] font-extrabold uppercase tracking-[0.34em] text-muc-2/90"
                  >
                    {t}
                    <DongSonSun size={13} className="text-kim-deep/70" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ BENTO MODULE ============================ */}
      <section id="modules" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 md:py-24">
        <SectionTitle
          eyebrow="Sáu cánh cửa"
          title="Chọn cánh cửa của bạn"
          sub="Mỗi cánh cửa là một cách soi vận trình — bước vào một cánh, hay đi hết hành trình."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          {/* — Tử Vi: card lớn nhất 2×2, tone son — */}
          <CardTilt className="md:col-span-2 lg:col-span-6 lg:row-span-2">
            <GlassCard href="/tuvi" className="group flex h-full min-h-[380px] flex-col overflow-hidden p-6 md:p-8">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-son-tint/85 via-white/0 to-kim-tint/80" />
              <DongSonSun
                size={300}
                className="ax-spin-slow absolute -right-16 -top-16 text-son/20"
                style={{ ["--sun-spin-dur" as string]: "90s" }}
              />
              <Lotus size={110} className="absolute -bottom-2 right-8 text-sen/35" />

              <div className="relative z-10 mt-auto flex flex-col">
                <div className="flex items-center gap-2.5">
                  <Chip tone="son">Flagship</Chip>
                  <ModuleLockBadge />
                </div>
                <h3 className="pt-4 font-display text-3xl font-extrabold tracking-tight text-muc md:text-4xl">
                  <ShimmerText text="Tử Vi" className="ax-shimmer-hover" />
                </h3>
                <p className="max-w-sm pt-2.5 text-[15px] leading-relaxed text-muc-2">
                  Lá số 12 cung, đại vận và lưu niên 2026 — bản đồ cuộc đời vẽ bằng mây và sen.
                </p>
                <span className="inline-flex items-center gap-2 pt-5 text-sm font-extrabold text-son-deep">
                  Khám phá Tử Vi
                  <Arrow />
                </span>
              </div>
            </GlassCard>
          </CardTilt>

          {/* — Hoàng Đạo: 1×2 phải trên, tone sen — */}
          <CardTilt className="lg:col-span-6">
            <GlassCard href="/hoangdao" className="group flex h-full min-h-[210px] flex-col overflow-hidden p-6 md:p-7">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-sen-tint/85 via-white/0 to-white/10" />
              <DrumRing size={128} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-sen/60 sm:block">
                <img src="/assets/zodiac/rong.png" alt="" width={54} height={54} loading="lazy" decoding="async" className="size-[54px] object-contain" />
              </DrumRing>
              <img src="/assets/zodiac/meo.png" alt="" width={44} height={44} loading="lazy" decoding="async" className="absolute bottom-4 right-40 size-11 rotate-[-10deg] opacity-70" />
              <img src="/assets/zodiac/ga.png" alt="" width={38} height={38} loading="lazy" decoding="async" className="absolute right-56 top-6 size-9 rotate-[14deg] opacity-60" />

              <div className="relative z-10 mt-auto flex max-w-[62%] flex-col max-md:max-w-full">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-muc">
                    <ShimmerText text="Hoàng Đạo" className="ax-shimmer-hover" />
                  </h3>
                  <ModuleLockBadge />
                </div>
                <p className="pt-2 text-sm leading-relaxed text-muc-2">
                  Cung hoàng đạo trong khung trống đồng — dự báo mỗi ngày, đúng hợp mỗi cặp.
                </p>
                <span className="inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-sen-deep">
                  Xem cung của bạn
                  <Arrow />
                </span>
              </div>
            </GlassCard>
          </CardTilt>

          {/* — Kinh Dịch: nền chàm ĐẬM, text sáng — khoảnh khắc tương phản.
              Tự dựng Link thay vì GlassCard vì .glass (unlayered) thắng bg-*. — */}
          <CardTilt className="lg:col-span-6">
            <Link
              href="/kinhdich"
              className="group relative flex h-full min-h-[210px] flex-col overflow-hidden rounded-[var(--radius-card)] bg-cham p-6 text-white shadow-[0_22px_52px_-18px_rgba(28,37,96,0.62)] md:p-7"
            >
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-cham to-cham-deep" />
              <YinYang className="absolute right-6 top-6 size-14 opacity-95" />
              <ContrastWaves />

              <div className="relative z-10 mt-auto flex flex-col">
                <h3 className="font-display text-2xl font-extrabold tracking-tight">
                  <ShimmerText
                    text="Kinh Dịch"
                    className="ax-shimmer-hover"
                    style={{ ["--shimmer-base" as string]: "#ffffff", ["--shimmer-highlight" as string]: "var(--color-kim)" }}
                  />
                </h3>
                <p className="max-w-xs pt-2 text-sm leading-relaxed text-white/75">
                  Gieo một quẻ khi phân vân — âm dương xoay vần, lời quẻ gọn như một phép màu.
                </p>
                <span className="inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-kim">
                  Gieo quẻ ngay
                  <Arrow />
                </span>
              </div>
            </Link>
          </CardTilt>

          {/* — Bát Tự: 1×1, tone ngọc — */}
          <CardTilt className="lg:col-span-4">
            <GlassCard href="/battu" className="group flex h-full min-h-[210px] flex-col overflow-hidden p-6">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-ngoc-tint/80 via-white/0 to-white/20" />
              <FourPillars className="absolute bottom-4 right-4 h-20 w-24 text-ngoc-deep" />

              <div className="relative z-10 mt-auto flex flex-col">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-muc">
                    <ShimmerText text="Bát Tự" className="ax-shimmer-hover" />
                  </h3>
                  <ModuleLockBadge />
                </div>
                <p className="pt-2 text-sm leading-relaxed text-muc-2">
                  Bốn trụ năm–tháng–ngày–giờ: bản đồ ngũ hành giờ khắc bạn sinh ra.
                </p>
                <span className="inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-ngoc-deep">
                  Giải tứ trụ
                  <Arrow />
                </span>
              </div>
            </GlassCard>
          </CardTilt>

          {/* — Thần Số: 1×1, tone kim, số to number-pop-in — */}
          <CardTilt className="lg:col-span-4">
            <GlassCard href="/thanso" className="group flex h-full min-h-[210px] flex-col overflow-hidden p-6">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-kim-tint/85 via-white/0 to-white/10" />
              <div className="absolute -top-3 right-4 select-none" aria-hidden="true">
                <NumberPopIn value={7} className="font-display text-[92px] font-extrabold leading-none text-kim-deep/80" />
              </div>

              <div className="relative z-10 mt-auto flex flex-col">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight text-muc">
                    <ShimmerText text="Thần Số" className="ax-shimmer-hover" />
                  </h3>
                  <ModuleLockBadge />
                </div>
                <p className="pt-2 text-sm leading-relaxed text-muc-2">
                  Chữ số trong ngày sinh tiết lộ số chủ đạo và vòng năm của bạn.
                </p>
                <span className="inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-kim-deep">
                  Tìm số chủ đạo
                  <Arrow />
                </span>
              </div>
            </GlassCard>
          </CardTilt>

          {/* — Tarot: 1×1, tone sen đậm — */}
          <CardTilt className="lg:col-span-4">
            <GlassCard href="/tarot" className="group flex h-full min-h-[210px] flex-col overflow-hidden p-6">
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-sen-tint/85 via-white/0 to-white/15" />
              <MiniTarotCard rotate="rotate-[9deg]" className="right-8 top-6" />
              <MiniTarotCard rotate="-rotate-[7deg]" className="right-24 top-12 opacity-80" />

              <div className="relative z-10 mt-auto flex flex-col">
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-muc">
                  <ShimmerText text="Tarot" className="ax-shimmer-hover" />
                </h3>
                <p className="pt-2 text-sm leading-relaxed text-muc-2">
                  Rút một lá mỗi ngày — câu trả lời gói gọn trong một tấm lời ngỏ.
                </p>
                <span className="inline-flex items-center gap-2 pt-4 text-sm font-extrabold text-sen-deep">
                  Rút một lá
                  <Arrow />
                </span>
              </div>
            </GlassCard>
          </CardTilt>
        </div>
      </section>

      {/* ========================= MARQUEE 12 CON GIÁP ========================= */}
      <section aria-label="Mười hai con giáp" className="overflow-hidden py-12 md:py-16">
        <SectionTitle
          align="center"
          eyebrow="Xoay vần thập nhị chi"
          title="Mười hai con giáp cùng lướt"
          sub="Điểm danh đủ bộ trường sinh — chạm vào con giáp của bạn ở mục Hoàng Đạo."
        />
        <div className="ax-marquee relative mt-10">
          <div className="ax-marquee-track is-reverse" style={{ ["--marquee-dur" as string]: "58s" }}>
            {[0, 1].map((half) => (
              <ul key={half} aria-hidden={half === 1} className="flex shrink-0 items-center gap-3 pl-3">
                {ZODIAC.map((z) => (
                  <li key={`${half}-${z.name}`} className="w-[108px] shrink-0">
                    <figure className="group/z flex flex-col items-center gap-2">
                      <span className="grid size-[86px] place-items-center rounded-3xl bg-white/55 ring-1 ring-white/70 backdrop-blur-sm transition-transform duration-300 ease-[var(--ease-viet)] group-hover/z:-translate-y-1.5 group-hover/z:scale-110">
                        <img
                          src={z.src}
                          alt={half === 0 ? z.name : ""}
                          width={66}
                          height={66}
                          loading="lazy"
                          decoding="async"
                          className="size-[66px] object-contain"
                        />
                      </span>
                      <figcaption className="text-[11px] font-bold uppercase tracking-[0.08em] text-muc-2">
                        {z.name}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            ))}
          </div>
          {/* Chùm mờ hai biên */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-kem to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-kem to-transparent" />
        </div>
      </section>

      {/* ======================= KHOẢNH KHẮC ĐÔNG SƠN ======================= */}
      <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 text-center md:pb-32">
        <div className="relative mx-auto w-fit">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-kim/25 blur-3xl" />
          <DongSonSun
            size={172}
            label="Mặt trời Đông Sơn"
            className="ax-spin-slow text-son"
            style={{ ["--sun-spin-dur" as string]: "80s" }}
          />
        </div>

        <TextsReveal className="mx-auto mt-10 max-w-2xl" stagger={90}>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-muc md:text-5xl">
            Thấu vận trình
            <br />
            bằng ánh mắt nghìn năm
          </h2>
          <p className="pt-4 leading-relaxed text-muc-2">
            Có một mặt trời đã sáng từ thời trống đồng — hôm nay nó soi vào lá số của bạn.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-8">
            <Btn href="/tuvi" size="lg" variant="primary" arrow>
              {heroCta}
            </Btn>
            <Btn href="#modules" size="lg" variant="ghost">
              Khám phá 6 công cụ
            </Btn>
          </div>
        </TextsReveal>

        <LyCloudDivider height={28} className="mx-auto mt-16 max-w-xl text-kim/50" />
      </section>
    </>
  );
}
