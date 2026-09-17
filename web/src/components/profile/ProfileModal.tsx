"use client";

/**
 * CONTRACT — file này thuộc quyền sở hữu của tác giả Giai đoạn B2.
 * B1 chỉ được *render* <ProfileModalProvider/> trong shell, không sửa file.
 *
 * - <ProfileModalProvider> bọc app; quản lý trạng thái mở/đóng modal hồ sơ.
 * - useProfileModal() → { open(opts?: { captive?: boolean }), close() }
 *   captive = true: modal không cho đóng (đăng nhập rồi mà chưa có hồ sơ).
 * - Tự thực hiện "captive check": loggedIn && !profile → open({captive:true}).
 * - Wizard các bước port từ pmStep của app cũ: gender → name → fullName
 *   (tuỳ chọn) → dob + place → hourChi → lưu (setProfile + onboarded).
 *
 * BẢN STUB dưới đây chỉ giữ contract; B2 thay toàn bộ nội dung.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useProfile } from "@/lib/use-store";

interface ProfileModalContextValue {
  open: (opts?: { captive?: boolean }) => void;
  close: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null);

export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
  const [openState, setOpenState] = useState(false);
  const [captive, setCaptive] = useState(false);

  const open = useCallback((opts?: { captive?: boolean }) => {
    setCaptive(!!opts?.captive);
    setOpenState(true);
  }, []);
  const close = useCallback(() => {
    if (captive) return; // captive: bắt buộc hoàn thành hồ sơ
    setOpenState(false);
  }, [captive]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      {openState ? (
        <div role="dialog" aria-modal="true" aria-label="Thiết lập hồ sơ" className="fixed inset-0 z-[80] grid place-items-center bg-muc/40 p-5">
          <div className="glass-strong w-full max-w-md rounded-[var(--radius-card)] p-8">
            <p className="font-display text-2xl font-extrabold">Thiết lập hồ sơ</p>
            <p className="mt-2 text-sm text-muc-2">Wizard hồ sơ sẽ được B2 dựng tại đây.</p>
          </div>
        </div>
      ) : null}
    </ProfileModalContext.Provider>
  );
}

export function useProfileModal(): ProfileModalContextValue {
  const ctx = useContext(ProfileModalContext);
  if (!ctx) throw new Error("useProfileModal phải nằm trong <ProfileModalProvider>");
  return ctx;
}

/** Hook tiện dùng cho các trang module: chưa có hồ sơ → mở modal. */
export function useRequireProfile() {
  const { open } = useProfileModal();
  const profile = useProfile();
  return useCallback(() => {
    if (!profile) {
      open();
      return false;
    }
    return true;
  }, [profile, open]);
}
