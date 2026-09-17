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
 * chạy captive check: loggedIn && !profile → open({captive:true}) sau 600ms.
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
import { useAuth } from "@/lib/auth";
import { setProfile } from "@/lib/state";
import { useProfile } from "@/lib/use-store";
import type { Profile } from "@/lib/types";
import { HOUR_CHI_OPTIONS, formatDob } from "@/lib/utils";

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
  const [captive, setCaptive] = useState(false);
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false); // đã có hồ sơ lúc mở → "Sửa thông tin"
  const [draft, setDraft] = useState<Profile>({
    name: "",
    gender: "",
    dob: "",
    hourChi: "",
    place: "",
  });

  const { loggedIn } = useAuth();
  const profile = useProfile();

  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const captiveTriggeredRef = useRef(false);

  const open = useCallback(
    (opts?: { captive?: boolean }) => {
      const ae = typeof document !== "undefined" ? document.activeElement : null;
      if (ae instanceof HTMLElement && ae !== document.body) lastFocusedRef.current = ae;
      setDraft(profile ? { ...profile } : { name: "", gender: "", dob: "", hourChi: "", place: "" });
      setEditing(!!profile);
      setStep(0);
      setCaptive(!!opts?.captive);
      setOpenState(true);
    },
    [profile],
  );

  const close = useCallback(() => {
    if (captive) return; // captive: bắt buộc hoàn thành hồ sơ
    setOpenState(false);
  }, [captive]);

  /** Đóng kể cả captive — chỉ dùng nội bộ khi điều kiện captive tự giải trừ. */
  const forceClose = useCallback(() => setOpenState(false), []);

  // Đăng ký control cho caller ngoài Provider (AuthMenu ở header).
  useEffect(() => {
    providerControls = { open, close };
    return () => {
      providerControls = null;
    };
  }, [open, close]);

  // Captive check: đăng nhập rồi mà chưa có hồ sơ → ép mở sau 600ms (một lần).
  useEffect(() => {
    if (!loggedIn || profile || captiveTriggeredRef.current) return;
    const t = setTimeout(() => {
      captiveTriggeredRef.current = true;
      open({ captive: true });
    }, 600);
    return () => clearTimeout(t);
  }, [loggedIn, profile, open]);

  // Tự giải trừ captive: hồ sơ xuất hiện (vừa lưu / sync từ tài khoản) hoặc
  // đăng xuất giữa chừng → không còn lý do khoá modal.
  useEffect(() => {
    if (openState && captive && (profile || !loggedIn)) forceClose();
  }, [openState, captive, profile, loggedIn, forceClose]);

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
          captive={captive}
          editing={editing}
          step={step}
          draft={draft}
          panelRef={panelRef}
          onStep={setStep}
          onDraft={setDraft}
          onClose={close}
          onSave={() => {
            const cleaned: Profile = {
              name: draft.name.trim(),
              gender: draft.gender,
              dob: draft.dob,
              hourChi: draft.hourChi,
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
  if (ctx) return ctx;
  // Ngoài Provider (vd. AuthMenu trong header): uỷ quyền cho Provider đã mount.
  return useMemo(
    () => ({
      open: (opts) => providerControls?.open(opts),
      close: () => providerControls?.close(),
    }),
    [],
  );
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

const STEP_COUNT = 6; // 0 gender · 1 name · 2 fullName · 3 dob+place · 4 hour · 5 review

function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function splitHourChi(opt: string): { label: string; range: string } {
  const i = opt.indexOf(" (");
  if (i === -1) return { label: opt, range: "" };
  return { label: opt.slice(0, i), range: opt.slice(i + 2, opt.length - 1) };
}

function stepValid(s: number, d: Profile): boolean {
  if (s === 0) return !!d.gender;
  if (s === 1) return d.name.trim().length >= 2;
  if (s === 2) return true; // fullName tuỳ chọn (Thần Số Học)
  if (s === 3) return !!d.dob && d.place.trim().length >= 2;
  if (s === 4) return !!d.hourChi;
  return true;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[15px] text-muc shadow-inner outline-none transition-colors placeholder:text-muc/40 focus:border-son";

const MODAL_STYLE = `
@keyframes ax-pm-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ax-pm-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
.ax-pm-fade { animation: ax-pm-fade 0.18s cubic-bezier(0.22, 1, 0.36, 1) both; }
.ax-pm-pop { animation: ax-pm-pop 0.24s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .ax-pm-fade, .ax-pm-pop { animation: none; }
}
`;

interface WizardProps {
  captive: boolean;
  editing: boolean;
  step: number;
  draft: Profile;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onStep: (s: number) => void;
  onDraft: React.Dispatch<React.SetStateAction<Profile>>;
  onClose: () => void;
  onSave: () => void;
}

function ProfileWizard(props: WizardProps) {
  const { captive, editing, step, draft, panelRef, onStep, onDraft, onClose, onSave } = props;
  const valid = stepValid(step, draft);
  const isLast = step === STEP_COUNT - 1;

  const next = () => {
    if (!valid) return;
    if (!isLast) onStep(step + 1);
    else onSave();
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    // Focus trap đơn giản: giữ Tab luân chuyển trong panel.
    const focusables = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ax-pm-title"
      onKeyDown={onPanelKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // captive: close() tự chặn
      }}
      className="ax-pm-fade fixed inset-0 z-[80] grid place-items-center bg-muc/40 p-4 backdrop-blur-sm sm:p-5"
    >
      <style>{MODAL_STYLE}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="ax-pm-pop glass-strong gold-ring w-full max-w-md rounded-[var(--radius-card)] p-6 outline-none sm:p-7"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="ax-pm-title" className="font-display text-xl font-extrabold tracking-tight">
              {editing ? "Sửa thông tin" : "Thiết lập hồ sơ"}
            </p>
            <p className="mt-0.5 text-xs font-medium text-muc-2">
              Bước {step + 1}/{STEP_COUNT}
            </p>
          </div>
          {captive ? (
            <span className="mt-1 rounded-full bg-kim-tint px-3 py-1 text-[11px] font-bold text-kim-deep">
              ● Hoàn thành hồ sơ để tiếp tục
            </span>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hồ sơ"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-white/60 text-muc-2 transition-colors hover:bg-white hover:text-son"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dots tiến trình */}
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: STEP_COUNT }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-son" : "bg-muc/15"}`}
            />
          ))}
        </div>

        {/* Các bước */}
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 0 && (
            <div>
              <p className="text-[15px] font-bold">Bạn là Nam hay Nữ?</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(["Nam", "Nữ"] as const).map((g) => {
                  const active = draft.gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onDraft((d) => ({ ...d, gender: g }))}
                      aria-pressed={active}
                      className={`rounded-2xl border-2 px-4 py-6 text-center transition-all ${
                        active
                          ? "border-son bg-son-tint shadow-[var(--shadow-pop)]"
                          : "border-transparent bg-white/55 hover:border-son/30 hover:bg-white/80"
                      }`}
                    >
                      <span aria-hidden="true" className="block text-2xl">
                        {g === "Nam" ? "♁" : "♀"}
                      </span>
                      <span className="mt-1 block font-display text-lg font-extrabold">{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <label htmlFor="ax-pm-name" className="text-[15px] font-bold">
                Tên bạn muốn được gọi
              </label>
              <input
                id="ax-pm-name"
                autoFocus
                value={draft.name}
                onChange={(e) => onDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ví dụ: Cường, Mai, Bảo Anh…"
                className={`${INPUT_CLASS} mt-3`}
              />
              <p className="mt-2 text-xs text-muc-2">Tối thiểu 2 ký tự — AstroX sẽ xưng hô theo tên này.</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label htmlFor="ax-pm-fullname" className="text-[15px] font-bold">
                Họ tên đầy đủ trên giấy khai sinh
              </label>
              <input
                id="ax-pm-fullname"
                value={draft.fullName || ""}
                onChange={(e) => onDraft((d) => ({ ...d, fullName: e.target.value }))}
                placeholder="Ví dụ: Nguyễn Văn An (để trống nếu giống tên ở trên)"
                className={`${INPUT_CLASS} mt-3`}
              />
              <p className="mt-2 text-xs text-muc-2">Dùng cho Thần Số Học — bỏ qua nếu chưa muốn.</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-[15px] font-bold">Ngày sinh &amp; nơi sinh</p>
              <div className="mt-3">
                <label htmlFor="ax-pm-dob" className="mb-1.5 block text-xs font-semibold text-muc-2">
                  Ngày sinh dương lịch
                </label>
                <input
                  id="ax-pm-dob"
                  type="date"
                  min="1920-01-01"
                  max={todayIso()}
                  value={draft.dob}
                  onChange={(e) => onDraft((d) => ({ ...d, dob: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="mt-3">
                <label htmlFor="ax-pm-place" className="mb-1.5 block text-xs font-semibold text-muc-2">
                  Nơi sinh
                </label>
                <input
                  id="ax-pm-place"
                  value={draft.place}
                  onChange={(e) => onDraft((d) => ({ ...d, place: e.target.value }))}
                  placeholder="Ví dụ: Hà Nội"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="text-[15px] font-bold">Giờ sinh</p>
              <p className="mt-1 text-xs text-muc-2">
                Không nhớ giờ sinh? Chọn khung giờ gần đúng nhất.
              </p>
              <div role="radiogroup" aria-label="Giờ sinh (can giờ)" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {HOUR_CHI_OPTIONS.map((opt) => {
                  const { label, range } = splitHourChi(opt);
                  const active = draft.hourChi === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onDraft((d) => ({ ...d, hourChi: opt }))}
                      className={`rounded-xl border px-1 py-2 text-center transition-all ${
                        active
                          ? "border-son bg-son text-white shadow-[var(--shadow-pop)]"
                          : "border-white/80 bg-white/55 text-muc hover:bg-white/85"
                      }`}
                    >
                      <span className="block text-[13px] font-bold leading-tight">{label}</span>
                      <span className={`mt-0.5 block text-[9.5px] leading-tight ${active ? "text-white/80" : "text-muc-2"}`}>
                        {range}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="text-[15px] font-bold">Xem lại thông tin</p>
              <dl className="mt-3 overflow-hidden rounded-2xl border border-white/80 bg-white/60 text-sm">
                {(
                  [
                    ["Giới tính", draft.gender || "—"],
                    ["Tên gọi", draft.name.trim() || "—"],
                    ["Họ tên đầy đủ", draft.fullName?.trim() || "—"],
                    ["Ngày sinh", draft.dob ? formatDob(draft.dob) : "—"],
                    ["Giờ sinh", draft.hourChi || "—"],
                    ["Nơi sinh", draft.place.trim() || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-white/70 px-4 py-2 last:border-b-0">
                    <dt className="shrink-0 text-xs font-semibold text-muc-2">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-muc-2">
                ◍ Lá số của bạn sẽ được AstroX tính trực tiếp từ ngày giờ sinh. Đăng nhập Zalo để đồng bộ hồ sơ
                giữa các thiết bị.
              </p>
            </div>
          )}

          {/* Nav */}
          <div className="mt-6 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onStep(step - 1)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold text-muc-2 transition-colors hover:bg-white/70 ${
                step === 0 ? "invisible" : ""
              }`}
            >
              ← Quay lại
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="flex-1 rounded-full bg-son px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-pop)] transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isLast ? "Lưu hồ sơ" : "Tiếp theo →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
