"use client";

/**
 * AiPanel — vùng kết quả AI dùng chung cho "Chủ đề luận giải" và "Vận trình":
 * - có cache  → PanelReveal + AiText + nút "Tạo lại" (force).
 * - đang chạy → SunSpinner + Skeleton (aria-live polite).
 * - chưa có   → CTA chạy runAiPrompt; lỗi hiện lại nút "Thử lại".
 */
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { Btn } from "@/components/kit";
import { SavedReading } from "@/components/kit/SavedReading";
import { PanelReveal } from "@/components/motion";
import { usePaidPrice } from "@/lib/use-paid-price";

interface AiPanelProps {
  cached: string;
  loading: boolean;
  error: string;
  runLabel?: string;
  emptyText?: string;
  loadingLabel?: string;
  onRun: (force: boolean) => void;
  serviceId: string;
  prompt: string;
}

export function AiPanel({ cached, loading, error, runLabel = "Luận giải", emptyText, loadingLabel, onRun, serviceId, prompt }: AiPanelProps) {
  const price = usePaidPrice(serviceId, prompt);
  if (loading) {
    return (
      <ReadingLoader kind="tuvi" label={loadingLabel} />
    );
  }

  if (cached) {
    return (
      <PanelReveal open className="space-y-4">
        <SavedReading text={cached} />

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
          {emptyText ?? "Chưa có luận giải cho mục này. AstroX sẽ đọc trực tiếp dữ liệu lá số đã tính — không tự bịa dữ kiện."}
        </p>
        <Btn size="sm" onClick={() => onRun(false)} disabled={price.pending}>
          {error ? "Thử lại" : runLabel}{price.paid && ` · ${price.text}`}
        </Btn>
      </div>
    </div>
  );
}
