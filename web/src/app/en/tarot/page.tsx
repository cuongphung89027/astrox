import type { Metadata } from "next";
import { Suspense } from "react";
import { TarotClient } from "@/components/tarot/TarotClient";
export const metadata: Metadata = {
  title: "Tarot — Draw and interpret with AstroX",
  description: "Pick a deck, lay out popular Tarot spreads and read interpretations by AstroX based on the exact cards you drew.",
  openGraph: { title: "Tarot — Draw and interpret with AstroX", description: "Pick a deck, lay out popular Tarot spreads and read interpretations by AstroX based on the exact cards you drew.", images: ["/assets/og/tarot.png"] },
};
export default function Page() {
  return <Suspense fallback={<div role="status" className="p-6 text-center">Opening Tarot…</div>}><TarotClient /></Suspense>;
}
