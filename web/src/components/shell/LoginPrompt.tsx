'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { closeLoginDialog, openLoginDialog, useLoginDialogOpen } from '@/lib/login-dialog';
import { hasTermsConsent, saveTermsConsent, termsHref } from '@/lib/terms';
import { GoogleG, ZaloWordmark } from '@/components/kit/BrandLogos';
import { FlagUS, FlagVN } from '@/components/kit/Flags';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './LoginPrompt.module.css';

/**
 * Popup đăng nhập trung tâm — mọi nút "Đăng nhập" trên site đều mở popup này
 * (openLoginDialog) thay vì điều hướng thẳng tới Zalo. Ngoài ra popup vẫn tự mở
 * một lần mỗi lượt ghé thăm để mời khách (giữ hành vi cũ).
 *
 * Bước 1 là chọn khu vực (Sơn 29/09): Việt Nam (cờ VN) → Zalo, United States
 * (cờ US) → Google. Một tài khoản chỉ dùng tại một quốc gia, nên provider đi
 * theo khu vực đã chọn chứ không theo cây đang xem.
 *
 * Bắt buộc tích đồng ý với bộ điều khoản (Điều khoản sử dụng · Miễn trừ trách
 * nhiệm · Bảo mật thông tin cá nhân) trước khi sang provider. Đồng ý được
 * ghi nhớ theo TERMS_VERSION — đổi phiên bản điều khoản thì hỏi lại.
 */
type Region = 'VN' | 'US';

export function LoginPrompt() {
  const t = useLocale();
  const pathname = usePathname();
  const { ready, loggedIn, zaloLogin, googleLogin } = useAuth();
  const open = useLoginDialogOpen();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const invited = useRef(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [region, setRegion] = useState<Region | null>(null);

  // Lần đầu mount: hiện checkbox theo sự đồng ý đã lưu. setTimeout(0) — đọc
  // localStorage sau khi hydration xong (pattern chung của app, tránh lệch SSR).
  useEffect(() => {
    const id = setTimeout(() => setConsent(hasTermsConsent()), 0);
    return () => clearTimeout(id);
  }, []);

  // Mời khách một lần mỗi lượt ghé thăm (đóng rồi thì không tự mở lại trong phiên).
  useEffect(() => {
    if ([moduleRoute('pricing', t.locale), moduleRoute('terms', t.locale)].includes(pathname)) return;
    if (ready && !loggedIn && !invited.current) {
      invited.current = true;
      openLoginDialog();
    }
  }, [ready, loggedIn, pathname, t]);

  // Đồng bộ store ↔ <dialog> native (focus trap + Esc gratis từ showModal).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      return () => {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Native <dialog> có thể bị đóng ngoài luồng React (script/extension) —
  // sync store để nút Đăng nhập lần sau vẫn mở lại được thay vì no-op.
  function handleNativeClose() {
    if (open) closeLoginDialog();
    document.body.style.overflow = '';
  }

  // Đóng popup thì về bước chọn khu vực cho lần mở sau (tránh setState
  // synchronously trong effect).
  function close() {
    setError('');
    setRegion(null);
    closeLoginDialog();
  }

  function chooseRegion(next: Region) {
    setError('');
    setRegion(next);
  }

  function proceed() {
    if (!region) return;
    if (!consent) {
      setError(t.t('login.consentError'));
      checkboxRef.current?.focus();
      return;
    }
    saveTermsConsent();
    if (region === 'US') googleLogin();
    else zaloLogin();
  }

  const currentRegion: Region = t.locale === 'en' ? 'US' : 'VN';

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-description"
      onClose={handleNativeClose}
      onCancel={event => {
        event.preventDefault();
        close();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <button type="button" className={styles.close} aria-label={t.t('login.closeAria')} onClick={close} autoFocus>
        ×
      </button>
      <header className={styles.hero}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Original brand asset. */}
          <img className={styles.logo} src="/assets/logo.png" alt="AstroX" width={56} height={56} />
        </div>
        <h2 id="login-prompt-title">{region === null ? t.t('login.regionTitle') : t.t('login.title')}</h2>
        <p id="login-prompt-description" className={styles.description}>
          {region === null ? t.t('login.regionHint') : t.t('login.description')}
        </p>
        <span className={styles.orbit} aria-hidden="true" />
      </header>
      <div className={styles.body}>
        {region === null ? (
          <>
            {/* Hai nút đồng kích thước/bố cục; khu vực đang xem nền xanh + nhãn (Sơn 29/09). */}
            <button
              type="button"
              className={`${styles.region} ${currentRegion === 'VN' ? styles.regionCurrent : ''}`}
              onClick={() => chooseRegion('VN')}
            >
              <FlagVN size={26} />
              <span className={styles.regionName}>Việt Nam</span>
              {currentRegion === 'VN' && <span className={styles.regionTag}>{t.t('login.regionCurrent')}</span>}
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </button>
            <button
              type="button"
              className={`${styles.region} ${currentRegion === 'US' ? styles.regionCurrent : ''}`}
              onClick={() => chooseRegion('US')}
            >
              <FlagUS size={26} />
              <span className={styles.regionName}>United States</span>
              {currentRegion === 'US' && <span className={styles.regionTag}>{t.t('login.regionCurrent')}</span>}
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </button>
          </>
        ) : (
          <>
            {region === 'US' ? (
              <button type="button" className={styles.googleActive} onClick={proceed} aria-disabled={!consent}>
                <GoogleG size={20} />
                <span>{t.t('login.continueGoogle')}</span>
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </button>
            ) : (
              <button type="button" className={styles.zalo} onClick={proceed} aria-disabled={!consent}>
                <ZaloWordmark size={20} />
                <span>{t.t('login.continueZalo')}</span>
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </button>
            )}
            <button type="button" className={styles.changeRegion} onClick={() => setRegion(null)}>
              {region === 'US' ? <FlagUS size={16} /> : <FlagVN size={16} />}
              {t.t('login.changeRegion')}
            </button>
          </>
        )}
        <p className={styles.consentError} role={error ? 'alert' : undefined}>
          {error}
        </p>
        <div className={styles.consent}>
          <input
            ref={checkboxRef}
            aria-labelledby="login-consent-label"
            type="checkbox"
            checked={consent}
            onChange={event => {
              setConsent(event.target.checked);
              if (event.target.checked) setError('');
            }}
          />
          <span id="login-consent-label">
            {t.t('login.consentAgree')}{' '}
            <Link href={termsHref('terms')} onClick={close} aria-label={t.t('login.terms')}>
              {t.t('login.terms')}
            </Link>
            ,{' '}
            <Link href={termsHref('disclaimer')} onClick={close} aria-label={t.t('login.disclaimer')}>
              {t.t('login.disclaimer')}
            </Link>{' '}
            {t.t('login.and')}{' '}
            <Link href={termsHref('privacy')} onClick={close} aria-label={t.t('login.privacy')}>
              {t.t('login.privacy')}
            </Link>
            .
          </span>
        </div>

        <button type="button" className={styles.later} onClick={close}>
          {t.t('login.later')}
        </button>
      </div>
    </dialog>
  );
}
