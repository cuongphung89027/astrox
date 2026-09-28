import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Thần Số Học — Giải mã con số cuộc đời",
  description: "Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AstroX.",
};

/** Alias cũ /thanso → /thansohoc (server-side, không CLS). */
export default function Page() {
  redirect("/thansohoc");
}
