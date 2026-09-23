"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { closeLoginDialog, openLoginDialog, useLoginDialogOpen } from "@/lib/login-dialog";
import { hasTermsConsent, saveTermsConsent, termsHref } from "@/lib/terms";
import { GoogleG, ZaloWordmark } from "@/components/kit/BrandLogos";
import styles from "./LoginPrompt.module.css";

/**
 * Popup đăng nhập trung tâm — mọi nút "Đăng nhập" trên site đều mở popup này
 * (openLoginDialog) thay vì điều hướng thẳng tới Zalo. Ngoài ra popup vẫn tự mở
 * một lần mỗi lượt ghé thăm để mời khách (giữ hành vi cũ).
 *
 * Bắt buộc tích đồng ý với bộ điều khoản (Điều khoản sử dụng · Miễn trừ trách
 * nhiệm · Bảo mật thông tin cá nhân theo ND13) trước khi sang Zalo. Đồng ý được
 * ghi nhớ theo TERMS_VERSION — đổi phiên bản điều khoản thì hỏi lại.
 */
export function LoginPrompt() {
  const { ready, loggedIn, zaloLogin } = useAuth();
  const open = useLoginDialogOpen();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const invited = useRef(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  // Lần đầu mount: hiện checkbox theo sự đồng ý đã lưu. setTimeout(0) — đọc
  // localStorage sau khi hydration xong (pattern chung của app, tránh lệch SSR).
  useEffect(() => {
    const id = setTimeout(() => setConsent(hasTermsConsent()), 0);
    return () => clearTimeout(id);
  }, []);

  // Mời khách một lần mỗi lượt ghé thăm (đóng rồi thì không tự mở lại trong phiên).
  useEffect(() => {
    if (ready && !loggedIn && !invited.current) {
      invited.current = true;
      openLoginDialog();
    }
  }, [ready, loggedIn]);

  // Đồng bộ store ↔ <dialog> native (focus trap + Esc gratis từ showModal).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const previousOverflow = document.body.style.overflow;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      return () => {
        dialog.close();
        document.body.style.overflow = previousOverflow;
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    setError("");
    closeLoginDialog();
  }

  function proceedZalo() {
    if (!consent) {
      setError("Vui lòng tích đồng ý với các điều khoản trước khi tiếp tục.");
      checkboxRef.current?.focus();
      return;
    }
    saveTermsConsent();
    zaloLogin();
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="login-prompt-title" aria-describedby="login-prompt-description"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      } }}>
      <button type="button" className={styles.close} aria-label="Đóng hộp thoại đăng nhập" onClick={close} autoFocus>×</button>
      {/* eslint-disable-next-line @next/next/no-img-element -- Original brand asset. */}
      <img className={styles.logo} src="/assets/logo.png" alt="AstroX" width={80} height={80} />
      <p className={styles.eyebrow}>Chào bạn đến với AstroX</p>
      <h2 id="login-prompt-title">Bắt đầu hành trình<br />hiểu mình.</h2>
      <p id="login-prompt-description" className={styles.description}>Chọn cách đăng nhập để đồng bộ hồ sơ, ví AstroX Point và lịch sử luận giải của bạn. Bạn cũng có thể khám phá trước và đăng nhập sau.</p>

      <div className={styles.providers}>
        <button type="button" className={styles.zalo} onClick={proceedZalo} aria-disabled={!consent}>
          <ZaloWordmark size={17} />
          <span>Đăng nhập bằng Zalo</span>
        </button>
        <button type="button" className={styles.google} disabled title="Đăng nhập bằng Google sẽ sớm sẵn sàng">
          <GoogleG size={18} />
          <span>Đăng nhập bằng Google</span>
          <span className={styles.soon}>Đang phát triển</span>
        </button>
      </div>

      <p className={styles.consentError} role={error ? "alert" : undefined}>{error}</p>
      <label className={styles.consent}>
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={consent}
          onChange={event => {
            setConsent(event.target.checked);
            if (event.target.checked) setError("");
          }}
        />
        <span>
          Tôi đã đọc và đồng ý với{" "}
          <Link href={termsHref("terms")} onClick={close}>Điều khoản sử dụng</Link>,{" "}
          <Link href={termsHref("disclaimer")} onClick={close}>Tuyên bố miễn trừ trách nhiệm</Link>{" "}
          và <Link href={termsHref("privacy")} onClick={close}>Thoả thuận xử lý và bảo mật thông tin cá nhân</Link>{" "}
          theo Nghị định 13/2023/NĐ-CP của Chính phủ.
        </span>
      </label>

      <button type="button" className={styles.later} onClick={close}>Để sau, mình muốn khám phá trước</button>
    </dialog>
  );
}
