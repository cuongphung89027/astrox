import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AI | AstroX",
  description: "Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AI.",
  openGraph: { title: "Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AI | AstroX", description: "Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AI.", images: ["/assets/og/battu.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Bát Tự</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Bát Tự — Tứ Trụ Mệnh Lý</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Lá số 4 trụ Năm–Tháng–Ngày–Giờ tính trực tiếp từ ngày giờ sinh dương lịch, cùng Đại Vận và tỷ lệ Ngũ Hành.</p>
    </section>
  );
}
