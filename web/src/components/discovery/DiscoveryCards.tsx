import Link from "next/link";
import { FeatureIcon, type FeatureName } from "@/components/kit/FeatureIcon";
import s from "./Discovery.module.css";
const cards: {
  href: string;
  title: string;
  text: string;
  icon: FeatureName;
  action: string;
}[] = [
  {
    href: "/licham",
    title: "Lịch âm",
    text: "Xem ngày âm, đổi ngày và ghi nhớ những dịp quan trọng.",
    icon: "calendar",
    action: "Mở lịch hôm nay",
  },
  {
    href: "/chitay",
    title: "Chỉ tay",
    text: "Khám phá những đường nét trong lòng bàn tay của bạn.",
    icon: "palm",
    action: "Chụp bàn tay",
  },
  {
    href: "/chuyengia",
    title: "Đặt lịch chuyên gia",
    text: "Dành một cuộc trò chuyện cho điều bạn đang quan tâm.",
    icon: "profile",
    action: "Tìm người đồng hành",
  },
];
export function DiscoveryCards() {
  return (
    <section aria-label="Khám phá thêm cùng AstroX" className={s.cards}>
      {cards.map((c) => (
        <Link href={c.href} key={c.href} className={s.feature}>
          <FeatureIcon name={c.icon} size={36} />
          <h2>{c.title}</h2>

          <span aria-hidden="true">↗</span>
        </Link>
      ))}
    </section>
  );
}
