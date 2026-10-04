import { SiteIdentity } from '@/components/shell/SiteIdentity';
import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { Dashboard } from '@/components/home/Dashboard';
export const metadata: Metadata = {
  alternates: { canonical: '/en', languages: { vi: '/', en: '/en', 'x-default': '/' } },
  ...socialMetadata('/en'),
};

export default function Home() {
  return (
    <>
      <SiteIdentity />
      <Dashboard />
    </>
  );
}
