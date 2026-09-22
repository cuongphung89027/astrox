"use client";

/**
 * PeriodPanel — khối 3: vận trình hôm nay / tuần này / tháng này. Prompt port
 * từ tuviPeriodPromptText (Lưu Nhật / Lưu Nguyệt + mẫu Lưu Nhật), cache theo
 * group "tuviPeriod.{today|week|month}", key = kỳ ISO (fingerprint hồ sơ do
 * store lo sẵn). Mỗi tab có nút làm mới (force bỏ qua cache).
 */
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { usePreferences } from "@/lib/preferences";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import styles from "./PeriodPanel.module.css";
import {
  PERIOD_LABELS,
  periodCacheKey,
  periodLabel,
  tuviPeriodPromptText,
  tuviPromptBody,
  ziweiInputFrom,
  type TuviPeriod,
  type ZiweiChart,
} from "@/lib/tuvi";
import type { Profile } from "@/lib/types";
import { SavedReading } from "@/components/kit/SavedReading";
import { useAiText } from "./useAiText";

const PERIOD_TABS: { id: TuviPeriod; label: string }[] = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

const GROUP_BY_PERIOD = {
  today: "tuviPeriod.today",
  week: "tuviPeriod.week",
  month: "tuviPeriod.month",
} as const;

interface PeriodPanelProps {
  profile: Profile;
  chart: ZiweiChart | null;
}

function LoadingProgress({ completing }: { completing: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return <div className={styles.progress} data-completing={completing}>
    <div className={styles.progressTrack} role="progressbar" aria-label="Đang tạo luận giải" aria-valuetext={completing ? "Đã có kết quả, chuẩn bị hiển thị" : "Đang chờ kết quả từ AstroX"}><span /></div>
    <ol aria-label="Tiến trình luận giải">
      <li data-state="done"><span className={styles.stepIndicator} aria-hidden="true">✓</span>Chuẩn bị dữ liệu lá số</li>
      <li data-state={completing ? "done" : "active"}><span className={styles.stepIndicator} aria-hidden="true">{completing ? "✓" : null}</span>{completing ? "Đã hoàn tất luận giải" : <LoadingWhisper kind="period"/>}<strong aria-label={`Đã chờ ${elapsed} giây`}>{elapsed}s</strong></li>
      <li data-state={completing ? "active" : "waiting"}><span className={styles.stepIndicator} aria-hidden="true" />Hiển thị luận giải</li>
    </ol>
    {!completing && elapsed >= 25 && <p role="status">AstroX vẫn đang xử lý. Bạn chưa cần gửi lại yêu cầu.</p>}
  </div>;
}

export function PeriodPanel({ profile, chart }: PeriodPanelProps) {
  const settings = usePreferences();
  const [chosenPeriod, setPeriod] = useState<TuviPeriod | null>(null);
  const period = chosenPeriod ?? settings.period;

  // Key cache = ngày ISO / tuần / tháng (cập nhật theo thời gian thật).
  const cacheKey = periodCacheKey(period);
  const label = periodLabel(period, cacheKey);

  // Prompt memo: ghép hồ sơ + JSON lá số + dữ liệu lưu chuyển của kỳ.
  const prompt = useMemo(
    () =>
      tuviPromptBody(
        profile,
        chart,
        tuviPeriodPromptText(ziweiInputFrom(profile), label, PERIOD_LABELS[period], period) + "\nTrình bày thành đúng 3 mục với tiêu đề riêng trên một dòng: ## Nhịp chung, ## Điều thuận lợi, ## Điều cần lưu tâm. Giữ đủ nội dung được yêu cầu trong các mục này.",
      ),
    [profile, chart, label, period],
  );

  const ai = useAiText({ group: GROUP_BY_PERIOD[period], cacheKey, prompt, period, revealDelayMs: 750 });

  const [direction, setDirection] = useState(1);
  const periodIndex = PERIOD_TABS.findIndex(item => item.id === period);


  return <section className={styles.screen} aria-label="Vận trình của bạn">
    <div className={styles.orbit} style={{ "--orbit-index": periodIndex } as CSSProperties}>
      <svg viewBox="0 0 600 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 18 Q300 136 600 18" /></svg>
      <div className={styles.periods} role="group" aria-label="Chọn kỳ vận trình">
        {PERIOD_TABS.map((item, index) => <button key={item.id} aria-pressed={period === item.id} onClick={() => { setDirection(index >= periodIndex ? 1 : -1); setPeriod(item.id); }}><span>{item.label}</span></button>)}
      </div>
      <span className={styles.orbitLight} aria-hidden="true" />
    </div>
    <div key={period} className={styles.time} style={{ "--direction": direction } as CSSProperties}>
      <h2>{label}</h2>
      <FeatureIcon name="tuvi" size={180} className={styles.sun} />
    </div>
    <div className={styles.journey}>
      <div className={styles.reading} aria-busy={ai.loading}>
        {ai.loading ? <div role="status" className={styles.pending}>
          <ReadingLoader kind="tuvi" label="Đọc vận trình của bạn…" showElapsed={false} showWhisper={false} />
          <LoadingProgress completing={ai.completing} />
        </div> : ai.text ? <>
          <SavedReading text={ai.text} periodic />
          {ai.error && <p role="alert" className={styles.error}>{ai.error}</p>}
          <button className={styles.regenerate} onClick={() => ai.run(true)}>↻ Đọc lại vận trình</button>
        </> : <div className={styles.invitation}>
          {ai.error && <p role="alert" className={styles.error}>{ai.error}</p>}
          <button className={styles.cta} onClick={() => ai.run(false)}>{ai.error ? "Thử lại" : "Mở vận trình"}<span aria-hidden="true">↗</span></button>
        </div>}
      </div>
    </div>
  </section>;
}
