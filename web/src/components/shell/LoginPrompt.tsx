"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import styles from "./LoginPrompt.module.css";

/** One invitation per document visit; route navigation does not reset dismissal. */
export function LoginPrompt() {
  const { ready, loggedIn, zaloLogin } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !ready || loggedIn || dismissed.current) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [ready, loggedIn]);

  function close() {
    dismissed.current = true;
    dialogRef.current?.close();
    document.body.style.overflow = "";
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="login-prompt-title" aria-describedby="login-prompt-description"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      } }}>
      <button type="button" className={styles.close} aria-label="Đóng lời mời đăng nhập" onClick={close} autoFocus>×</button>
      {/* eslint-disable-next-line @next/next/no-img-element -- Original brand asset. */}
      <img className={styles.logo} src="/assets/logo.png" alt="AstroX" width={80} height={80} />
      <p className={styles.eyebrow}>Chào bạn đến với AstroX</p>
      <h2 id="login-prompt-title">Bắt đầu hành trình<br />hiểu mình.</h2>
      <p id="login-prompt-description" className={styles.description}>Đăng nhập bằng Zalo để sử dụng tài khoản AstroX của bạn. Bạn cũng có thể khám phá trước và đăng nhập sau.</p>
      <button type="button" className={styles.login} onClick={zaloLogin}>Đăng nhập bằng Zalo <span aria-hidden="true">↗</span></button>
      <button type="button" className={styles.later} onClick={close}>Để sau, mình muốn khám phá trước</button>
    </dialog>
  );
}
