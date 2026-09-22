"use client";

/**
 * Hero trang chủ — video "Mặt Trời Đông Sơn" full-bleed (v6.3).
 *
 * - Video chạy dưới glass topbar (header fixed trong AppShell), chiếm trọn
 *   100svh; phát ĐÚNG MỘT LẦN rồi giữ frame cuối (mặt trời sáng rực).
 * - Giảm chuyển động theo setting thiết bị (prefers-reduced-motion): video
 *   seek thẳng frame cuối; CSS animation đã tắt toàn cục bởi globals.css.
 * - Title: "AstroX" kem cố định + từ module xoay vòng MÀU KIM (Tử Vi →
 *   Kinh Dịch → Cung Hoàng Đạo → Thần Số Học → Tarot → All in one.) theo
 *   kiểu flip 3D từng ký tự: từ cũ lật lên (stagger trái→phải), từ mới lật
 *   xuống (stagger phải→trái) — hai lượt tách bạch hoàn toàn, không bao giờ
 *   đè nhau giữa dòng; chu kỳ 2.6s.
 * - 2 CTA: Đăng nhập → zaloLogin / Khám phá → #modules. Nhãn theo hồ sơ chỉ
 *   đổi sau mount (chống hydration mismatch).
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TextsReveal } from "@/components/motion";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/use-store";

const HERO_WORDS = ["Tử Vi", "Kinh Dịch", "Cung Hoàng Đạo", "Thần Số Học", "Tarot", "All in one."];
const WORD_HOLD_MS = 2600;
/* Chu kỳ quay conic wash — phải khớp duration `ax-word-orbit` trong globals.css */
const WASH_MS = 8000;
/* Pha thoát: ký tự lật 0.45s, stagger 32ms → từ dài nhất (Cung Hoàng Đạo /
   Thần Số Học / All in one., ~11–13 ký tự) cần 450 + 12×32 ≈ 834ms để lật
   xong trước khi từ mới vào. */
const WORD_EXIT_MS = 860;

