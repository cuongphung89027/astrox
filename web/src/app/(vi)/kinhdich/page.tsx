import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { KinhDichClient } from '@/components/kinhdich/KinhDichClient';

export const metadata: Metadata = {
  alternates: { canonical: '/kinhdich', languages: { vi: '/kinhdich', en: '/en/i-ching', 'x-default': '/kinhdich' } },
  title: 'Kinh Dịch — Gieo quẻ và luận giải',
  description: 'Gieo quẻ Kinh Dịch, xem hào từ và luận giải quẻ theo tình huống của bạn bằng AstroX.',
  ...socialMetadata('/kinhdich'),
};

export default function Page() {
  return <KinhDichClient />;
}
