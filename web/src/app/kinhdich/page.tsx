import type { Metadata } from "next";
import { KinhDichClient } from "@/components/kinhdich/KinhDichClient";

export const metadata: Metadata = {
  title: "Kinh Dịch — Gieo quẻ và luận giải bằng AI | AstroX",
  description: "Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AI.",
  openGraph: { title: "Kinh Dịch — Gieo quẻ và luận giải bằng AI | AstroX", description: "Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AI.", images: ["/assets/og/kinhdich.png"] },
};

export default function Page() {
  return <KinhDichClient />;
}
