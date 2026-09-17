"use client";

/**
 * CardTilt — hover tilt 3D theo con trỏ (pattern card-tilt, transitions.dev),
 * góc nghiêng tối đa 6deg + glare sáng chạy theo con trỏ.
 * Con trỏ theo dõi trên wrapper PHẲNG (không transform) để không flicker;
 * DOM viết trực tiếp qua ref để tránh re-render mỗi pointermove.
 * Chỉ chạy cho pointer type "mouse" — touch/pen giữ nguyên tĩnh.
 */
import { useRef, type ReactNode } from "react";

interface CardTiltProps {
  children: ReactNode;
  className?: string;
  /** Góc nghiêng tối đa (deg). */
  max?: number;
}

export function CardTilt({ children, className, max = 6 }: CardTiltProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);

  const apply = (rx: number, ry: number, gx: number, gy: number, tilting: boolean) => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    card.style.setProperty("--tilt-rx", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--tilt-ry", `${ry.toFixed(2)}deg`);
    card.style.setProperty("--tilt-gx", `${gx.toFixed(1)}%`);
    card.style.setProperty("--tilt-gy", `${gy.toFixed(1)}%`);
    wrap.classList.toggle("is-hover", true);
    card.classList.toggle("is-tilting", tilting);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    const rect = wrap.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      apply(-py * max * 2, px * max * 2, (px + 0.5) * 100, (py + 0.5) * 100, true);
    });
  };

  const onPointerLeave = () => {
    cancelAnimationFrame(rafRef.current);
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    wrap.classList.remove("is-hover");
    card.classList.remove("is-tilting");
    card.style.setProperty("--tilt-rx", "0deg");
    card.style.setProperty("--tilt-ry", "0deg");
  };

  return (
    <div ref={wrapRef} className={`ax-tilt ${className ?? ""}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div ref={cardRef} className="ax-tilt-card h-full">
        {children}
        <div aria-hidden="true" className="ax-tilt-glare" />
      </div>
    </div>
  );
}
