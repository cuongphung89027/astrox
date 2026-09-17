import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tương Hợp — Đối chiếu hai lá số | AstroX",
  description: "Đối chiếu cung hoàng đạo của hai người, xem mức độ tương hợp về tính cách và cảm xúc.",
  openGraph: { title: "Tương Hợp — Đối chiếu hai lá số | AstroX", description: "Đối chiếu cung hoàng đạo của hai người, xem mức độ tương hợp về tính cách và cảm xúc.", images: ["/assets/og/trangchu.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Tương Hợp</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Tương Hợp</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Đối chiếu hai người theo cung hoàng đạo và các yếu tố phụ.</p>
    </section>
  );
}
