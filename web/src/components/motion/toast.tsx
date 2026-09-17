"use client";

/**
 * ToastProvider + useToast — toast liquid glass góc dưới, tự ẩn sau 3.2s,
 * stack tối đa 3 (pattern toast + success-check của transitions.dev).
 * Dùng: const { show } = useToast(); show("Đã lưu", "success");
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SuccessCheck } from "./success-check";

export type ToastTone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
  leaving: boolean;
}

interface ToastContextValue {
  show: (msg: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải nằm trong <ToastProvider>");
  return ctx;
}

const MAX_STACK = 3;
const VISIBLE_MS = 3200;
const LEAVE_MS = 260; // khớp --toast-close

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>[]>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((list) => list.forEach(clearTimeout));
      timers.clear();
    };
  }, []);

  const show = useCallback((msg: string, tone: ToastTone = "info") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, msg, tone, leaving: false }].slice(-MAX_STACK));

    const timers = timersRef.current;
    const t1 = setTimeout(() => {
      // Bắt đầu thoát: fade xuống rồi gỡ khỏi stack.
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, leaving: true } : it)));
      const t2 = setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id));
        timers.delete(id);
      }, LEAVE_MS);
      timers.set(id, [...(timers.get(id) ?? []), t2]);
    }, VISIBLE_MS);
    timers.set(id, [t1]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((it) => (
          <div
            key={it.id}
            role={it.tone === "error" ? "alert" : "status"}
            className={`ax-toast glass-strong pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-muc ${
              it.leaving ? "" : "is-open"
            }`}
          >
            {it.tone === "success" ? (
              <SuccessCheck size={19} className="shrink-0 text-ngoc-deep" />
            ) : (
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-black text-white ${
                  it.tone === "error" ? "bg-son" : "bg-cham"
                }`}
              >
                {it.tone === "error" ? "!" : "i"}
              </span>
            )}
            <span>{it.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
