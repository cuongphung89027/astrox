import Link from "next/link";
import { ModuleIllustration } from "./ModuleIllustration";
import styles from "./FeatureOverview.module.css";

const FEATURES = [
  { kind: "tuvi", title: "Tử Vi", label: "Nhìn lại mình, hiểu đường đi", description: "Từ ngày giờ sinh, khám phá lá số 12 cung để hiểu thêm về bản thân, các mối quan hệ và những chặng đường cuộc sống.", detail: "Lá số 12 cung · Luận giải vận trình", action: "Khám phá lá số", href: "/tuvi" },
  { kind: "tarot", title: "Tarot", label: "Một khoảng lặng dành cho bạn", description: "Mang theo một câu hỏi, chọn cách trải bài và mở ra một góc nhìn khác cho điều bạn đang băn khoăn.", detail: "Chọn trải bài · Rút bài · Chiêm nghiệm", action: "Trải bài Tarot", href: "/tarot" },
  { kind: "zodiac", title: "Cung Hoàng Đạo", label: "Dấu ấn từ bầu trời", description: "Khám phá 12 cung và bản đồ sao để hiểu thêm những sắc thái trong tính cách của bạn.", action: "Đọc bản đồ sao", href: "/cunghoangdao" },
  { kind: "iching", title: "Kinh Dịch", label: "Tĩnh tâm trước một lựa chọn", description: "Gieo một quẻ, đọc lời quẻ và dành thời gian suy ngẫm về câu hỏi của mình.", action: "Gieo một quẻ", href: "/kinhdich" },
  { kind: "battu", title: "Bát Tự", label: "Tìm nhịp cân bằng", description: "Tìm hiểu tứ trụ từ ngày giờ sinh và sự tương quan của ngũ hành trong mệnh cục.", action: "Xem tứ trụ", href: "/battu" },
  { kind: "numerology", title: "Thần Số Học", label: "Những con số kể chuyện bạn", description: "Từ tên và ngày sinh, khám phá con số chủ đạo cùng những nét riêng trên hành trình của bạn.", action: "Khám phá con số", href: "/thansohoc" },
];

export function FeatureOverview() {
  return (
    <section id="features" className={styles.section} aria-labelledby="features-heading">
      <div className={styles.inner}>
        <div className={styles.divider} aria-hidden="true"><span />✦<span /></div>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Sáu góc nhìn · Một hành trình</p>
            <h2 id="features-heading">Đi sâu hơn.<br /><span>Hiểu mình hơn.</span></h2>
          </div>
          <p className={styles.intro}>Từ lá số đến một lá bài, mỗi công cụ mở ra một cách để lắng nghe và khám phá bản thân.</p>
        </header>

        <div className={styles.grid}>
          {FEATURES.map((feature, index) => (
            <article key={feature.kind} className={`${styles.card} ${styles[feature.kind]}`} aria-labelledby={`feature-${feature.kind}`}>
              <div className={styles.meta}><span>{feature.label}</span><span className={styles.number} aria-hidden="true">0{index + 1}</span></div>
              <div className={styles.art} aria-hidden="true">
                <ModuleIllustration kind={feature.kind} />
                {feature.kind === "tuvi" && <span className={styles.artCaption}>MỆNH · THÂN · VẬN</span>}
              </div>
              <div className={styles.copy}>
                <h3 id={`feature-${feature.kind}`}>{feature.title}</h3>
                <p>{feature.description}</p>
                {feature.detail && <p className={styles.detail}>{feature.detail}</p>}
              </div>
              <Link href={feature.href} className={styles.link}>
                <span>{feature.action}</span><span className={styles.arrow} aria-hidden="true">↗</span>
              </Link>
            </article>
          ))}
        </div>
        <div className={styles.endmark} aria-hidden="true"><span />✦<span /></div>
      </div>
    </section>
  );
}
