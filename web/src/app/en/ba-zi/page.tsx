import type { Metadata } from "next";
import { BatuClient } from "@/components/batu/BatuClient";
export const metadata: Metadata = {
  title: "Ba Zi (Four Pillars) — Destiny readings by AstroX",
  description: "Build your Ba Zi Four Pillars chart, explore Ten Gods and Useful God analysis, interpreted by AstroX.",
  openGraph: { title: "Ba Zi (Four Pillars) — Destiny readings by AstroX", description: "Build your Ba Zi Four Pillars chart, explore Ten Gods and Useful God analysis, interpreted by AstroX.", images: ["/assets/og/battu.png"] },
};
export default function Page() {
  return <BatuClient />;
}
