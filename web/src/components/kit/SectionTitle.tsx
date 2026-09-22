import { FeatureIcon, type FeatureName } from "./FeatureIcon";
/**
 * SectionTitle — tiêu đề section: eyebrow (chấm son + chữ hoa tracking rộng)
 * + heading font-display + mô tả ngắn. Align left | center.
 */
interface SectionTitleProps {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  align?: "left" | "center";
  /** Tag heading (mặc định h2). */
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
}

export function SectionTitle({ eyebrow, title, sub, align = "left", as = "h2", className, id }: SectionTitleProps) {
  const Heading = as;
  const feature = ({ "Tử Vi": "tuvi", "Tarot": "tarot", "Kinh Dịch": "kinhdich", "Bát Tự": "battu", "Thần Số Học": "numerology", "Cung Hoàng Đạo": "zodiac", "Tương Hợp": "compat" } as Record<string, FeatureName>)[eyebrow || ""];
  return (
    <div className={`flex flex-col gap-3 ${align === "center" ? "items-center text-center" : "items-start"} ${className ?? ""}`}>
      {eyebrow ? (
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-son-deep">
          {feature ? <FeatureIcon name={feature} size={22} /> : <span aria-hidden="true" className="size-1.5 rounded-full bg-son" />}
          {eyebrow}
        </p>
      ) : null}
      <Heading id={id} className="font-display text-3xl font-extrabold tracking-tight text-muc md:text-4xl">
        {title}
      </Heading>
      {sub ? <p className={`max-w-2xl text-base leading-relaxed text-muc-2 ${align === "center" ? "mx-auto" : ""}`}>{sub}</p> : null}
    </div>
  );
}
