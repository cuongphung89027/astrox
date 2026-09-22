import type { Metadata } from "next";
import { TuViClient } from "@/components/tuvi/TuViClient";

export const metadata: Metadata = {
  title: "Tử Vi Đẩu Số — Luận giải lá số bằng AstroX",
  description: "Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AstroX.",
  openGraph: { title: "Tử Vi Đẩu Số — Luận giải lá số bằng AstroX", description: "Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AstroX.", images: ["/assets/og/tuvi.png"] },
};

export default function Page() {
  return <TuViClient />;
}
