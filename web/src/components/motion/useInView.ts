"use client";

/**
 * useInView — hook chung cho mọi pattern reveal (transitions.dev):
 * quan sát element vào viewport, mặc định chỉ báo 1 lần rồi ngắt.
 */
import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Ngưỡng hiển thị của element (0–1). Mặc định 0.18. */
  threshold?: number;
  /** Lề mở rộng viewport (vd. "0px 0px -10% 0px"). */
  rootMargin?: string;
  /** Chỉ báo một lần rồi disconnect (mặc định true). */
  once?: boolean;
}

export function useInView<T extends HTMLElement>(options?: UseInViewOptions) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once !== false;
  const threshold = options?.threshold ?? 0.18;
  const rootMargin = options?.rootMargin;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fallback: nếu IO không gắn được (hydration lỗi / browser lạ), vẫn hiện
    // nội dung — tránh hero/CTA kẹt opacity:0 vĩnh viễn.
    const failSafe = setTimeout(() => setInView(true), 1200);
    // Môi trường không có IntersectionObserver (ct cũ) => hiện luôn.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return () => clearTimeout(failSafe);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => {
      clearTimeout(failSafe);
      io.disconnect();
    };
    // Chạy 1 lần khi mount — options coi như bất biến với caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
