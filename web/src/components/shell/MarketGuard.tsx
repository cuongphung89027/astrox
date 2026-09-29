'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { closeMarketGuard, openMarketGuard, useMarketGuard } from '@/lib/market-guard';
import { FlagUS, FlagVN } from '@/components/kit/Flags';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './MarketGuard.module.css';

/**
 * Cảnh báo market (Sơn 29/09): một tài khoản chỉ dùng tại một quốc gia —
 * Zalo → Việt Nam, Google → United States.
 *
 * - Tự mở khi tài khoản đang đăng nhập lệch cây (ví dụ Zalo mở /en): đếm ngược
 *   10 giây rồi tự động đăng xuất; nút "Đăng xuất ngay" để ra tay luôn. Chế độ
 *   này không đóng được bằng Esc/ngoài popup — phải logout.
 * - Mở bởi nút quả địa cầu khi đang đăng nhập: xác nhận trước khi logout +
 *   chuyển cây, hoặc ở lại.
 */
const AUTO_LOGOUT_SECONDS = 10;

export function MarketGuard() {
  const t = useLocale();
  const { ready, loggedIn, astroxUser, market, logout } = useAuth();
  const guard = useMarketGuard();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [seconds, setSeconds] = useState(AUTO_LOGOUT_SECONDS);
  const warnedFor = useRef<Set<string>>(new Set());

  const treeMarket = t.locale === 'en' ? 'US' : 'VN';

  // Lưới an toàn: vào nhầm cây bằng URL trực tiếp/liên kết cũng bị chặn.
  const accountKey = astroxUser ? `${astroxUser.provider}:${astroxUser.id}` : '';
  useEffect(() => {
    if (ready && loggedIn && market && market !== treeMarket && accountKey && !warnedFor.current.has(accountKey)) {
      warnedFor.current.add(accountKey);
      openMarketGuard('mismatch');
    }
  }, [ready, loggedIn, market, treeMarket, accountKey]);

  // Đồng bộ store ↔ <dialog> native (không cho đóng khi mismatch).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (guard.open && !dialog.open) {
      setSeconds(AUTO_LOGOUT_SECONDS);
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      return () => {
        dialog.close();
        document.body.style.overflow = '';
      };
    }
    if (!guard.open && dialog.open) dialog.close();
  }, [guard.open]);

  // Đếm ngược + tự động logout khi mismatch (dọn timer khi đóng/unmount —
  // bẫy timer mồ côi đã gặp ở AuthMenu).
  useEffect(() => {
    if (!guard.open || guard.reason !== 'mismatch') return;
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          void logout().finally(() => closeMarketGuard());
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [guard.open, guard.reason, logout]);

  if (!guard.open || !guard.reason) return null;

  const providerIsGoogle = astroxUser?.provider === 'google';
  const switchToUS = guard.target?.locale === 'en';
  async function confirmLogoutNow() {
    await logout();
    closeMarketGuard();
  }
  async function confirmSwitch() {
    const href = guard.target?.href || '/';
    document.cookie = `axlang=${switchToUS ? 'en' : 'vi'}; path=/; max-age=31536000; samesite=lax; secure`;
    await logout();
    closeMarketGuard();
    window.location.assign(href);
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="market-guard-title"
      aria-describedby="market-guard-body"
      onCancel={event => {
        if (guard.reason === 'mismatch') event.preventDefault();
        else closeMarketGuard();
      }}
    >
      <header className={styles.hero}>
        <span className={styles.badge}>
          {market === 'US' || switchToUS ? <FlagUS size={20} /> : <FlagVN size={20} />}
          {guard.reason === 'mismatch' ? t.t('guard.badgeMismatch') : t.t('guard.badgeSwitch')}
        </span>
        <h2 id="market-guard-title">
          {guard.reason === 'mismatch' ? t.t('guard.mismatchTitle') : t.t('guard.switchTitle')}
        </h2>
        <p id="market-guard-body">
          {guard.reason === 'mismatch'
            ? providerIsGoogle
              ? t.t('guard.googleOnlyUS')
              : t.t('guard.zaloOnlyVN')
            : switchToUS
              ? t.t('guard.switchToUS')
              : t.t('guard.switchToVN')}
        </p>
      </header>
      <div className={styles.body}>
        {guard.reason === 'mismatch' && (
          <p className={styles.countdown} role="status">
            {t.t('guard.autoLogoutPrefix')} <strong>{seconds}s</strong>
          </p>
        )}
        {guard.reason === 'mismatch' ? (
          <button type="button" className={styles.primary} onClick={confirmLogoutNow}>
            {t.t('guard.logoutNow')}
          </button>
        ) : (
          <>
            <button type="button" className={styles.primary} onClick={confirmSwitch}>
              {t.t('guard.logoutAndSwitch')}
            </button>
            <button type="button" className={styles.secondary} onClick={closeMarketGuard}>
              {t.t('guard.stay')}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
