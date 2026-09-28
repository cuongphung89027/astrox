import type { Metadata } from "next";
import { TermsContent } from "@/components/shell/TermsContent";
export const metadata: Metadata = {
  title: "Terms & Agreement — AstroX",
  description: "Terms of service, credit usage, refunds and privacy for AstroX.",
};
export default function Page() {
  return <TermsContent />;
}
