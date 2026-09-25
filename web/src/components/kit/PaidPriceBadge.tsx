import { PointCoin } from "@/components/points/PointCoin";
import styles from "./PaidPriceBadge.module.css";

/** Giá dịch vụ trả về từ usePaidPrice. */
type PriceLike = { paid: boolean; pending?: boolean; free?: boolean; points?: number };

/**
 * Nhãn giá gọn trên nút dịch vụ: đồng xu Point + số khi có phí, "Free" khi
 * miễn phí, "…" khi đang chờ báo giá; ẩn khi nút không gắn dịch vụ.
 */
export function PaidPriceBadge({ price }: { price: PriceLike }) {
  if (price.paid) {
    if (price.pending || price.points === undefined) {
      return <> {" "}<span className={styles.badge} aria-hidden="true">…</span></>;
    }
    return (
      <> {" "}<span className={styles.badge}>
        <PointCoin size={11} className={styles.coin} />
        {price.points.toLocaleString("vi-VN")}
        <span className="sr-only">Point</span>
      </span></>
    );
  }
  if (price.free) return <> {" "}<span className={`${styles.badge} ${styles.free}`}>Free</span></>;
  return null;
}
