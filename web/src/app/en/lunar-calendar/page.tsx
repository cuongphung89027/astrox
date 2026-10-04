import { socialMetadata } from '@/lib/social-metadata';
import { LunarCalendar } from '@/components/discovery/LunarCalendar';
export const metadata = {
  alternates: {
    canonical: '/en/lunar-calendar',
    languages: { vi: '/licham', en: '/en/lunar-calendar', 'x-default': '/licham' },
  },
  title: 'Lunar Calendar',
  description: 'Convert solar and lunar dates and keep track of family occasions.',
  ...socialMetadata('/en/lunar-calendar'),
};
export default function Page() {
  return <LunarCalendar />;
}
