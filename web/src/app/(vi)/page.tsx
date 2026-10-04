import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { Dashboard } from '@/components/home/Dashboard';

export const metadata: Metadata = {
  alternates: { canonical: '/', languages: { vi: '/', en: '/en', 'x-default': '/' } },
  ...socialMetadata('/'),
};

export default function Home() {
  return <Dashboard />;
}
