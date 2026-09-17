import type { Metadata } from "next";
import { ZodiacClient } from "@/components/zodiac/ZodiacClient";

export const metadata: Metadata = {
  title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày | AstroX",
  description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.",
  openGraph: { title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày | AstroX", description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.", images: ["/assets/og/hoangdao.png"] },
};

export default function Page() {
  return <ZodiacClient />;
}
