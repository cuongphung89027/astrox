"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useAppState } from "@/lib/use-store";
import { cacheFingerprint } from "@/lib/state";
import { periodCacheKey, TUVI_TOPICS, buildZiweiChart, menhPalace } from "@/lib/tuvi";
import { formatDob } from "@/lib/utils";
import { PROMPT_VERSION } from "@/lib/config";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { FeatureIcon, FEATURE_BY_PATH } from "@/components/kit/FeatureIcon";
import { zodiacAsset } from "@/lib/earthly-branches";
import styles from "./Dashboard.module.css";

const TOOLS = [
  { href: "/cunghoangdao", name: "Cung Hoàng Đạo" },
  { href: "/kinhdich", name: "Kinh Dịch" },
  { href: "/battu", name: "Bát Tự" },
  { href: "/thansohoc", name: "Thần Số Học" },
];
const excerpt = (text: string) => text.replace(/[#*`]/g, "").replace(/\s+/g, " ").trim();

export function Dashboard() {
  const router = useRouter();
  const state = useAppState();
  const { profile } = state;
  const { loggedIn, ready, displayName, zaloLogin } = useAuth();
  const { open } = useProfileModal();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);
  const cache = profile ? state.aiCache.profiles[cacheFingerprint()] : undefined;
  const today = now ? cache?.tuviPeriod.today[periodCacheKey("today")] : undefined;
  const usableToday = today && (!today.promptVersion || today.promptVersion === PROMPT_VERSION) && (!today.expiresAt || today.expiresAt > (now?.getTime() || 0)) ? today : undefined;
  const recent = Object.entries(cache?.tuviTopics || {}).filter(([,entry]) => entry.text && (!entry.promptVersion || entry.promptVersion === PROMPT_VERSION) && (!entry.expiresAt || entry.expiresAt > (now?.getTime() || 0))).sort((a,b) => b[1].updatedAt - a[1].updatedAt).slice(0, 3);
  const chart = useMemo(() => {
    if (!profile?.dob || !profile.hourChi || !profile.gender) return null;
    try { return buildZiweiChart(profile); } catch { return null; }
  }, [profile]);
  const menh = chart ? menhPalace(chart) : null;
  const tarotCount = Object.values(cache?.tarot || {}).filter(entry => entry.text).length;
  // Tên gọi người dùng tự đặt ưu tiên trước tên từ kênh đăng nhập (Zalo/Supabase).
  const name = loggedIn ? profile?.name || displayName : undefined;
  const greeting = now ? now.getHours() < 11 ? "Chào buổi sáng" : now.getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối" : "Xin chào";
  return <div className={styles.page}>
    <header className={`${styles.header} ${!loggedIn ? styles.guestHeader : ""}`}>
      <div><p>{now?.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" }) || "Hôm nay"}</p><h1>{greeting}{name ? <>, <span>{name}.</span></> : "."}</h1></div>
      {loggedIn ? <button className={styles.avatar} aria-label="Mở hồ sơ" onClick={() => router.push("/hoso")}>{name?.slice(0,1).toUpperCase() || <FeatureIcon name="profile" size={26} />}</button> : <div className={styles.guestLogin}><span>{ready ? "Chưa đăng nhập" : "Đang kiểm tra đăng nhập…"}</span><button onClick={zaloLogin} disabled={!ready}>Đăng nhập bằng Zalo <span aria-hidden="true">↗</span></button></div>}
    </header>
    {!profile && <button className={styles.profilePrompt} onClick={() => open()}><span>Hoàn tất hồ sơ <small>Để xem nội dung dành riêng cho bạn</small></span><span aria-hidden="true">↗</span></button>}
    {profile && <div className={styles.dashboardGrid}>
      <section className={styles.today} aria-label="Hôm nay của bạn"><div className={styles.todayCopy}><span className={styles.eyebrow}>{now?.toLocaleDateString("vi-VN")} · VẬN TRÌNH</span><h2>{name}</h2>{usableToday ? <p className={styles.preview}>{excerpt(usableToday.text)}</p> : <p>Chưa có luận giải cho hôm nay.</p>}<Link href="/tuvi?view=period">{usableToday ? "Đọc tiếp" : "Tạo vận trình hôm nay"} <span>↗</span></Link></div><FeatureIcon name="tuvi" size={120} className={styles.sun} /></section>
      <section className={styles.identity} aria-label="Thông tin lá số cá nhân"><div className={styles.sectionHeading}><h2>Lá số của {profile.name}</h2><Link href="/tuvi" aria-label="Mở lá số">↗</Link></div><p className={styles.birth}>{formatDob(profile.dob)} · {profile.hourChi}</p>{chart ? <dl className={styles.facts}><div><dt>Năm sinh</dt><dd><img src={zodiacAsset(chart.meta.zodiac)} alt="" aria-hidden="true" width={48} height={48} className={styles.zodiacAnimal} />{chart.meta.zodiac}</dd></div><div><dt>Cục</dt><dd>{chart.meta.fiveElementsClass}</dd></div><div><dt>Mệnh tại</dt><dd>{menh?.earthlyBranch || "—"}</dd></div><div><dt>Chính tinh cung Mệnh</dt><dd>{menh?.majorStars.map(star => star.name).join(" · ") || "Vô chính diệu"}</dd></div></dl> : <button onClick={() => open()}>Bổ sung thông tin sinh</button>}</section>
      <Link href="/tarot" className={styles.tarotAction}><FeatureIcon name="tarot" size={34} /><div><h2>Tarot</h2><p>{tarotCount ? `${tarotCount} luận giải đã lưu trong hồ sơ` : "Chưa có luận giải Tarot trong hồ sơ"}</p></div><span>Rút bài ↗</span></Link>
    </div>}
    <section aria-labelledby="dashboard-tools"><div className={styles.sectionHeading}><h2 id="dashboard-tools">Truy cập nhanh</h2></div><div className={styles.tools}>{[{href:"/tuvi",name:"Tử Vi"},{href:"/tarot",name:"Tarot"},...TOOLS].map(tool => <Link key={tool.href} href={tool.href}><FeatureIcon name={FEATURE_BY_PATH[tool.href]} size={28} />{tool.name}</Link>)}</div></section>
    {recent.length > 0 && <section aria-labelledby="dashboard-recent"><div className={styles.sectionHeading}><h2 id="dashboard-recent">Đọc tiếp</h2><span>Luận giải đã lưu</span></div><div className={styles.recent}>{recent.map(([key, entry]) => {const [topicId, subId] = key.split("::");const topic = TUVI_TOPICS.find(t=>t.id === topicId);return <Link key={key} href={`/tuvi?view=topics&topic=${encodeURIComponent(topicId)}&sub=${encodeURIComponent(subId || "")}`}><div><h3>{topic?.subs.find(s=>s.id === subId)?.label || topic?.title || "Luận giải Tử Vi"}</h3><p>{excerpt(entry.text)}</p></div><span aria-hidden="true">↗</span></Link>;})}</div></section>}

  </div>;
}
