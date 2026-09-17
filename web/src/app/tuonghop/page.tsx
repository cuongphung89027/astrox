import type { Metadata } from "next";
import { CompatClient } from "@/components/compat/CompatClient";

export const metadata: Metadata = {
  title: "Tương Hợp — Đối chiếu hai lá số | AstroX",
  description: "Đối chiếu cung hoàng đạo của hai người, xem mức độ tương hợp về tính cách và cảm xúc.",
  openGraph: { title: "Tương Hợp — Đối chiếu hai lá số | AstroX", description: "Đối chiếu cung hoàng đạo của hai người, xem mức độ tương hợp về tính cách và cảm xúc.", images: ["/assets/og/trangchu.png"] },
};

export default function Page() {
  return <CompatClient />;
}
