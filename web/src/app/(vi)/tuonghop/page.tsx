import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { CompatClient } from '@/components/compat/CompatClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/tuonghop',
    languages: { vi: '/tuonghop', en: '/en/compatibility', 'x-default': '/tuonghop' },
  },
  title: 'Tương Hợp — Đối chiếu hai lá số',
  description: 'Khám phá tương hợp của hai người theo Tử vi, Bát tự hoặc cung hoàng đạo. Đối chiếu lá số và tìm hiểu điểm kết nối cùng AstroX.',
  ...socialMetadata('/tuonghop'),
};

export default function Page() {
  return <CompatClient />;
}
