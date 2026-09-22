"use client";

/**
 * PointsChip — số dư AstroX Point trên header, đặt trái avatar. Bấm vào mở
 * màn Ví Point (/hoso?section=points). Cùng palette với thẻ ví trong AuthMenu
 * (ngọc đậm #244e42 + chữ vàng kem), số chạy NumberPopIn khi đổi giá trị.
 */
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { usePointsBalance } from "@/lib/points";
import { NumberPopIn } from "@/components/motion";
import { PointCoin } from "@/components/points/PointCoin";
import styles from "./PointsChip.module.css";

export function PointsChip() {
  const { loggedIn, astroxUser } = useAuth();
  const preview = astroxUser?.id === "localhost-preview";
  const { points, status } = usePointsBalance(!preview);
  if (!loggedIn || !astroxUser) return null;
  const value = preview ? 1000 : points;
  const label = value === null ? null : value.toLocaleString("vi-VN");
  return (
    <Link
      href="/hoso?section=points"
      className={styles.chip}
      aria-label={label ? `Ví AstroX Point — ${label} Point` : "Ví AstroX Point"}
    >
      <PointCoin size={16} className={styles.coin} />
      {label === null ? (
        <span className={styles.dots} aria-hidden="true">
          {status === "error" ? "—" : "•••"}
        </span>
      ) : (
        <span className={styles.value}>
          <NumberPopIn value={label} />
        </span>
      )}
    </Link>
  );
}
