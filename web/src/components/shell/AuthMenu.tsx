'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { useProfile } from '@/lib/use-store';
import { usePointsBalance, refreshPoints } from '@/lib/points';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { useRouter } from 'next/navigation';
import { TopupPanel } from '@/components/topup/TopupPanel';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './AuthMenu.module.css';

export function AuthMenu() {
  const t = useLocale();
  const { loggedIn, displayName, astroxUser, logout } = useAuth();
  const profile = useProfile();
  // Tên gọi người dùng tự đặt ưu tiên trước tên từ kênh đăng nhập (Zalo).
  const name = profile?.name || displayName;
  const router = useRouter();
  const id = useId();
  const preview = astroxUser?.id === 'localhost-preview';
  const avatarUrl =
    typeof astroxUser?.avatar_url === 'string'
      ? astroxUser.avatar_url
      : typeof astroxUser?.avatar === 'string'
        ? astroxUser.avatar
        : '';
  const [failedAvatar, setFailedAvatar] = useState('');
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const { points, status, market } = usePointsBalance(!preview);
  const unit = market ? (market === 'US' ? 'Credits' : 'Point') : t.locale === 'en' ? 'Credits' : 'Point';
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
    if (open) return;
    // Timer tắt panel có thể là bản mồ côi từ lần mount/effect trước (StrictMode
    // dev + provider swap từng để sót, nổ muộn sau khi menu mở lại) — chỉ đóng
    // khi open vẫn còn false.
    const timer = setTimeout(() => {
      if (!openRef.current) setPresent(false);
    }, 160);
    return () => clearTimeout(timer);
  }, [open]);
  // Mở menu = chạm nhẹ store (TTL 60s bên trong, không spam /api/me).
  useEffect(() => {
    if (open && astroxUser && !preview) void refreshPoints();
  }, [open, astroxUser, preview]);
  useEffect(() => {
    if (!open || !present) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => {
      if (e.target instanceof Node && !wrap.current?.contains(e.target)) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        trigger.current?.focus();
      }
      const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') || []);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [open, present, close]);
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const profileHref = moduleRoute('profile', t.locale);
  const avatar =
    avatarUrl && failedAvatar !== avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element -- Remote account avatar.
      <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatarUrl)} />
    ) : (
      <FeatureIcon name="profile" size={23} />
    );
  if (!loggedIn)
    return (
      <button
        type="button"
        onClick={openLoginDialog}
        className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white"
      >
        {t.t('auth.login')}
      </button>
    );
  return (
    <div
      ref={wrap}
      className={styles.wrap}
      onBlur={e => {
        // WebKit trả relatedTarget=null khi click phần tử trong menu — coi như chưa rời,
        // click ngoài vẫn đóng qua listener pointerdown dưới đó.
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          if (!open) setPresent(true);
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={present ? id : undefined}
        aria-label={t.t('auth.accountOf', { name: name || '' })}
        className={styles.trigger}
      >
        {avatar}
      </button>
      {present && (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={t.t('auth.accountMenu')}
          className={styles.panel}
          data-open={open}
          inert={!open}
        >
          <div className={styles.identity}>
            <span className={styles.avatar}>{avatar}</span>
            <div>
              <span className={styles.status}>{preview ? t.t('auth.preview') : t.t('auth.signedIn')}</span>
              <h2>{name}</h2>
            </div>
          </div>
          {astroxUser && (
            <div className={styles.wallet}>
              <button
                role="menuitem"
                className={styles.walletInfo}
                onClick={() => go(`${profileHref}?section=points`)}
                aria-label={t.t('auth.openWallet')}
              >
                <div>
                  <span>
                    <FeatureIcon name="wallet" size={17} />
                    AstroX {unit}
                  </span>
                  <p>
                    {preview
                      ? '1.000'
                      : status === 'error' && points === null
                        ? t.t('auth.loadFailed')
                        : points === null
                          ? '…'
                          : t.formatNumber(points)}
                    <small>{preview ? t.t('auth.demo') : !preview && points !== null ? unit : ''}</small>
                  </p>
                </div>
              </button>
              <button
                role="menuitem"
                className={styles.walletPlus}
                disabled={preview}
                onClick={() => {
                  close();
                  setTopupOpen(true);
                }}
                aria-label={t.t('auth.topup')}
              >
                <FeatureIcon name="explore" size={19} />
              </button>
            </div>
          )}
          <div className={styles.links}>
            <button role="menuitem" onClick={() => go(profileHref)}>
              <FeatureIcon name="profile" size={20} />
              <span>{t.t('auth.yourProfile')}</span>
              <i>↗</i>
            </button>
            <button role="menuitem" onClick={() => go(`${profileHref}?section=account`)}>
              <FeatureIcon name="wallet" size={20} />
              <span>{t.t('auth.manageAccount')}</span>
              <i>↗</i>
            </button>
            <button role="menuitem" onClick={() => go(`${profileHref}?section=preferences`)}>
              <FeatureIcon name="settings" size={20} />
              <span>{t.t('auth.displayExperience')}</span>
              <i>↗</i>
            </button>
          </div>
          <button
            role="menuitem"
            className={styles.logout}
            onClick={() => {
              close();
              if (confirm(t.locale === 'en' ? 'Sign out of AstroX?' : 'Đăng xuất khỏi AstroX?')) void logout();
            }}
          >
            <FeatureIcon name="logout" size={19} />
            {t.locale === 'en' ? 'Sign out' : 'Đăng xuất'}
          </button>
        </div>
      )}
      <TopupPanel
        open={topupOpen}
        onClose={() => {
          setTopupOpen(false);
          void refreshPoints(true);
        }}
      />
    </div>
  );
}
