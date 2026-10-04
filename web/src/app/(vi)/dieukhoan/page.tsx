import { socialMetadata } from '@/lib/social-metadata';
import type { Metadata } from 'next';
import { TermsContent } from '@/components/shell/TermsContent';

export const metadata: Metadata = {
  alternates: { canonical: '/dieukhoan', languages: { vi: '/dieukhoan', en: '/en/terms', 'x-default': '/dieukhoan' } },
  title: 'Các điều khoản & Thoả thuận — AstroX',
  description:
    'Điều khoản sử dụng, tuyên bố miễn trừ trách nhiệm và thoả thuận xử lý, bảo mật thông tin cá nhân tại AstroX.',
  ...socialMetadata('/dieukhoan'),
};

export default function Page() {
  return <TermsContent />;
}
