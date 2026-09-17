"use client";

/**
 * MotionToggle — công tắc "Giảm chuyển động".
 * - Ghi localStorage "astrox_motion_pref" ("off"/"on").
 * - Đặt/gỡ html[data-motion="off"] (globals.css nhảy vào ép mọi
 *   animation/transition về ~0ms).
 * - Mặc định lần đầu truy cập theo prefers-reduced-motion (do MOTION_BOOT
 *   script chạy trước paint quyết định — không flash animation).
 * - Store module-level + useSyncExternalStore để mọi instance (header,
 *   sheet mobile) luôn đồng bộ.
 */
import { useEffect, useSyncExternalStore } from "react";

export const MOTION_PREF_KEY = "astrox_motion_pref";

/** Script inline chạy trước paint: set data-motion từ pref/reduced-motion. */
export const MOTION_BOOT = `(function(){try{var p=localStorage.getItem("${MOTION_PREF_KEY}");var off=p?p==="off":window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(off)document.documentElement.setAttribute("data-motion","off");}catch(e){}})();`;

type Listener = () => void;
const listeners = new Set<Listener>();
let motionOff = false;

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getSnapshot = () => motionOff;
const getServerSnapshot = () => false;

export function setMotionOff(next: boolean, persist = true) {
  motionOff = next;
  if (typeof document !== "undefined") {
    if (next) document.documentElement.setAttribute("data-motion", "off");
    else document.documentElement.removeAttribute("data-motion");
  }
  if (persist) {
    try {
      localStorage.setItem(MOTION_PREF_KEY, next ? "off" : "on");
    } catch {
      /* storage có thể bị chặn — bỏ qua */
    }
  }
  listeners.forEach((l) => l());
}

/** Hook dùng trong AppShell: sau hydration nhận trạng thái thật từ boot script. */
export function useMotionSync() {
  useEffect(() => {
    motionOff = document.documentElement.hasAttribute("data-motion");
    listeners.forEach((l) => l());
  }, []);
}

export function MotionToggle({ className }: { className?: string }) {
  const off = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <button
      type="button"
      onClick={() => setMotionOff(!off)}
      aria-pressed={off}
      title={off ? "Bật lại chuyển động" : "Giảm chuyển động: tắt hoạt ảnh, giữ nội dung"}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
        off ? "bg-ngoc-tint text-ngoc-deep ring-1 ring-ngoc/30" : "glass text-muc-2 hover:text-muc"
      } ${className ?? ""}`}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
        {off ? (
          <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <>
            <path d="M2.5 6.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2.5 10.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2.5 14.5c2.5-2 5-2 7.5 0s5 2 7.5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
      Giảm chuyển động
    </button>
  );
}
