import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { BatuClient } from '@/components/batu/BatuClient';

export const metadata: Metadata = {
  alternates: { canonical: '/battu', languages: { vi: '/battu', en: '/en/ba-zi', 'x-default': '/battu' } },
  title: 'Bát Tự (Tứ Trụ) — Luận giải mệnh lý bằng AstroX',
  description: 'Lập lá số Bát Tự Tứ Trụ, xem Thập Thần, Dụng Thần và luận giải mệnh lý bằng AstroX.',
  ...socialMetadata('/battu'),
};

export default function Page() {
  return <BatuClient />;
}
