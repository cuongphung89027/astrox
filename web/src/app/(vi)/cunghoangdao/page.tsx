import type { Metadata } from 'next';
import { ZodiacClient } from '@/components/zodiac/ZodiacClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/cunghoangdao',
    languages: { vi: '/cunghoangdao', en: '/en/astrology', 'x-default': '/cunghoangdao' },
  },
  title: 'Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày',
  description:
    'Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.',
  openGraph: {
    title: 'Cung Hoàng Đạo — Tử vi phương Tây mỗi ngày',
    description:
      'Xem tử vi 12 cung hoàng đạo theo ngày, tuần, tháng dựa trên vị trí thiên thể thật, luận giải bằng AstroX.',
    images: ['/assets/og/cunghoangdao.png'],
  },
};

export default function Page() {
  return <ZodiacClient />;
}
