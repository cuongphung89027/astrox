import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Khám phá thế giới của bạn cùng AstroX",
  description: "Khám phá thế giới của bạn cùng AstroX.",
};

/** Alias /trangchu của app cũ → chuyển về / (server-side, không CLS). */
export default function TrangChuPage() {
  redirect("/");
}
