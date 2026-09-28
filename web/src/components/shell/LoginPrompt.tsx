'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { closeLoginDialog, openLoginDialog, useLoginDialogOpen } from '@/lib/login-dialog';
import { hasTermsConsent, saveTermsConsent, termsHref } from '@/lib/terms';
import { GoogleG, ZaloWordmark } from '@/components/kit/BrandLogos';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './LoginPrompt.module.css';

/**
 * Popup đăng nhập trung tâm — mọi nút "Đăng nhập" trên site đều mở popup này
 * (openLoginDialog) thay vì điều hướng thẳng tới Zalo. Ngoài ra popup vẫn tự mở
 * một lần mỗi lượt ghé thăm để mời khách (giữ hành vi cũ).
 *
 * Bắt buộc tích đồng ý với bộ điều khoản (Điều khoản sử dụng · Miễn trừ trách
 * nhiệm · Bảo mật thông tin cá nhân) trước khi sang Zalo. Đồng ý được
 * ghi nhớ theo TERMS_VERSION — đổi phiên bản điều khoản thì hỏi lại.
 */
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

  function close() {
    setError('');
    closeLoginDialog();
  }

  const us = t.locale === 'en';
  function proceed() {
    if (!consent) {
      setError(t.t('login.consentError'));
      checkboxRef.current?.focus();
      return;
    }
    saveTermsConsent();
    if (us) googleLogin();
    else zaloLogin();
  }

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
        <h2 id="login-prompt-title">{t.t('login.title')}</h2>
        <p id="login-prompt-description" className={styles.description}>
          {t.t('login.description')}
        </p>
        <span className={styles.orbit} aria-hidden="true" />
      </header>
      <div className={styles.body}>
        {us ? (
          <button type="button" className={styles.google} onClick={proceed} aria-disabled={!consent}>
            <GoogleG size={20} />
            <span>{t.t('login.continueGoogle')}</span>
            <span className={styles.arrow} aria-hidden="true">
              ↗
            </span>
          </button>
        ) : (
          <>
            <button type="button" className={styles.zalo} onClick={proceed} aria-disabled={!consent}>
              <ZaloWordmark size={20} />
              <span>{t.t('login.continueZalo')}</span>
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </button>
            <button type="button" className={styles.google} disabled>
              <GoogleG size={20} />
              <span>Google</span>
              <small>{t.t('login.googleSoon')}</small>
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
