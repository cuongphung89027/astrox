import type { Metadata } from "next";
import { TermsContent } from "@/components/shell/TermsContent";

export const metadata: Metadata = {
  title: "Các điều khoản & Thoả thuận — AstroX",
  description:
    "Điều khoản sử dụng, tuyên bố miễn trừ trách nhiệm và thoả thuận xử lý, bảo mật thông tin cá nhân tại AstroX.",
  openGraph: {
    title: "Các điều khoản & Thoả thuận — AstroX",
    description:
      "Điều khoản sử dụng, tuyên bố miễn trừ trách nhiệm và thoả thuận xử lý, bảo mật thông tin cá nhân tại AstroX.",
    images: ["/assets/og/trangchu.png"],
  },
};

export default function Page() {
  return <TermsContent />;
}
