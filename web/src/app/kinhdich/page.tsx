import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kinh Dịch — Gieo quẻ và luận giải bằng AI | AstroX",
  description: "Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AI.",
  openGraph: { title: "Kinh Dịch — Gieo quẻ và luận giải bằng AI | AstroX", description: "Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AI.", images: ["/assets/og/kinhdich.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Kinh Dịch</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Kinh Dịch — Mai Hoa Dịch Số</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Đặt một câu hỏi cụ thể. AstroX dùng 3 số để tính thượng quái, hạ quái, hào động và quan hệ Thể–Dụng.</p>
    </section>
  );
}
