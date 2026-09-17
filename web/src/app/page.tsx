import Link from "next/link";

/**
 * Trang chủ placeholder — Giai đoạn B1 (glm-qc-engineer) sẽ dựng hero editorial
 * + bento module theo design system Đông Sơn. File này chỉ chốt route + SEO.
 */
const MODULES = [
  { href: "/tuvi", label: "Tử Vi", desc: "Lá số 12 cung · vận trình 2026", color: "text-son" },
  { href: "/hoangdao", label: "Hoàng Đạo", desc: "Cung Mặt Trời · bản đồ sao", color: "text-sen" },
  { href: "/kinhdich", label: "Kinh Dịch", desc: "Mai Hoa Dịch Số · gieo quẻ", color: "text-cham" },
  { href: "/battu", label: "Bát Tự", desc: "Tứ Trụ · Ngũ Hành · Đại Vận", color: "text-ngoc" },
  { href: "/thanso", label: "Thần Số", desc: "Pythagoras · Số Chủ Đạo", color: "text-kim" },
  { href: "/tarot", label: "Tarot", desc: "Trải bài · luận giải AI", color: "text-sen-deep" },
];

export default function Home() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-son">AstroX v5</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
        Mặt trời Đông Sơn,
        <br />
        <span className="text-son">vận trình</span> thời số hoá.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muc-2">
        Bộ lịch mới đang được dựng lại bằng Next.js — liquid glass, họa tiết Việt, motion mượt.
      </p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="glass block rounded-[var(--radius-card)] p-6 transition-transform hover:-translate-y-1"
            >
              <p className={`font-display text-2xl font-extrabold ${m.color}`}>{m.label}</p>
              <p className="mt-1 text-sm text-muc-2">{m.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
