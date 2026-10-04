import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { CompatClient } from '@/components/compat/CompatClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/tuonghop',
    languages: { vi: '/tuonghop', en: '/en/compatibility', 'x-default': '/tuonghop' },
  },
  title: 'Tương Hợp — Đối chiếu hai lá số',
  description: 'Đối chiếu cung hoàng đạo của hai người, xem mức độ tương hợp về tính cách và cảm xúc.',
  ...socialMetadata('/tuonghop'),
};

export default function Page() {
  return <CompatClient />;
}
