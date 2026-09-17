import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày | AstroX",
  description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AI.",
  openGraph: { title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày | AstroX", description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AI.", images: ["/assets/og/hoangdao.png"] },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-son">Cung Hoàng Đạo</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Cung Hoàng Đạo &amp; Bản Đồ Sao</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muc-2">Tính cung Mặt Trời theo ngày sinh, xem đặc tính và horoscope hôm nay, tuần này hoặc tháng này.</p>
    </section>
  );
}
