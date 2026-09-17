"use client";

/**
 * LikeButton — nút tim bật/tắt với pop bounce (pattern like-button,
 * transitions.dev). Mount lại inner span (key = burst) để replay pop.
 */
import { useState } from "react";

interface LikeButtonProps {
  label: string;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  className?: string;
}

export function LikeButton({ label, defaultOn = false, onChange, className }: LikeButtonProps) {
  const [on, setOn] = useState(defaultOn);
  const [burst, setBurst] = useState(0);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setBurst((b) => b + 1);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={toggle}
      className={`glass grid size-10 place-items-center rounded-full text-muc-2 transition-transform hover:-translate-y-0.5 ${className ?? ""}`}
    >
      <span key={burst} className={`ax-like ${on ? "is-on" : ""}`}>
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
          <path
            d="M12 20.7C7.4 17.4 3.5 14 3.5 10.2 3.5 7.6 5.5 5.7 8 5.7c1.6 0 3.1.8 4 2.1.9-1.3 2.4-2.1 4-2.1 2.5 0 4.5 1.9 4.5 4.5 0 3.8-3.9 7.2-8.5 10.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  );
}
