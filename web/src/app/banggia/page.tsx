import type {Metadata} from 'next';
import {PricingContent} from '@/components/points/PricingContent';
export const metadata:Metadata={title:'Bảng giá AstroX Point',description:'Xem giá từng dịch vụ và gói AstroX Point trước khi đăng nhập.',alternates:{canonical:'/banggia'}};
export default function PricingPage(){return <section className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-display text-4xl text-[#244d40]">Bảng giá AstroX</h1><p className="mt-4 leading-7 text-muc-2">Xem giá từng lượt trước khi sử dụng. Đọc lại bài đã lưu không tạo thêm lượt luận giải.</p><PricingContent/></section>;}
