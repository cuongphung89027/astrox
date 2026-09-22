"use client";

/**
 * Panel nạp AstroX Point (modal glass, max-w-lg) — port từ pm-step "topup"
 * của app cũ: gói nạp PayOS + mã khuyến mãi + lịch sử giao dịch.
 *
 * Chỉ dùng được với tài khoản AstroX (Zalo, cookie astrox_session); tài khoản
 * Supabase-only sẽ thấy ghi chú chuyển hướng (AuthMenu đã lọc trước, đây là
 * lớp phòng khi panel được mở từ nơi khác).
 */
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  createTopup,
  fetchMeWithPoints,
  loadTopupHistory,
  loadTopupPackages,
  promoCheck,
  type TopupOrder,
  type TopupPackage,
} from "@/lib/api";

const PANEL_STYLE = `
@keyframes ax-tp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes ax-tp-pop {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
.ax-tp-fade { animation: ax-tp-fade 0.18s cubic-bezier(0.22, 1, 0.36, 1) both; }
.ax-tp-pop { animation: ax-tp-pop 0.24s cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .ax-tp-fade, .ax-tp-pop { animation: none; }
}
`;

interface PromoStatus {
  kind: "ok" | "err";
  text: string;
}

function formatVnd(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function HistoryStatus({ status }: { status: string }) {
  if (status === "paid") return <span className="shrink-0 font-semibold text-ngoc-deep">Đã nạp</span>;
  if (status === "pending") return <span className="shrink-0 font-semibold text-kim-deep">Chờ thanh toán</span>;
  return <span className="shrink-0 font-semibold text-muc/50">Đã huỷ</span>;
}

export function TopupPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { astroxUser } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [pkgError, setPkgError] = useState(false);
  const [history, setHistory] = useState<TopupOrder[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const [promo, setPromo] = useState("");
  const [promoStatus, setPromoStatus] = useState<PromoStatus | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const [buying, setBuying] = useState<number | null>(null); // amount_vnd đang xử lý
  const [buyError, setBuyError] = useState("");

  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Focus + Escape + trả focus khi đóng.
  useEffect(() => {
    if (!open) {
      const el = lastFocusedRef.current;
      lastFocusedRef.current = null;
      if (el && el.isConnected) el.focus();
      return;
    }
    const ae = typeof document !== "undefined" ? document.activeElement : null;
    if (ae instanceof HTMLElement && ae !== document.body) lastFocusedRef.current = ae;
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Tải số dư + gói + lịch sử khi mở panel (chỉ với tài khoản Zalo).
  useEffect(() => {
    if (!open || !astroxUser) return;
    let alive = true;
    setBuyError("");
    setBalance(null);
    setPackages([]);
    setPkgError(false);
    setHistory(null);
    setHistoryError(false);
    fetchMeWithPoints().then((r) => {
      if (alive) setBalance(r.points);
    });
    loadTopupPackages()
      .then((pkgs) => {
        if (alive) setPackages(pkgs);
      })
      .catch(() => {
        if (alive) setPkgError(true);
      });
    loadTopupHistory()
      .then((orders) => {
        if (alive) setHistory(orders);
      })
      .catch(() => {
        if (alive) setHistoryError(true);
      });
    return () => {
      alive = false;
    };
  }, [open, astroxUser]);

  const buy = useCallback(
    async (amountVnd: number) => {
      if (!astroxUser || buying !== null) return;
      setBuyError("");
      setBuying(amountVnd);
      const code = promo.trim().toUpperCase();
      const r = await createTopup(amountVnd, code || undefined);
      setBuying(null);
      if (r.checkoutUrl) {
        window.location.href = r.checkoutUrl; // sang PayOS (VietQR)
        return;
      }
      setBuyError(
        r.error === "promo"
          ? "Mã khuyến mãi không hợp lệ hoặc đã hết hiệu lực."
          : r.error === "payos"
            ? "Hệ thống thanh toán đang bảo trì."
            : "Không tạo được lệnh nạp. Thử lại.",
      );
    },
    [astroxUser, buying, promo],
  );

  const applyPromo = useCallback(async () => {
    const code = promo.trim().toUpperCase();
    if (!code) {
      setPromoStatus({ kind: "err", text: "Nhập mã trước khi áp dụng." });
      return;
    }
    setPromoChecking(true);
    setPromoStatus(null);
    const r = await promoCheck(code);
    setPromoChecking(false);
    if (r.ok) {
      setPromoStatus({ kind: "ok", text: `✓ ${code}: +${r.bonus ?? 0} Point thưởng cho mỗi lần nạp.` });
    } else {
      setPromoStatus({
        kind: "err",
        text:
          r.error === "promo_expired"
            ? "Mã đã hết hạn."
            : r.error === "promo_exhausted"
              ? "Mã đã hết lượt dùng."
              : "Mã không tồn tại hoặc đã tắt.",
      });
    }
  }, [promo]);

  if (!open) return null;

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.current) return;
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
      aria-labelledby="ax-tp-title"
      onKeyDown={onPanelKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="ax-tp-fade fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-muc/40 p-4 backdrop-blur-sm sm:p-5"
    >
      <style>{PANEL_STYLE}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="ax-tp-pop glass-strong gold-ring my-auto w-full max-w-lg rounded-[var(--radius-card)] p-6 outline-none sm:p-7"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="ax-tp-title" className="font-display text-xl font-extrabold tracking-tight">
              Nạp AstroX Point
            </p>
            <p className="mt-0.5 text-xs font-medium text-muc-2">
              Số dư hiện tại:{" "}
              <span className="font-display font-extrabold text-kim-deep">
                {astroxUser ? (balance === null ? "—" : `${balance.toLocaleString("vi-VN")} Point`) : "—"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trang nạp Point"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/60 text-muc-2 transition-colors hover:bg-white hover:text-son"
          >
            ✕
          </button>
        </div>

        {!astroxUser ? (
          <p className="mt-5 rounded-xl bg-kim-tint px-4 py-3 text-sm font-medium text-kim-deep">
            Nạp Point hiện dành cho tài khoản đăng nhập bằng Zalo.
          </p>
        ) : (
          <>
            {/* Gói nạp */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {pkgError ? (
                <p className="col-span-full text-[13px] font-medium text-son">Không tải được gói nạp. Thử lại sau.</p>
              ) : packages.length === 0 ? (
                <p className="col-span-full text-[13px] font-medium text-muc-2"><LoadingWhisper kind="packages"/></p>
              ) : (
                packages.map((p) => {
                  const busy = buying === p.amount_vnd;
                  return (
                    <button
                      key={p.amount_vnd}
                      type="button"
                      onClick={() => buy(p.amount_vnd)}
                      disabled={buying !== null}
                      className={`rounded-2xl border-2 bg-white/60 px-3.5 py-3.5 text-center transition-all ${
                        busy
                          ? "border-son/40 opacity-60"
                          : "border-transparent hover:-translate-y-0.5 hover:border-kim/60 hover:bg-white/85"
                      } disabled:cursor-not-allowed`}
                    >
                      <span className="block font-display text-xl font-extrabold text-kim-deep">
                        {busy ? "Đang tạo…" : `${p.points.toLocaleString("vi-VN")} Point`}
                      </span>
                      <span className="mt-0.5 block text-[13px] font-semibold text-muc">
                        {formatVnd(p.amount_vnd)}
                      </span>
                      {p.label ? (
                        <span className="mt-1.5 inline-block rounded-full bg-ngoc-tint px-2.5 py-0.5 text-[10.5px] font-bold text-ngoc-deep">
                          {p.label}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            {/* Mã khuyến mãi */}
            <div className="mt-5 border-t border-white/80 pt-4">
              <label htmlFor="ax-tp-promo" className="mb-1.5 block text-xs font-semibold text-muc-2">
                Mã khuyến mãi (tùy chọn)
              </label>
              <div className="flex gap-2">
                <input
                  id="ax-tp-promo"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="VD: TET2026"
                  autoCapitalize="characters"
                  className="min-w-0 flex-1 rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[15px] uppercase text-muc outline-none transition-colors placeholder:normal-case placeholder:text-muc/40 focus:border-son"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={promoChecking}
                  className="shrink-0 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-bold text-muc transition-colors hover:bg-white disabled:opacity-50"
                >
                  {promoChecking ? "Đang kiểm tra…" : "Áp dụng"}
                </button>
              </div>
              {promoStatus ? (
                <p
                  role="status"
                  className={`mt-2 min-h-[18px] text-xs font-semibold ${
                    promoStatus.kind === "ok" ? "text-ngoc-deep" : "text-son"
                  }`}
                >
                  {promoStatus.text}
                </p>
              ) : (
                <p className="mt-2 min-h-[18px]" aria-hidden="true" />
              )}
            </div>

            {/* Lịch sử */}
            <div className="mt-2 border-t border-white/80 pt-4">
              <p className="text-[13.5px] font-bold">Lịch sử nạp gần đây</p>
              <div className="mt-2 grid gap-1.5 text-[13px]">
                {historyError ? (
                  <p className="font-medium text-son">Không tải được lịch sử.</p>
                ) : history === null ? (
                  <p className="font-medium text-muc-2"><LoadingWhisper kind="payment"/></p>
                ) : history.length === 0 ? (
                  <p className="font-medium text-muc-2">Chưa có giao dịch nào.</p>
                ) : (
                  history.map((o, i) => (
                    <div
                      key={`${o.points}-${o.amount_vnd}-${o.status}-${i}`}
                      className="flex items-center justify-between gap-3 border-b border-white/70 pb-1.5 last:border-b-0 last:pb-0"
                    >
                      <span className="font-semibold text-muc">
                        {o.points.toLocaleString("vi-VN")} Point · {formatVnd(o.amount_vnd)}
                      </span>
                      <HistoryStatus status={o.status} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lỗi tạo lệnh */}
            {buyError ? (
              <p role="alert" className="mt-3 min-h-[18px] text-[13px] font-semibold text-son">
                {buyError}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
