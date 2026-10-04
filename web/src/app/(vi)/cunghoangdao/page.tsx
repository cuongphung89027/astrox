import { socialMetadata } from '@/lib/social-metadata';
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
  ...socialMetadata('/cunghoangdao'),
};

export default function Page() {
  return <ZodiacClient />;
}
