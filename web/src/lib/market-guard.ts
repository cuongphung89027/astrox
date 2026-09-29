'use client';

/**
 * Store popup cảnh báo market (Sơn 29/09): tài khoản gắn một quốc gia —
 * Zalo → bản Việt Nam, Google → bản United States. Hai tình huống dùng popup:
 * - 'mismatch': tài khoản đang đăng nhập không đúng với cây đang xem → cảnh
 *   báo rồi tự động đăng xuất.
 * - 'switch': người dùng đã đăng nhập bấm nút đổi ngôn ngữ → cảnh báo sẽ bị
 *   đăng xuất trước khi chuyển cây.
 * Pattern giống login-dialog: mọi module gọi được open, chỉ 1 nơi render.
 */
import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/locale';

export type MarketGuardReason = 'mismatch' | 'switch';

export interface MarketGuardState {
  open: boolean;
  reason: MarketGuardReason | null;
  /** Chỉ dùng cho 'switch': locale đích và URL đã tính sẵn để chuyển sau logout. */
  target: { locale: Locale; href: string } | null;
}

let state: MarketGuardState = { open: false, reason: null, target: null };
const listeners = new Set<(next: MarketGuardState) => void>();

function emit() {
  for (const l of listeners) l(state);
}

export function openMarketGuard(reason: MarketGuardReason, target?: { locale: Locale; href: string }) {
  state = { open: true, reason, target: target ?? null };
  emit();
}

export function closeMarketGuard() {
  // Giữ reason/target để dialog đóng không nhấp nháy đổi nội dung ở frame cuối.
  state = { ...state, open: false };
  emit();
}

export function useMarketGuard(): MarketGuardState {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    listeners.add(setSnap);
    return () => {
      listeners.delete(setSnap);
    };
  }, []);
  return snap;
}
