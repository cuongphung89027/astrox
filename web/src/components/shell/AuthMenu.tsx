"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { openLoginDialog } from "@/lib/login-dialog";
import { useProfile } from "@/lib/use-store";
import { usePointsBalance, refreshPoints } from "@/lib/points";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useRouter } from "next/navigation";
import { TopupPanel } from "@/components/topup/TopupPanel";
import styles from "./AuthMenu.module.css";

export function AuthMenu() {
  const { loggedIn, displayName, astroxUser, logout } = useAuth();
  const profile = useProfile();
  // Tên gọi người dùng tự đặt ưu tiên trước tên từ kênh đăng nhập (Zalo/Supabase).
  const name = profile?.name || displayName;
  const router = useRouter();
  const id = useId();
  const preview = astroxUser?.id === "localhost-preview";
  const avatarUrl = typeof astroxUser?.avatar_url === "string" ? astroxUser.avatar_url : typeof astroxUser?.avatar === "string" ? astroxUser.avatar : "";
  const [failedAvatar, setFailedAvatar] = useState("");
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const { points, status } = usePointsBalance(!preview);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const [previousOpen,setPreviousOpen]=useState(open);
  if(open!==previousOpen){setPreviousOpen(open);if(open)setPresent(true);}
  useEffect(() => {
    if(open)return;
    const timer = setTimeout(() => setPresent(false), 160);
    return () => clearTimeout(timer);
  }, [open]);
  // Mở menu = chạm nhẹ store (TTL 60s bên trong, không spam /api/me).
  useEffect(() => {
    if (open && astroxUser && !preview) void refreshPoints();
  }, [open, astroxUser, preview]);
  useEffect(() => {
    if (!open || !present) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({preventScroll:true});
    const outside = (e: PointerEvent) => { if (e.target instanceof Node && !wrap.current?.contains(e.target)) close(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { close(); trigger.current?.focus(); }
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || []);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "Home" ? 0 : e.key === "End" ? items.length-1 : (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [open, present, close]);
  const go = (href: string) => { close(); router.push(href); };
  const avatar = avatarUrl && failedAvatar !== avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- Remote account avatar.
    <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatarUrl)}/>
  ) : <FeatureIcon name="profile" size={23}/>;
  if (!loggedIn) return <button type="button" onClick={openLoginDialog} className="rounded-full bg-son px-4 py-1.5 text-sm font-semibold text-white">Đăng nhập</button>;
  return <div ref={wrap} className={styles.wrap} onBlur={e => {
    // WebKit trả relatedTarget=null khi click phần tử trong menu — coi như chưa rời,
    // click ngoài vẫn đóng qua listener pointerdown dưới đó.
    if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) close();
  }}>
    <button ref={trigger} type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-controls={present ? id : undefined} aria-label={`Tài khoản ${name}`} className={styles.trigger}>{avatar}</button>
    {present && <div ref={menu} id={id} role="menu" aria-label="Menu tài khoản" className={styles.panel} data-open={open} inert={!open}>
      <div className={styles.identity}><span className={styles.avatar}>{avatar}</span><div><span className={styles.status}>{preview ? "Xem thử · localhost" : "Đã đăng nhập"}</span><h2>{name}</h2></div></div>
      {astroxUser && <div className={styles.wallet}><button role="menuitem" className={styles.walletInfo} onClick={() => go("/hoso?section=points")} aria-label="Mở Ví AstroX Point"><div><span><FeatureIcon name="wallet" size={17}/>AstroX Point</span><p>{preview ? "1.000" : status === "error" && points === null ? "Chưa tải được" : points === null ? "…" : points.toLocaleString("vi-VN")}<small>{preview ? "minh họa" : !preview && points !== null ? "Point" : ""}</small></p></div></button><button role="menuitem" className={styles.walletPlus} disabled={preview} onClick={() => { close(); setTopupOpen(true); }} aria-label="Nạp Point"><FeatureIcon name="explore" size={19}/></button></div>}
      <div className={styles.links}>
        <button role="menuitem" onClick={() => go("/hoso")}><FeatureIcon name="profile" size={20}/><span>Hồ sơ của bạn</span><i>↗</i></button>
        <button role="menuitem" onClick={() => go("/hoso?section=account")}><FeatureIcon name="wallet" size={20}/><span>Quản lý tài khoản</span><i>↗</i></button>
        <button role="menuitem" onClick={() => go("/hoso?section=preferences")}><FeatureIcon name="settings" size={20}/><span>Hiển thị & trải nghiệm</span><i>↗</i></button>
      </div>
      <button role="menuitem" className={styles.logout} onClick={() => { close(); if(confirm("Đăng xuất khỏi AstroX?")) void logout(); }}><FeatureIcon name="logout" size={19}/>Đăng xuất</button>
    </div>}
    <TopupPanel open={topupOpen} onClose={() => { setTopupOpen(false); void refreshPoints(true); }}/>
  </div>;
}
