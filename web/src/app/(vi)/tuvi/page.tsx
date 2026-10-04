import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { TuViClient } from '@/components/tuvi/TuViClient';

export const metadata: Metadata = {
  alternates: { canonical: '/tuvi', languages: { vi: '/tuvi', en: '/en/zi-wei', 'x-default': '/tuvi' } },
  title: 'Tử Vi Đẩu Số — Luận giải lá số bằng AstroX',
  description:
    'Lập lá số Tử Vi Đẩu Số, xem vận hạn theo ngày, tuần, tháng dựa trên Lưu Niên, Lưu Nguyệt, Lưu Nhật thật, luận giải bằng AstroX.',
  ...socialMetadata('/tuvi'),
};

export default function Page() {
  return <TuViClient />;
}
