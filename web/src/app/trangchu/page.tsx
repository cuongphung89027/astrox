import type { Metadata } from "next";
import { Redirect } from "@/components/shell/Redirect";

export const metadata: Metadata = {
  title: "Khám phá thế giới của bạn cùng AstroX",
  description: "Khám phá thế giới của bạn cùng AstroX.",
};

/** Alias /trangchu của app cũ → chuyển về /. */
export default function TrangChuPage() {
  return <Redirect href="/" />;
}
