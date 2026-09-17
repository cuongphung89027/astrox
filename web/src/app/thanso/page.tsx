import type { Metadata } from "next";
import { NumerologyClient } from "@/components/numerology/NumerologyClient";

export const metadata: Metadata = {
  title: "Thần Số Học — Giải mã con số cuộc đời",
  description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AI.",
  openGraph: { title: "Thần Số Học — Giải mã con số cuộc đời", description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AI.", images: ["/assets/og/thanso.png"] },
};

export default function Page() {
  return <NumerologyClient />;
}
