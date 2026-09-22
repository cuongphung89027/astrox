"use client";

/**
 * TitleReveal — pattern text reveal của transitions.dev: từng ký tự nhô lên
 * + tan blur khi cuộn tới viewport (useInView, once). "AstroX" tô vàng kim
 * đồng bộ với card, phần còn lại xanh thông. reduced-motion => hiện tức thì
 * (global CSS ép transition ~0ms).
 */
import { useInView } from "@/components/motion";

const GOLD = "#c9973f";
const TEAL = "#175e54";

interface TitleRevealProps {
  text: string;
  /** Số ký tự đầu tô vàng kim (phần brand "AstroX"). */
  goldChars?: number;
  className?: string;
}

export function TitleReveal({ text, goldChars = 0, className }: TitleRevealProps) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.4 });
  return (
    <span ref={ref} className={`ax-char-wrap ${className ?? ""}`} aria-label={text} role="text">
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`ax-char ${inView ? "is-in" : ""}`}
          style={{ transitionDelay: `${i * 26}ms`, color: i < goldChars ? GOLD : TEAL }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
