import type { Metadata } from "next";
import { BatuClient } from "@/components/batu/BatuClient";

export const metadata: Metadata = {
  title: "Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AI | AstroX",
  description: "Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AI.",
  openGraph: { title: "Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AI | AstroX", description: "Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AI.", images: ["/assets/og/battu.png"] },
};

export default function Page() {
  return <BatuClient />;
}
