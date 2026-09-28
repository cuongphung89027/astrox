import type { Metadata } from "next";
import { NumerologyClient } from "@/components/numerology/NumerologyClient";
export const metadata: Metadata = {
  title: "Numerology — Decode the numbers of your life",
  description: "Calculate your Life Path, Destiny number and core numerology indicators, interpreted by AstroX.",
  openGraph: { title: "Numerology — Decode the numbers of your life", description: "Calculate your Life Path, Destiny number and core numerology indicators, interpreted by AstroX.", images: ["/assets/og/thansohoc.png"] },
};
export default function Page() {
  return <NumerologyClient />;
}
