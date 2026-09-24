"use client";

/**
 * CONTRACT — file này thuộc quyền sở hữu của tác giả Giai đoạn B2.
 * Giữ đúng 3 exports + semantics:
 *  - <ProfileModalProvider> (default wrap trong AppShell) — bọc app, render modal.
 *  - useProfileModal() → { open(opts?: { captive?: boolean }), close() }
 *    captive = true: modal KHÔNG cho đóng (đăng nhập rồi mà chưa có hồ sơ).
 *  - useRequireProfile() → () => boolean (chưa có hồ sơ → mở modal, return false).
 *
 * Lưu ý kiến trúc: AppShell render AuthMenu ở header NGOÀI Provider (Provider
 * chỉ bọc <main>). Vì vậy useProfileModal() khi gọi ngoài Provider không throw
 * mà trả về control "ủy quyền" qua registry module-level — Provider tự đăng ký
 * control của nó khi mount, nên AuthMenu vẫn mở được modal mà không cần sửa
 * AppShell. Trong Provider, hook hoạt động qua context như bình thường.
 *
 * Wizard port từ pmStep của app cũ: gender → name → fullName (tuỳ chọn) →
 * dob + place → hourChi → review + lưu (setProfile + onboarded). Provider tự
 * chạy captive check: loggedIn && !profile → open({captive:true}) sau khi tải dữ liệu tài khoản thành công.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCloudProfileReady } from "@/lib/cloud-sync";
import { useAuth } from "@/lib/auth";
import { setProfile } from "@/lib/state";
import { useProfile } from "@/lib/use-store";
import type { Profile } from "@/lib/types";
import { VN_PROVINCES } from "@/lib/provinces";
import { HOUR_CHI_OPTIONS } from "@/lib/utils";
import styles from "./ProfileModal.module.css";
import { FeatureIcon } from "@/components/kit/FeatureIcon";

/* ------------------------------------------------------------------ */
/* Context + registry (cho caller ngoài Provider —vd. AuthMenu header) */
/* ------------------------------------------------------------------ */

interface ProfileModalContextValue {
  open: (opts?: { captive?: boolean }) => void;
  close: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null);

let providerControls: ProfileModalContextValue | null = null;

export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
  const [openState, setOpenState] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  const [captive, setCaptive] = useState(false);
  const [editing, setEditing] = useState(false); // đã có hồ sơ lúc mở → "Sửa thông tin"
  const [draft, setDraft] = useState<Profile>({
    name: "",
    gender: "",
    dob: "",
    hourChi: "",
    place: "",
  });

  const { loggedIn, ready: authReady, astroxUser } = useAuth();
  const cloudProfileReady = useCloudProfileReady();
  const profileResolved = authReady && (cloudProfileReady || astroxUser?.id === "localhost-preview");
  const profile = useProfile();

  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const captiveTriggeredRef = useRef(false);

  const open = useCallback(
    (opts?: { captive?: boolean }) => {
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae instanceof HTMLElement && ae !== document.body) lastFocusedRef.current = ae;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setClosing(false);
      setDraft(profile ? { ...profile } : { name: "", gender: "", dob: "", hourChi: "", place: "" });
      setEditing(!!profile);
      setCaptive(!!opts?.captive);
      setOpenState(true);
    },
    [profile],
  );

  const forceClose = useCallback(() => {
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setOpenState(false); setClosing(false); }, 220);
  }, []);
  const close = useCallback(() => {
    if (!captive) forceClose();
  }, [captive, forceClose]);

  // Đăng ký control cho caller ngoài Provider (AuthMenu ở header).
  useEffect(() => {
    providerControls = { open, close };
    return () => {
      providerControls = null;
    };
  }, [open, close]);

  // Wait for successful cloud hydration before deciding the account has no profile.
  useEffect(() => {
    if (!loggedIn || !profileResolved || profile || captiveTriggeredRef.current) return;
    const t = setTimeout(() => {
      captiveTriggeredRef.current = true;
      open({ captive: true });
    }, 600);
    return () => clearTimeout(t);
  }, [loggedIn, profileResolved, profile, open]);

  // Tự giải trừ captive: hồ sơ xuất hiện (vừa lưu / sync từ tài khoản) hoặc
  // đăng xuất giữa chừng → không còn lý do khoá modal.
  if(openState && captive && (profile || !loggedIn || !profileResolved)){setOpenState(false);setCaptive(false);setClosing(false);}

  // Focus panel khi mở; trả focus về nút đã mở khi đóng.
  useEffect(() => {
    if (!openState) {
      const el = lastFocusedRef.current;
      lastFocusedRef.current = null;
      if (el && el.isConnected) el.focus();
      return;
    }
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [openState]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      {openState ? (
        <ProfileWizard
          closing={closing}
          captive={captive}
          editing={editing}
          draft={draft}
          panelRef={panelRef}
          onDraft={setDraft}
          onClose={close}
          onSave={() => {
            const cleaned: Profile = {
              name: draft.name.trim(),
              gender: draft.gender,
              dob: draft.dob,
              hourChi: draft.hourChi,
              ...(draft.birthTime ? {birthTime:draft.birthTime} : {}),
              place: draft.place.trim(),
              ...(draft.fullName && draft.fullName.trim() ? { fullName: draft.fullName.trim() } : {}),
            };
            setProfile(cleaned);
            forceClose();
          }}
        />
      ) : null}
    </ProfileModalContext.Provider>
  );
}

