"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { publicState } from "../../../../services/admin/public-state.mjs";
import type { publicConfig } from "../../../../services/admin/config";

type PublishedConfig = ReturnType<typeof publicConfig>;

/** Public projection contains no operational keys. Last known config is retained
 * on a transient read error; server-side mutation guards remain authoritative. */
export function PublishedNotice() {
  const pathname = usePathname();
  const [config, setConfig] = useState<PublishedConfig | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function load() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/site-config", { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          if (alive) setConfig(data.config ?? null);
        }
      } catch { /* Keep last confirmed configuration while offline. */ }
    }
    void load();
    const timer = setInterval(load, 20_000);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, []);
  const state = publicState(config, pathname);
  const notice = state.notice && !dismissed.includes(state.notice.id) ? state.notice : null;
  if (!state.announcement && !state.blocked && !notice) return null;
  return <aside aria-label="Thông báo AstroX" style={{ maxWidth: 1240, margin: "16px auto 0", padding: "0 20px", color: "#214d42" }}>
    <div style={{ padding: "14px 18px", border: "1px solid #d5dac9", borderRadius: 16, background: "#f0f2e8", fontSize: 14, lineHeight: 1.7 }}>
      {state.blocked && <p role="status">Dịch vụ đang bảo trì lượt mới. Các kết quả đã lưu vẫn có thể xem lại.</p>}
      {state.announcement && <p>{state.announcement}</p>}
      {notice && <div style={{ display: "flex", alignItems: "start", gap: 20 }}><div style={{ flex: 1 }}><strong>{notice.title}</strong><p style={{ whiteSpace: "pre-wrap" }}>{notice.body}</p></div><button type="button" aria-label="Đóng thông báo" onClick={() => setDismissed(v => [...v, notice.id])} style={{ minWidth: 44, minHeight: 44, cursor: "pointer" }}>×</button></div>}
    </div>
  </aside>;
}
