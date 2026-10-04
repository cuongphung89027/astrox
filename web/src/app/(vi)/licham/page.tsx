import { socialMetadata } from '@/lib/social-metadata';
import { LunarCalendar } from '@/components/discovery/LunarCalendar';
export const metadata = {
  alternates: { canonical: '/licham', languages: { vi: '/licham', en: '/en/lunar-calendar', 'x-default': '/licham' } },
  title: 'Lịch âm — AstroX',
  description: 'Xem lịch âm Việt Nam, đổi ngày âm dương và ghi nhớ ngày gia đình.',
  ...socialMetadata('/licham'),
};
export default function Page() {
  return <LunarCalendar />;
}
