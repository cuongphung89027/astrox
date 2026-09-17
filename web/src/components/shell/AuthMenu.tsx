"use client";

/**
 * Control đăng nhập/tài khoản cho header (compact, ngang hàng nav).
 *
 * - Chưa đăng nhập: nút "Đăng nhập Zalo" → zaloLogin().
 * - Đã đăng nhập: nút tròn chữ cái đầu → popover glass: tên hiển thị, loại
 *   tài khoản (Zalo/Supabase), số Point (fetch khi mở, chỉ với tài khoản Zalo),
 *   "Sửa hồ sơ" (ProfileModal), "Nạp Point" (TopupPanel — chỉ Zalo), "Đăng xuất".
 *
 * Lưu ý: AuthMenu nằm NGOÀI <ProfileModalProvider> (AppShell chỉ bọc <main>),
 * useProfileModal() ở đây trả control uỷ quyền qua registry của Provider.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { fetchMeWithPoints } from "@/lib/api";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { TopupPanel } from "@/components/topup/TopupPanel";

export function AuthMenu() {
  const { loggedIn, displayName, astroxUser, zaloLogin, logout } = useAuth();
  const { open: openProfileModal } = useProfileModal();

  const [menuOpen, setMenuOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [points, setPoints] = useState<number | null>(null); // null = đang tải
  const pointsFetchedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    // Lấy số Point một lần khi mở popover lần đầu (chỉ tài khoản Zalo).
    if (next && astroxUser && !pointsFetchedRef.current) {
      pointsFetchedRef.current = true;
      fetchMeWithPoints().then((r) => setPoints(r.points));
    }
  };

  // Đóng khi click ngoài + Escape (trả focus về nút mở).
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && e.target instanceof Node && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Reset cờ fetch point khi đăng xuất rồi đăng nhập lại bằng user khác.
  useEffect(() => {
    if (!astroxUser) {
      pointsFetchedRef.current = false;
      setPoints(null);
    }
  }, [astroxUser]);

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={zaloLogin}
        className="rounded-full bg-son px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-transform hover:-translate-y-0.5"
      >
        Đăng nhập Zalo
      </button>
    );
  }

  const accountType = astroxUser ? "Tài khoản Zalo" : "Tài khoản Supabase";

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`Tài khoản ${displayName}`}
        title={displayName}
        className="grid size-9 place-items-center rounded-full bg-cham text-sm font-bold text-white shadow-[var(--shadow-glass)] ring-2 ring-white/60 transition-transform hover:-translate-y-0.5"
      >
        {(displayName || "?").trim().charAt(0).toUpperCase()}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Menu tài khoản"
          className="glass-strong absolute right-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-card)] p-4"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-cham font-display text-base font-extrabold text-white"
            >
              {(displayName || "?").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-muc" title={displayName}>
                {displayName}
              </p>
              <p className="text-[11.5px] font-medium text-muc-2">{accountType}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/65 px-3.5 py-2.5">
            <span className="text-xs font-semibold text-muc-2">AstroX Point</span>
            {astroxUser ? (
              <span className="font-display text-sm font-extrabold text-kim-deep">
                {points === null ? "— Point" : `${points.toLocaleString("vi-VN")} Point`}
              </span>
            ) : (
              <span className="text-[11.5px] font-medium text-muc-2">Xem Point trong tài khoản Zalo</span>
            )}
          </div>

          <div className="mt-3 grid gap-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                openProfileModal();
              }}
              className="rounded-xl bg-white/65 px-3.5 py-2 text-left text-sm font-semibold text-muc transition-colors hover:bg-white"
            >
              ✎ Sửa hồ sơ
            </button>
            {astroxUser ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  setTopupOpen(true);
                }}
                className="rounded-xl bg-white/65 px-3.5 py-2 text-left text-sm font-semibold text-muc transition-colors hover:bg-white"
              >
                ◍ Nạp Point
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                if (confirm("Đăng xuất khỏi AstroX?")) logout();
              }}
              className="rounded-xl px-3.5 py-2 text-left text-sm font-semibold text-son transition-colors hover:bg-son-tint"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}

      <TopupPanel open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
}
