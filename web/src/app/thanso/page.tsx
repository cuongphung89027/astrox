import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thần Số Học — Giải mã con số cuộc đời | AstroX",
  description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AI.",
  openGraph: { title: "Thần Số Học — Giải mã con số cuộc đời | AstroX", description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AI.", images: ["/assets/og/thanso.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Thần Số Học</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Thần Số Học — Pythagoras</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Các chỉ số tính từ họ tên và ngày sinh dương lịch theo hệ Pythagoras.</p>
    </section>
  );
}
