"use client";

/**
 * TextsReveal — các dòng con hiện lần lượt vào viewport (pattern texts-reveal,
 * transitions.dev): translateY + blur + stagger delay. Mỗi direct child = 1 dòng.
 * is-shown do useInView thêm vào; data-motion="off" / reduced-motion => hiện tức thì
 * (global CSS ép transition ~0ms).
 */
import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { useInView } from "./useInView";

interface TextsRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay nền (ms) áp cho dòng đầu. */
  baseDelay?: number;
  /** Khoảng cách giữa các dòng (ms). */
  stagger?: number;
}

export function TextsReveal({ children, className, baseDelay = 0, stagger = 70 }: TextsRevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  const lines: ReactNode = Array.isArray(children) ? children : [children];
  const wrapped = (lines as ReactNode[]).map((child, i) => {
    const delay = `${baseDelay + i * stagger}ms`;
    if (isValidElement(child)) {
      const el = child as ReactElement<{ className?: string; style?: CSSProperties }>;
      return cloneElement(el, {
        className: [el.props.className, "ax-stagger-line"].filter(Boolean).join(" "),
        style: { ...(el.props.style ?? {}), transitionDelay: delay },
        key: el.key ?? i,
      });
    }
    return (
      <span key={i} className="ax-stagger-line" style={{ transitionDelay: delay, display: "block" }}>
        {child}
      </span>
    );
  });

  return (
    <div ref={ref} className={`ax-stagger ${inView ? "is-shown" : ""} ${className ?? ""}`}>
      {wrapped}
    </div>
  );
}
