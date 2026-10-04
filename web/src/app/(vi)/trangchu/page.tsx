import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  title: 'Khám phá thế giới của bạn',
  description: 'Khám phá thế giới của bạn cùng AstroX.',
  ...socialMetadata('/trangchu'),
};

/** Alias /trangchu của app cũ → chuyển về / (server-side, không CLS). */
export default function TrangChuPage() {
  redirect('/');
}
