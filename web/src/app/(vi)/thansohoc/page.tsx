import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { NumerologyClient } from '@/components/numerology/NumerologyClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/thansohoc',
    languages: { vi: '/thansohoc', en: '/en/numerology', 'x-default': '/thansohoc' },
  },
  title: 'Thần Số Học — Giải mã con số cuộc đời',
  description: 'Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AstroX.',
  ...socialMetadata('/thansohoc'),
};

export default function Page() {
  return <NumerologyClient />;
}
