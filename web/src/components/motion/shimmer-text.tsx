/**
 * ShimmerText — chữ ánh kim chạy (pattern shimmer-text, transitions.dev).
 * Bản thân chuỗi được nhân đôi vào data-text để ::before phủ gradient
 * clip theo glyph. Mặc định animation chạy liên tục; thêm class
 * "ax-shimmer-hover" để chỉ chạy khi container .group được hover.
 * Tuỳ biến màu qua CSS var (truyền bằng style):
 *   --shimmer-base / --shimmer-highlight
 */
import type { CSSProperties } from "react";

interface ShimmerTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

export function ShimmerText({ text, className, style }: ShimmerTextProps) {
  return (
    <span className={`ax-shimmer ${className ?? ""}`} data-text={text} style={style}>
      {text}
    </span>
  );
}