export function useProfileModal(): ProfileModalContextValue {
  const ctx = useContext(ProfileModalContext);
  // Ngoài Provider (vd. AuthMenu trong header): uỷ quyền cho Provider đã mount.
  const fallback = useMemo<ProfileModalContextValue>(
    () => ({
      open: (opts) => providerControls?.open(opts),
      close: () => providerControls?.close(),
    }),
    [],
  );
  return ctx || fallback;
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

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface WizardProps {
  closing: boolean;
  captive: boolean;
  editing: boolean;
  draft: Profile;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onDraft: React.Dispatch<React.SetStateAction<Profile>>;
  onClose: () => void;
  onSave: () => void;
}

function ProfileWizard({ closing, captive, editing, draft, panelRef, onDraft, onClose, onSave }: WizardProps) {
  const [attempted, setAttempted] = useState(false);
  const nameValid = draft.name.trim().length >= 2;
  const placeValid = draft.place.trim().length >= 2;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, [tabindex="0"]'));
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };
  return <div className={styles.overlay} data-closing={closing} onClick={e => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={onKeyDown}>
    <div className={styles.panel} ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ax-pm-title" aria-describedby="ax-pm-description">
      <header className={styles.header}>
        <div className={styles.avatar} aria-hidden="true">{draft.name.trim().slice(0, 1).toUpperCase() || <FeatureIcon name="profile" />}</div>
        <div><p className={styles.kicker}>ASTROX / HỒ SƠ CÁ NHÂN</p><h2 id="ax-pm-title">{editing ? "Thông tin của bạn" : "Bắt đầu từ bạn"}</h2></div>
        {!captive && <button type="button" className={styles.close} aria-label="Đóng hồ sơ" onClick={onClose}><FeatureIcon name="close" size={20} /></button>}
      </header>
      <form className={styles.form} onSubmit={e => {
        e.preventDefault(); setAttempted(true);
        if (!nameValid) { document.getElementById("ax-pm-name")?.focus(); return; }
        if (!placeValid) { document.getElementById("ax-pm-place")?.focus(); return; }
        onSave();
      }}>
        <div className={styles.body}>
          <p id="ax-pm-description" className={styles.description}>Lưu một lần, dùng cho mọi khám phá của bạn.</p>
          <fieldset className={styles.section}>
            <legend><span>01</span> Về bạn</legend>
            <div className={styles.fields}>
              <label className={styles.field}>Tên gọi<input id="ax-pm-name" autoComplete="given-name" required minLength={2} value={draft.name} placeholder="Tên gọi của bạn" aria-invalid={attempted && !nameValid} onChange={e => onDraft(d => ({ ...d, name: e.target.value }))}/>{attempted && !nameValid && <small role="alert">Nhập ít nhất 2 ký tự.</small>}</label>
              <fieldset className={styles.gender}><legend>Giới tính</legend><div>{["Nam", "Nữ"].map(g => <label key={g}><input type="radio" name="gender" value={g} required checked={draft.gender === g} onChange={() => onDraft(d => ({ ...d, gender: g }))}/><span>{g}</span></label>)}</div></fieldset>
            </div>
            <label className={styles.field}>Họ tên đầy đủ <span className={styles.optional}>Tuỳ chọn · dùng cho Thần Số Học</span><input id="ax-pm-fullname" autoComplete="name" value={draft.fullName || ""} placeholder="Họ tên trên giấy khai sinh" onChange={e => onDraft(d => ({ ...d, fullName: e.target.value }))}/></label>
          </fieldset>
          <fieldset className={styles.section}>
            <legend><span>02</span> Khoảnh khắc chào đời</legend>
            <div className={styles.fields}>
              <label className={styles.field}>Ngày sinh dương lịch<input id="ax-pm-dob" type="date" required min="1920-01-01" max={todayIso()} value={draft.dob} onChange={e => onDraft(d => ({ ...d, dob: e.target.value }))}/></label>
              <label className={styles.field}>Giờ sinh<select id="ax-pm-hour" required value={draft.hourChi} onChange={e => onDraft(d => ({ ...d, hourChi: e.target.value, birthTime: "" }))}><option value="" disabled>Chọn giờ sinh</option>{HOUR_CHI_OPTIONS.map(hour => <option key={hour} value={hour}>{hour}</option>)}</select></label>
            </div>
            <label className={styles.field}>Nơi sinh<select id="ax-pm-place" required value={draft.place} aria-invalid={attempted && !placeValid} onChange={e => onDraft(d => ({ ...d, place: e.target.value }))}><option value="" disabled>Chọn tỉnh / thành phố</option>{draft.place && !VN_PROVINCES.includes(draft.place) && <option value={draft.place}>{draft.place} (đã lưu)</option>}{VN_PROVINCES.map(place => <option key={place} value={place}>{place}</option>)}</select>{attempted && !placeValid && <small role="alert">Nhập tỉnh hoặc thành phố nơi sinh.</small>}</label>
          </fieldset>
          <p className={styles.note}>Ngày và giờ sinh được dùng để lập lá số. Bạn có thể sửa lại thông tin này bất cứ lúc nào.</p>
        </div>
        <footer className={styles.footer}><p>{editing ? "Thay đổi sẽ cập nhật lá số của bạn." : "Hồ sơ của riêng bạn, sẵn sàng để khám phá."}</p><button type="submit" disabled={closing}>{editing ? "Lưu thay đổi" : "Lưu & khám phá"}<span aria-hidden="true">↗</span></button></footer>
      </form>
    </div>
  </div>;
}
