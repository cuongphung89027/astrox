"use client";

import Link from "next/link";
import styles from "./HomeFooter.module.css";

const links = [
  ["Tử Vi", "/tuvi"], ["Tarot", "/tarot"],
  ["Cung Hoàng Đạo", "/cunghoangdao"], ["Kinh Dịch", "/kinhdich"],
  ["Bát Tự", "/battu"], ["Thần Số Học", "/thansohoc"],
];

export function HomeFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.main}>
          <div className={styles.brand}>
            <Link href="/" aria-label="AstroX — Trang chủ" className={styles.logo}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Original brand asset. */}
              <img src="/assets/logo.png" alt="AstroX" width={92} height={92} />
            </Link>
            <div><p className={styles.tagline}>Một hành trình hiểu mình.</p><p className={styles.note}>Lắng nghe bản thân, theo cách của bạn.</p></div>
          </div>
          <nav aria-label="Khám phá AstroX" className={styles.navigation}>
            <p>Khám phá cùng AstroX</p>
            <div>{links.map(([title, href]) => <Link href={href} key={href}>{title}<span aria-hidden="true">↗</span></Link>)}</div>
          </nav>
        </div>
        <div className={styles.bottom}>
          <span className={styles.copyright}>© {new Date().getFullYear()} AstroX</span>
          <div className={styles.credit}>
            <span>Designed &amp; Developed by <strong>Tsonniverse Studio™</strong></span>
          </div>
          <button className={styles.top} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Về đầu trang <span aria-hidden="true">↑</span></button>
        </div>
      </div>
    </footer>
  );
}
