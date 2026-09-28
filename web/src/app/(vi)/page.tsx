import type { Metadata } from 'next';
import { Dashboard } from '@/components/home/Dashboard';

export const metadata: Metadata = {
  alternates: { canonical: '/', languages: { vi: '/', en: '/en', 'x-default': '/' } },
};

export default function Home() {
  return <Dashboard />;
}
