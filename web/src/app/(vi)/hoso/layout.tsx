import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Hồ sơ & ví Point',
  robots: { index: false, follow: false },
  ...socialMetadata('/hoso'),
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
