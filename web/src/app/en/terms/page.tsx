import type { Metadata } from 'next';
import { TermsContent } from '@/components/shell/TermsContent';
export const metadata: Metadata = {
  alternates: { canonical: '/en/terms', languages: { vi: '/dieukhoan', en: '/en/terms', 'x-default': '/dieukhoan' } },
  title: 'Terms & Agreement — AstroX',
  description: 'Terms of service, credit usage, refunds and privacy for AstroX.',
};
export default function Page() {
  return <TermsContent />;
}
