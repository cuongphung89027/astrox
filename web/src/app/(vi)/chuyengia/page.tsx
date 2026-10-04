import { socialMetadata } from '@/lib/social-metadata';
import { Experts } from '@/components/discovery/Experts';
export const metadata = {
  alternates: { canonical: '/chuyengia' },
  title: 'Đặt lịch chuyên gia',
  description: 'Đặt lịch trao đổi với chuyên gia do AstroX tuyển chọn.',
  ...socialMetadata('/chuyengia'),
};
export default function Page() {
  return <Experts />;
}
