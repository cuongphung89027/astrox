import type { Metadata } from 'next';
import { PricingContent } from '@/components/points/PricingContent';
export const metadata: Metadata = {
  title: 'AstroX Pricing',
  description: 'See the price of every service and credit package before you sign in.',
  alternates: { canonical: '/en/pricing' },
};
export default function PricingPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="font-display text-4xl text-[#244d40]">AstroX Pricing</h1>
      <p className="mt-4 leading-7 text-muc-2">
        See the price of every reading before you start. Re-reading a saved report never creates a new charge.
      </p>
      <PricingContent />
    </section>
  );
}
