"use client";

/**
 * CONTRACT — file này thuộc quyền sở hữu của tác giả Giai đoạn B2.
 * B1 chỉ được *render* <AuthMenu/> trong header, không sửa file.
 *
 * - Compact control cho header: hiển thị avatar/chữ cái đầu hoặc nút "Đăng nhập".
 * - Mở menu: trạng thái đăng nhập (Supabase + Zalo), số Point, "Nạp Point"
 *   (topup packages/history/promo/PayOS), đăng xuất.
 * - Dùng useAuth() từ @/lib/auth và topup API từ @/lib/api.
 *
 * BẢN STUB: chỉ login/logout + tên hiển thị.
 */
import { useAuth } from "@/lib/auth";

export function AuthMenu() {
  const { loggedIn, displayName, zaloLogin, logout } = useAuth();
  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={zaloLogin}
        className="rounded-full bg-son px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-pop)]"
      >
        Đăng nhập
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Đăng xuất khỏi AstroX?")) logout();
      }}
      title={displayName}
      className="grid size-9 place-items-center rounded-full bg-cham text-sm font-bold text-white"
    >
      {(displayName || "?").charAt(0).toUpperCase()}
    </button>
  );
}
