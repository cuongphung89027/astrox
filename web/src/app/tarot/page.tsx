import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarot — Trải bài và luận giải bằng AI | AstroX",
  description: "Chọn bộ bài, trải bài Tarot theo nhiều kiểu trải phổ biến và xem luận giải bằng AI dựa trên đúng các lá đã rút.",
  openGraph: { title: "Tarot — Trải bài và luận giải bằng AI | AstroX", description: "Chọn bộ bài, trải bài Tarot theo nhiều kiểu trải phổ biến và xem luận giải bằng AI dựa trên đúng các lá đã rút.", images: ["/assets/og/tarot.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Tarot</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Tarot</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Chọn bộ bài, trải bài và xem luận giải dựa trên đúng các lá đã rút.</p>
    </section>
  );
}
