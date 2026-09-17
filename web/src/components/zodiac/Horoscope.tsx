"use client";

/**
 * Horoscope — tử vi theo kỳ (hôm nay / tuần này / tháng này) cho cung đang
 * chọn. Prompt port từ zodiacPeriodPrompt (quá cảnh thật bằng astronomy-engine),
 * cache nhóm "zodiacPeriod.*". Chờ: SunSpinner + Skeleton; xong: PanelReveal +
 * AiText + nút "Tạo lại".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AiText, Btn, Skeleton, SunSpinner, TopicTabs, type TabItem } from "@/components/kit";
import { PanelReveal, useToast } from "@/components/motion";
import { useProfile } from "@/lib/use-store";
import { readAiCache, writeAiCache, setState } from "@/lib/state";
import { runAiPrompt } from "@/lib/api";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import {
  PERIOD_LABELS,
  buildNatalChart,
  periodCacheKey,
  periodLabel,
  zodiacPeriodPrompt,
  type NatalChart,
  type ZodiacPeriod,
  type ZodiacSign,
} from "@/lib/zodiac";
import type { Profile } from "@/lib/types";

const PERIOD_TABS: TabItem[] = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

interface HoroscopeProps {
  sign: ZodiacSign;
  profile: Profile | null;
  natalChart: NatalChart | null;
  className?: string;
}

export function Horoscope({ sign, profile, natalChart, className }: HoroscopeProps) {
  const [period, setPeriod] = useState<ZodiacPeriod>("today");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { show: toast } = useToast();
  const requireProfile = useRequireProfile();
  /** Chống race: chỉ nhận kết quả của request mới nhất khi đổi cung/kỳ nhanh. */
  const reqRef = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      // Tải tự động: chỉ chạy khi đã có hồ sơ (không bật modal).
      if (!profile) return;
      const req = ++reqRef.current;
      const key = `${sign.id}::${period}::${periodCacheKey(period)}`;
      const group = `zodiacPeriod.${period}` as const;
      const cached = readAiCache(group, key, force);
      if (cached) {
        setText(cached);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      setText("");
      try {
        // Bảo đảm bản đồ sao đã tính + lưu vào store trước khi nạp vào prompt.
        const chart = natalChart ?? buildNatalChart(profile);
        if (chart && chart !== natalChart) setState({ natalChart: chart });
        const q = zodiacPeriodPrompt(sign, period, profile, chart);
        const result = await runAiPrompt(q, { withChartImage: false, compact: true });
        if (req !== reqRef.current) return;
        writeAiCache(group, key, result, { module: "zodiac", period });
        setText(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không lấy được dự báo.";
        setError(msg);
        toast(`Lỗi dự báo: ${msg}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [sign, period, profile, natalChart, toast],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  if (!profile) {
    return (
      <div className={className}>
        <p className="text-sm leading-relaxed text-muc-2">
          Thêm ngày sinh trong <strong className="text-muc">Hồ sơ</strong> để xem tử vi cho cung{" "}
          {sign.name} theo hôm nay, tuần này và tháng này — tính theo vị trí thiên thể thật.
        </p>
        <Btn variant="primary" size="sm" className="mt-4" onClick={() => { requireProfile(); }}>
          Điền ngày sinh
        </Btn>
      </div>
    );
  }

  const key = periodCacheKey(period);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TopicTabs
          items={PERIOD_TABS}
          value={period}
          onChange={(id) => setPeriod(id as ZodiacPeriod)}
          ariaLabel="Chọn kỳ dự báo"
        />
        <span
          className="rounded-full bg-kim-tint px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-kim-deep"
          suppressHydrationWarning
        >
          {periodLabel(period, key)}
        </span>
      </div>

      <div aria-live="polite" className="mt-5">
        {loading ? (
          <div className="flex flex-col items-center gap-5 py-8">
            <SunSpinner size={44} label={`AstroX đang đọc vị trí thiên thể cho ${sign.name}…`} />
            <div className="w-full max-w-md space-y-2.5" aria-hidden="true">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : error ? (
          <div>
            <p role="alert" className="text-sm font-semibold text-son-deep">
              {error}
            </p>
            <Btn variant="ghost" size="sm" className="mt-3" onClick={() => void load(true)}>
              Thử lại
            </Btn>
          </div>
        ) : text ? (
          <PanelReveal open key={`${sign.id}-${period}-${text.slice(0, 24)}`}>
            <AiText text={text} />
            <div className="mt-4">
              <Btn variant="ghost" size="sm" onClick={() => void load(true)}>
                ↻ Tạo lại
              </Btn>
            </div>
          </PanelReveal>
        ) : (
          <p className="text-sm text-muc-2">Chọn kỳ dự báo để AstroX luận giải.</p>
        )}
      </div>

      <p className="mt-4 sr-only">{`Kỳ dự báo: ${PERIOD_LABELS[period]} cho cung ${sign.name}`}</p>
    </div>
  );
}
