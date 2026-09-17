"use client";

/**
 * TopicTabs — segmented control chỉ báo trượt (pattern tabs-sliding,
 * transitions.dev): JS đo offset của tab active ghi lên pill, CSS giữ mượt.
 * Hỗ trợ phím ←/→ (roving focus).
 */
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
}

interface TopicTabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function TopicTabs({ items, value, onChange, ariaLabel, className }: TopicTabsProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement | null>());
  /** Lượt đặt pill đầu tiên phải "snap" không transition. */
  const mountedRef = useRef(false);

  const place = useCallback(
    (animate: boolean) => {
      const pill = pillRef.current;
      const btn = tabRefs.current.get(value);
      if (!pill || !btn) return;
      if (!animate) pill.style.transition = "none";
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
      pill.style.width = `${btn.offsetWidth}px`;
      if (!animate) {
        void pill.offsetHeight; // ép reflow rồi mới trả lại transition
        pill.style.transition = "";
      }
    },
    [value],
  );

  useLayoutEffect(() => {
    place(mountedRef.current);
    mountedRef.current = true;
  }, [place]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(bar);
    return () => ro.disconnect();
  }, [place]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = items.findIndex((it) => it.id === value);
    const next = e.key === "ArrowRight" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
    const item = items[next];
    onChange(item.id);
    tabRefs.current.get(item.id)?.focus();
  };

  return (
    <div
      ref={barRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`glass relative inline-flex items-center gap-1 rounded-full p-1 ${className ?? ""}`}
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-0 rounded-full bg-white shadow-[var(--shadow-glass)] transition-[transform,width] duration-[250ms] ease-[var(--ease-viet)] will-change-[transform,width]"
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current.set(item.id, el);
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={`relative z-[1] whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
              selected ? "text-muc" : "text-muc-2 hover:text-muc"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
