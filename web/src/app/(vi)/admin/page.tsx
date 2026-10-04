import { socialMetadata } from '@/lib/social-metadata';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản trị',
  robots: { index: false, follow: false },
  ...socialMetadata('/admin'),
};
export default function AdminPage() {
  return <AdminDashboard />;
}
