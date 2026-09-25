"use client";
import { useFeatureResult } from "@/lib/use-feature-result";
import { refreshPromptRevision } from "@/lib/state";
import styles from "./Zodiac.module.css";
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { SavedReading, ReadingInvitation } from "@/components/kit/SavedReading";

/**
 * Horoscope — tử vi theo kỳ (hôm nay / tuần này / tháng này) cho cung đang
 * chọn. Prompt port từ zodiacPeriodPrompt (quá cảnh thật bằng astronomy-engine),
 * cache nhóm "zodiacPeriod.*". Chờ: SunSpinner + Skeleton; xong: PanelReveal +
 * AiText + nút "Tạo lại".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, TopicTabs, type TabItem } from "@/components/kit";
import { PanelReveal, useToast } from "@/components/motion";
import { readAiCache, writeAiCache, setState } from "@/lib/state";
import { runAiPrompt } from "@/lib/api";
import { usePaidPrice } from "@/lib/use-paid-price";
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

  const markFresh = useFeatureResult(text, `zodiac--period--${period}`, !loading && !!profile);
  const pricePrompt = profile ? zodiacPeriodPrompt(sign, period, profile, natalChart ?? buildNatalChart(profile)) : undefined;
  const price = usePaidPrice(`zodiac--period--${period}`, pricePrompt);
  const load = useCallback(
    async (force: boolean) => {
      // Tải tự động: chỉ chạy khi đã có hồ sơ (không bật modal).
      if (!profile) return;
      const req = ++reqRef.current;
      const key = `natal-v2::${sign.id}::${period}::${periodCacheKey(period)}`;
      const group = `zodiacPeriod.${period}` as const;
      await refreshPromptRevision();
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
        const result = await runAiPrompt(q, { withChartImage: false, compact: true, serviceId: `zodiac--period--${period}` });
        if (req !== reqRef.current) return;
        writeAiCache(group, key, result, { module: "zodiac", period });
        markFresh(result); setText(result);
      } catch (e) {
        if (req !== reqRef.current) return;
        const msg = e instanceof Error ? e.message : "Không lấy được dự báo.";
        setError(msg);
        toast(`Lỗi dự báo: ${msg}`, "error");
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    },
    [markFresh, sign, period, profile, natalChart, toast],
  );

  const scope=sign.id+period+JSON.stringify(profile),[previousScope,setPreviousScope]=useState<string|null>(null);
  if(scope!==previousScope){
    setPreviousScope(scope);
    setText(readAiCache(`zodiacPeriod.${period}`, `natal-v2::${sign.id}::${period}::${periodCacheKey(period)}`));
    setLoading(false);
    setError("");
  }
  useEffect(()=>()=>{reqRef.current++;},[scope]);

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
      <div className={styles.periodBar}>
        <TopicTabs
          className={styles.periodTabs}
          items={PERIOD_TABS}
          value={period}
          onChange={(id) => setPeriod(id as ZodiacPeriod)}
          ariaLabel="Chọn kỳ dự báo"
        />
        <span
          className={styles.periodBadge}
          suppressHydrationWarning
        >
          {periodLabel(period, key)}
        </span>
      </div>

      <div aria-live="polite" className="mt-5">
        {loading ? (
          <ReadingLoader kind="zodiac" />
        ) : error ? (
          <div>
            <p role="alert" className="text-sm font-semibold text-son-deep">
              {error}
            </p>
            <Btn variant="ghost" size="sm" className="mt-3" disabled={price.pending} onClick={() => void load(true)}>
              Thử lại{price.paid && ` · ${price.text}`}
            </Btn>
          </div>
        ) : text ? (
          <PanelReveal open key={`${sign.id}-${period}-${text.slice(0, 24)}`}>
            <SavedReading text={text} periodic />
            <div className="mt-4">
              <Btn variant="ghost" size="sm" disabled={price.pending} onClick={() => void load(true)}>
                ↻ Tạo lại{price.paid && ` · ${price.text}`}
              </Btn>
            </div>
          </PanelReveal>
        ) : (
          <ReadingInvitation label={`Xem dự báo ${PERIOD_LABELS[period].toLowerCase()}`} onRun={() => void load(false)} serviceId={`zodiac--period--${period}`} prompt={pricePrompt}/>
        )}
      </div>

      <p className="mt-4 sr-only">{`Kỳ dự báo: ${PERIOD_LABELS[period]} cho cung ${sign.name}`}</p>
    </div>
  );
}
