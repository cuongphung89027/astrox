import type { Metadata } from "next";
import { TarotClient } from "@/components/tarot/TarotClient";

export const metadata: Metadata = {
  title: "Tarot — Trải bài và luận giải bằng AI | AstroX",
  description: "Chọn bộ bài, trải bài Tarot theo nhiều kiểu trải phổ biến và xem luận giải bằng AI dựa trên đúng các lá đã rút.",
  openGraph: { title: "Tarot — Trải bài và luận giải bằng AI | AstroX", description: "Chọn bộ bài, trải bài Tarot theo nhiều kiểu trải phổ biến và xem luận giải bằng AI dựa trên đúng các lá đã rút.", images: ["/assets/og/tarot.png"] },
};

export default function Page() {
  return <TarotClient />;
}
