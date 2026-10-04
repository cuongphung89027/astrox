import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Profile & wallet',
  robots: { index: false, follow: false },
  ...socialMetadata('/en/profile'),
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
