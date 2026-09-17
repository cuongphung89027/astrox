import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tử Vi Đẩu Số — Luận giải lá số bằng AI | AstroX",
  description: "Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AI.",
  openGraph: { title: "Tử Vi Đẩu Số — Luận giải lá số bằng AI | AstroX", description: "Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AI.", images: ["/assets/og/tuvi.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Tử Vi</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Tử Vi Đẩu Số</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Xem dữ liệu 12 cung, vận trình năm 2026 và các chủ đề bạn muốn phân tích.</p>
    </section>
  );
}
