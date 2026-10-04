import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  alternates: { canonical: '/thansohoc' },
  title: 'Thần Số Học — Giải mã con số cuộc đời',
  description: 'Tính Số Chủ Đạo, Số Đường Đời và các chỉ số Thần Số Học, luận giải ý nghĩa bằng AstroX.',
  ...socialMetadata('/thanso'),
};

/** Alias cũ /thanso → /thansohoc (server-side, không CLS). */
export default function Page() {
  redirect('/thansohoc');
}