export function HeroVideo() {
  const { loggedIn, zaloLogin } = useAuth();
  const profile = useProfile();
  const [mounted, setMounted] = useState(false);
  const [showCue, setShowCue] = useState(true);
  const [{ idx, leaving }, setRot] = useState<{ idx: number; leaving: number | null }>({
    idx: 0,
    leaving: null,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  /* Cue chỉ hiện khi còn ở đỉnh hero — khi cuộn sang #modules, cue tuyệt đối
     ở đáy hero sẽ lọt vào vùng topbar fixed nếu scroll-margin chừa chỗ. */
  useEffect(() => {
    const onScroll = () => setShowCue(window.scrollY < 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Vòng xoay 2 pha: giữ từ hiện tại → đánh dấu leaving (animate ra) → đổi từ
     mới (cascade từng ký tự). Timeout con được clear khi unmount. */
  useEffect(() => {
    const id = setInterval(() => {
      setRot(({ idx }) => ({ idx, leaving: idx }));
      exitTimer.current = setTimeout(() => {
        setRot(({ idx }) => ({ idx: (idx + 1) % HERO_WORDS.length, leaving: null }));
      }, WORD_EXIT_MS);
    }, WORD_HOLD_MS);
    return () => {
      clearInterval(id);
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  /* Phát một lần / đứng ở frame cuối — quyết định sau mount, không đụng SSR. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const seekEnd = () => {
        try {
          v.currentTime = v.duration || 10;
        } catch {
          /* metadata chưa sẵn — giữ poster (chính là frame cuối) */
        }
      };
      v.readyState >= 1 ? seekEnd() : v.addEventListener("loadedmetadata", seekEnd, { once: true });
      return;
    }
    v.play().catch(() => {
      /* autoplay bị chặn (low-power) — poster frame cuối hiện thay */
    });
  }, []);

  const hasProfile = mounted && profile;

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-muc">
      {/* Video mới (thử) — nguyên bản, không zoom/dịch, scrim chuẩn đơn giản */}
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        src="/assets/video/hero-v2.mp4"
        poster="/assets/video/hero-v2-poster.jpg"
        muted
        playsInline
        preload="auto"
        autoPlay
        aria-hidden="true"
        onEnded={(e) => e.currentTarget.pause()}
      />

      {/* Scrim chuẩn cho text đọc được trên nền sáng + tấm mực mỏng ngay
          sau khối text để từ xoay MÀU KIM luôn tách khỏi vạch sáng của
          video (kể cả frame logo trên nền kem ở cuối clip) */}
      <div aria-hidden="true" className="absolute inset-0 bg-muc/20" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-muc/90 via-muc/32 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[46svh] bg-gradient-to-t from-muc/72 via-muc/24 to-transparent"
      />

      {/* Text: trước khi hết viewport một quãng — không dính đáy */}
      <div className="absolute inset-0 flex items-end">
        <div className="mx-auto w-full max-w-6xl px-5 pb-[max(18svh,7.5rem)] md:px-6 md:pb-[min(15svh,7.5rem)]">
          <TextsReveal stagger={150} className="max-w-3xl">
            <h1 className="font-display text-[clamp(2.5rem,5.2vw,4.1rem)] font-black leading-[1.06] tracking-[-0.01em] text-kem">
              AstroX
              <span className="sr-only">
                {" "}
                — Tử Vi, Kinh Dịch, Cung Hoàng Đạo, Thần Số Học, Tarot — All in one.
              </span>
              <span className="ax-hero-word mt-1.5 block pb-1" aria-hidden="true">
                {/* Một từ duy nhất chiếm dòng — hai pha tuần tự, không bao giờ
                    chồng nhau:
                    · leaving === null  → pha VÀO: ký tự lật xuống từ trần
                      dòng, stagger phải→trái (gợn sóng ngược lượt thoát).
                    · leaving === idx   → pha THOÁT: ký tự lật lên quanh đáy
                      dòng, stagger trái→phải. */}
                <em
                  key={`${idx}-${leaving === idx ? "out" : "in"}`}
                  className="block font-normal italic"
                >
                  {Array.from(HERO_WORDS[idx]).map((ch, i, arr) => {
                    const flipDelay = (leaving === idx ? i : arr.length - 1 - i) * 32;
                    /* Wash lệch pha theo vị trí ký tự (mỗi chữ một sắc) VÀ bám
                       giờ toàn cục: khi đổi từ, em remount nhưng animation bắt
                       đầu đúng pha đang dở → conic quay liền mạch, không giật.
                       mounted guard để tránh lệch hydration ở lần render đầu. */
                    const washPhase = mounted ? performance.now() % WASH_MS : 0;
                    const washDelay = -((i / arr.length) * WASH_MS + washPhase);
                    return (
                      <span
                        key={i}
                        className={`ax-word-wash ${leaving === idx ? "ax-word-char-out" : "ax-word-char-in"}`}
                        style={{
                          animationDelay: `${flipDelay}ms, ${washDelay}ms`,
                        }}
                      >
                        {ch === " " ? "\u00A0" : ch}
                      </span>
                    );
                  })}
                </em>
              </span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-8">
              {loggedIn ? (
                <Link
                  href="/tuvi"
                  className="inline-flex items-center justify-center rounded-full bg-son px-6 py-3 text-base font-semibold text-white shadow-[var(--shadow-pop)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {hasProfile ? `Vào lá số của ${profile.name}` : "Vào AstroX"}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={zaloLogin}
                  className="inline-flex items-center justify-center rounded-full bg-son px-6 py-3 text-base font-semibold text-white shadow-[var(--shadow-pop)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Đăng nhập
                </button>
              )}
              <a
                href="#modules"
                className="inline-flex items-center justify-center rounded-full bg-white/85 px-6 py-3 text-base font-semibold text-muc ring-1 ring-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
              >
                Khám phá
              </a>
            </div>
          </TextsReveal>
        </div>
      </div>

      {/* Mời cuộn — nhỏ, giữa đáy, chỉ desktop (mobile đã có bottom dock) */}
      <a
        href="#modules"
        aria-label="Tìm hiểu thêm — cuộn xuống phần khám phá"
        className={`group absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2.5 text-kem/70 transition-[opacity,colors] duration-300 hover:text-kem lg:flex ${
          showCue ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.32em]">Tìm hiểu thêm</span>
        <span className="ax-scroll-cue-line" aria-hidden="true" />
      </a>
    </section>
  );
}
