import { PalmReader } from '@/components/discovery/PalmReader';
export const metadata = {
  alternates: { canonical: '/chitay', languages: { vi: '/chitay', en: '/en/palm-reading', 'x-default': '/chitay' } },
  title: 'Chỉ tay — AstroX',
  description: 'Chụp lòng bàn tay và khám phá những đường nét cùng AstroX.',
};
export default function Page() {
  return <PalmReader />;
}
