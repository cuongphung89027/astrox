import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày",
  description: "Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.",
};

/** Alias cũ /hoangdao → /cunghoangdao (server-side, không CLS). */
export default function Page() {
  redirect("/cunghoangdao");
}
