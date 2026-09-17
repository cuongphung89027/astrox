"use client";

/**
 * PanelReveal — panel trượt + fade + cross-blur vào vị trí (pattern
 * panel-reveal, transitions.dev). Luôn mounted; open=true điều khiển trạng thái.
 */
import type { ReactNode } from "react";

interface PanelRevealProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  /** Quãng đường trượt (px) — mặc định 56px. */
  distance?: number;
}

export function PanelReveal({ open, children, className, distance = 56 }: PanelRevealProps) {
  return (
    <div
      data-open={open ? "true" : "false"}
      className={`ax-panel ${className ?? ""}`}
      style={{ ["--panel-translate-y" as string]: `${distance}px` }}
    >
      {children}
    </div>
  );
}
