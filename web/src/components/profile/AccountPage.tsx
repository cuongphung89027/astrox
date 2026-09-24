"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {useCloudSyncStatus} from "@/lib/cloud-sync";
import { useAuth } from "@/lib/auth";
import { openLoginDialog } from "@/lib/login-dialog";
import { useProfile } from "@/lib/use-store";
import { useProfileModal } from "./ProfileModal";
import { usePreferences, savePreferences } from "@/lib/preferences";
import { formatDob } from "@/lib/utils";
import { usePointsBalance, refreshPoints } from "@/lib/points";
import { TopupPanel } from "@/components/topup/TopupPanel";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useToast } from "@/components/motion";
import { PointsHome } from "@/components/points/PointsHome";
import styles from "./AccountPage.module.css";

const exploreLinks = [
  ["Tử Vi", "/tuvi"], ["Tarot", "/tarot"],
  ["Cung Hoàng Đạo", "/cunghoangdao"], ["Kinh Dịch", "/kinhdich"],
  ["Bát Tự", "/battu"], ["Thần Số Học", "/thansohoc"],
] as const;

export function AccountPage() {
  const syncStatus=useCloudSyncStatus();
  const search = useSearchParams();
  const selected = search.get("section");
  const section = ["personal","account","preferences","points","earn"].includes(selected || "") ? selected : null;
  const titles: Record<string,string> = {personal:"Thông tin cá nhân",account:"Tài khoản",preferences:"Hiển thị & trải nghiệm",points:"AstroX Point",earn:"Kiếm thêm Point"};
  const profile = useProfile();
  const { open } = useProfileModal();
  const { loggedIn, ready, displayName, astroxUser, supabaseUser, logout } = useAuth();
  const settings = usePreferences();
  const preview = astroxUser?.id === "localhost-preview";
  const { points, status: pointsStatus, refresh: refreshBalance } = usePointsBalance(!preview);
  const pointsError = pointsStatus === "error" && points === null;
  const [topup, setTopup] = useState(false);
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const toast = useToast();
  const lastTopupFlag = useRef("");
  useEffect(() => {
    if (!astroxUser || preview) return;
    void refreshPoints();
  }, [astroxUser, preview]);
  // Quay về từ PayOS: cập nhật số dư ngay + báo kết quả một lần cho mỗi lần nạp.
  useEffect(() => {
    if (preview || !ready || !loggedIn) return;
    const flag = search.get("cancel")==="true"||search.get("status")==="CANCELLED"?"cancelled":search.get("topup")||(search.get("status")==="PAID"?"success":null);
    if (!flag || lastTopupFlag.current === flag) return;
    lastTopupFlag.current = flag;
    if (flag === "success") {
      void refreshPoints(true);
      toast.show("Đã quay về từ thanh toán. Số dư cập nhật khi giao dịch được xác nhận.", "success");
    } else if(flag==="cancelled"||flag==="cancel") {toast.show("Bạn đã hủy thanh toán. Chưa ghi nhận nạp Point.","info");}
  }, [search, toast, preview, ready, loggedIn]);
  const update = (patch: Parameters<typeof savePreferences>[0]) => {
    try { savePreferences(patch); setMessage("Đã lưu cài đặt trên thiết bị này."); }
    catch { setMessage("Không lưu được cài đặt. Kiểm tra quyền lưu trữ của trình duyệt."); }
  };
  const name = loggedIn ? profile?.name || displayName || "Tài khoản của bạn" : "Chào mừng đến AstroX";
  return <div className={styles.page}>
    <h1 className="sr-only">Hồ sơ & cài đặt</h1>
    {!section ? <div className={styles.accountHome}>
    <header className={`${styles.identity} ${!loggedIn ? styles.guestIdentity : ""}`}>
      <span className={styles.avatar} aria-hidden="true">{loggedIn ? name.slice(0,1).toUpperCase() : <FeatureIcon name="profile" size={28} />}</span>
      <div>
        <span className={styles.authStatus} role="status">{!ready ? "Đang kiểm tra đăng nhập…" : loggedIn ? preview ? "Xem thử · localhost" : astroxUser ? "Đã đăng nhập bằng Zalo" : "Đã đăng nhập" : "Chưa đăng nhập"}</span>
        <h2>{name}</h2>
        {loggedIn && <p>{supabaseUser?.email || "Quản lý tài khoản và thông tin cá nhân của bạn."}</p>}
        {loggedIn && !preview && <p role="status" className={styles.syncStatus}>{syncStatus}</p>}
      </div>
      {ready && (loggedIn ? <Link className={styles.identityEdit} href="/hoso?section=personal">{profile ? "Chỉnh sửa" : "Thiết lập"} ↗</Link> : <div className={styles.loginAction}><button className={styles.primaryLogin} onClick={openLoginDialog}>Đăng nhập</button></div>)}
    </header>
      <nav className={styles.accountMenu} aria-label="Quản lý hồ sơ">
        <Link href="/hoso?section=personal"><span className={styles.menuIcon}><FeatureIcon name="profile" size={23}/></span><div><h2>Thông tin cá nhân</h2><p>Họ tên, ngày giờ và nơi sinh</p></div><span aria-hidden="true">↗</span></Link>
        <Link href="/hoso?section=points"><span className={`${styles.menuIcon} ${styles.menuIconPoint}`}><FeatureIcon name="wallet" size={23}/></span><div><h2>AstroX Point</h2><p>Số dư, nạp Point, kiếm Point và lịch sử</p></div><span aria-hidden="true">↗</span></Link>
        <Link href="/hoso?section=account"><span className={styles.menuIcon}><FeatureIcon name="settings" size={23}/></span><div><h2>Tài khoản</h2><p>Đăng nhập và thông tin tài khoản</p></div><span aria-hidden="true">↗</span></Link>
        <Link href="/hoso?section=preferences"><span className={styles.menuIcon}><FeatureIcon name="motion" size={23}/></span><div><h2>Hiển thị & trải nghiệm</h2><p>Chuyển động, cỡ chữ và vận trình</p></div><span aria-hidden="true">↗</span></Link>
      </nav>
        <section className={styles.section} aria-label="Về AstroX"><header><h2><FeatureIcon name="home" size={22} />Về AstroX</h2></header><div className={styles.brand}><Link href="/" aria-label="AstroX — Trang chủ" className={styles.logo}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, logo PNG tĩnh */}
              <img src="/assets/logo.png" alt="AstroX" width={1254} height={1254} />
            </Link><div><p className={styles.tagline}>Một hành trình hiểu mình.</p><p className={styles.brandNote}>Lắng nghe bản thân, theo cách của bạn.</p></div></div><nav aria-label="Khám phá AstroX" className={styles.explore}><p>Khám phá cùng AstroX</p><div className={styles.exploreGrid}>{exploreLinks.map(([title, href]) => <Link href={href} key={href}>{title}<span aria-hidden="true">↗</span></Link>)}</div></nav><Link className={styles.termsLink} href="/dieukhoan">Các điều khoản &amp; Thoả thuận<span aria-hidden="true">↗</span></Link><div className={styles.aboutBottom}><span>© {new Date().getFullYear()} AstroX</span><span className={styles.credit}>Designed &amp; Developed by <strong>Tsonniverse Studio™</strong></span></div></section>
    </div> : <div key={section} className={styles.accountDetail}>
      <header className={styles.detailHeading}><Link href={section === "earn" ? "/hoso?section=points" : "/hoso"} aria-label={section === "earn" ? "Quay lại AstroX Point" : "Quay lại Hồ sơ"}>←</Link><h2>{titles[section]}</h2></header>
      {section === "personal" && <>
        <section className={styles.section}><header><h2><FeatureIcon name="profile" size={22} />Thông tin cá nhân</h2><button className={styles.editProfile} onClick={()=>open()}>{profile?"Chỉnh sửa":"Thiết lập"} ↗</button></header>{profile ? <dl className={styles.details}>{[["Tên gọi",profile.name],["Họ tên đầy đủ",profile.fullName || "Chưa bổ sung"],["Giới tính",profile.gender],["Ngày sinh",profile.dob ? formatDob(profile.dob) : "Chưa bổ sung"],["Giờ sinh",profile.birthTime ? `${profile.birthTime} · ${profile.hourChi}` : profile.hourChi || "Chưa bổ sung"],["Nơi sinh",profile.place || "Chưa bổ sung"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <div className={styles.empty}><p>Thêm thông tin sinh để sử dụng các tính năng cá nhân hóa.</p><button onClick={() => open()}>Thiết lập hồ sơ ↗</button></div>}</section>
      </>}
      {section === "account" && <>

        <section className={styles.section}><header><h2><FeatureIcon name="wallet" size={22} />Tài khoản</h2></header>{loggedIn ? <><div className={styles.row}><div><h3>Tài khoản đang đăng nhập</h3><p>{preview ? "Tài khoản xem thử trên localhost" : astroxUser ? "Zalo" : supabaseUser?.email || "Tài khoản AstroX"}</p></div><span className={styles.connected}>Đã đăng nhập</span></div>{astroxUser && <div className={styles.row}><div><h3>AstroX Point</h3><p>Điểm nạp bằng tiền, dùng để mở khóa dịch vụ AstroX.</p><p>{preview ? "1.000 Point · số dư minh họa" : pointsError ? "Chưa tải được số dư" : points === null ? "Đang tải…" : `${points.toLocaleString("vi-VN")} Point`}</p></div><span className={styles.rowActions}><Link className={styles.rowLink} href="/hoso?section=points">Ví Point ↗</Link><button disabled={preview} onClick={() => setTopup(true)}>{preview ? "Xem thử" : "Nạp Point ↗"}</button></span></div>}<button className={styles.logout} disabled={loggingOut} onClick={async () => { if (!confirm("Đăng xuất khỏi AstroX?")) return; setLoggingOut(true); try { await logout(); } finally { setLoggingOut(false); } }}>{loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}</button></> : <div className={styles.row}><div><h3>AstroX Point</h3><p>Đăng nhập để xem số dư, nạp Point và quản lý dịch vụ đã mở khóa.</p></div><button onClick={openLoginDialog} disabled={!ready}>Đăng nhập ↗</button></div>}</section>
      </>}
      {(section === "points" || section === "earn") && <PointsHome view={section === "earn" ? "earn" : "wallet"} />}
      {section === "preferences" && <>
        <section className={styles.section}><header><h2><FeatureIcon name="settings" size={22} />Hiển thị & trải nghiệm</h2></header><div className={styles.row}><div><h3><FeatureIcon name="motion" size={19} />Giảm chuyển động</h3><p>Giảm hiệu ứng động trong giao diện.</p></div><button role="switch" aria-checked={settings.motion === "reduced"} aria-label="Giảm chuyển động" className={styles.toggle} onClick={() => update({motion:settings.motion === "reduced" ? "system" : "reduced"})}><i /></button></div><label className={styles.row}><div><h3><FeatureIcon name="text" size={19} />Cỡ chữ luận giải</h3><p>Áp dụng cho nội dung AstroX.</p></div><select value={settings.readingSize} onChange={e => update({readingSize:e.target.value as "normal"|"large"})}><option value="normal">Tiêu chuẩn</option><option value="large">Lớn</option></select></label><label className={styles.row}><div><h3><FeatureIcon name="calendar" size={19} />Kỳ vận trình mặc định</h3><p>Khi mở mục Vận trình Tử Vi.</p></div><select value={settings.period} onChange={e => update({period:e.target.value as "today"|"week"|"month"})}><option value="today">Hôm nay</option><option value="week">Tuần này</option><option value="month">Tháng này</option></select></label></section>
        <p className={styles.saved} role="status">{message || "Cài đặt hiển thị được lưu riêng trên thiết bị này."}</p>

      </>}
      {loggedIn && !preview && <p role="status" className={styles.syncStatus}>{syncStatus}</p>}
    </div>}
    <TopupPanel open={topup} onClose={() => { setTopup(false); void refreshBalance(); }} />
  </div>;
}
