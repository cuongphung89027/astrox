import type { Metadata } from "next";
import { KinhDichClient } from "@/components/kinhdich/KinhDichClient";
export const metadata: Metadata = {
  title: "I Ching — Cast and interpret hexagrams",
  description: "Cast an I Ching hexagram, read the line texts and get an interpretation for your situation by AstroX.",
  openGraph: { title: "I Ching — Cast and interpret hexagrams", description: "Cast an I Ching hexagram, read the line texts and get an interpretation for your situation by AstroX.", images: ["/assets/og/kinhdich.png"] },
};
export default function Page() {
  return <KinhDichClient />;
}
