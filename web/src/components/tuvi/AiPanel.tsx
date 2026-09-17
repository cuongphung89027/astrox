"use client";

/**
 * AiPanel — vùng kết quả AI dùng chung cho "Chủ đề luận giải" và "Vận trình":
 * - có cache  → PanelReveal + AiText + nút "Tạo lại" (force).
 * - đang chạy → SunSpinner + Skeleton (aria-live polite).
 * - chưa có   → CTA chạy runAiPrompt; lỗi hiện lại nút "Thử lại".
 */
import { AiText, Btn, Skeleton, SunSpinner } from "@/components/kit";
import { PanelReveal } from "@/components/motion";

interface AiPanelProps {
  cached: string;
  loading: boolean;
  error: string;
  runLabel?: string;
  loadingLabel?: string;
  onRun: (force: boolean) => void;
}

export function AiPanel({ cached, loading, error, runLabel = "Luận giải", loadingLabel, onRun }: AiPanelProps) {
  if (loading) {
    return (
      <div aria-live="polite" className="space-y-4">
        <SunSpinner label={loadingLabel ?? "AstroX đang luận giải…"} />
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[78%]" />
          <Skeleton className="h-3.5 w-[64%]" />
        </div>
      </div>
    );
  }

  if (cached) {
    return (
      <PanelReveal open className="space-y-4">
        <AiText text={cached} />
        <Btn variant="ghost" size="sm" onClick={() => onRun(true)}>
          ↻ Tạo lại
        </Btn>
      </PanelReveal>
    );
  }

  return (
    <div aria-live="polite" className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm font-semibold text-son-deep">
          {error}
        </p>
      ) : null}
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] p-5">
        <p className="max-w-md text-sm leading-relaxed text-muc-2">
          Chưa có luận giải cho mục này. AstroX sẽ đọc trực tiếp dữ liệu lá số đã tính — không tự bịa dữ kiện.
        </p>
        <Btn size="sm" onClick={() => onRun(false)}>
          {error ? "Thử lại" : runLabel}
        </Btn>
      </div>
    </div>
  );
}
