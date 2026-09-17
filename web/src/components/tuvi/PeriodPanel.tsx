"use client";

/**
 * PeriodPanel — khối 3: vận trình hôm nay / tuần này / tháng này. Prompt port
 * từ tuviPeriodPromptText (Lưu Nhật / Lưu Nguyệt + mẫu Lưu Nhật), cache theo
 * group "tuviPeriod.{today|week|month}", key = kỳ ISO (fingerprint hồ sơ do
 * store lo sẵn). Mỗi tab có nút làm mới (force bỏ qua cache).
 */
import { useMemo, useState } from "react";
import { Btn, Chip, TopicTabs, type TabItem } from "@/components/kit";
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
import { AiPanel } from "./AiPanel";
import { useAiText } from "./useAiText";

const PERIOD_TABS: TabItem[] = [
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

export function PeriodPanel({ profile, chart }: PeriodPanelProps) {
  const [period, setPeriod] = useState<TuviPeriod>("today");

  // Key cache = ngày ISO / tuần / tháng (cập nhật theo thời gian thật).
  const cacheKey = periodCacheKey(period);
  const label = periodLabel(period, cacheKey);

  // Prompt memo: ghép hồ sơ + JSON lá số + dữ liệu lưu chuyển của kỳ.
  const prompt = useMemo(
    () =>
      tuviPromptBody(
        profile,
        chart,
        tuviPeriodPromptText(ziweiInputFrom(profile), label, PERIOD_LABELS[period], period),
      ),
    [profile, chart, label, period],
  );

  const ai = useAiText({ group: GROUP_BY_PERIOD[period], cacheKey, prompt, period });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <TopicTabs items={PERIOD_TABS} value={period} onChange={(id) => setPeriod(id as TuviPeriod)} ariaLabel="Chọn kỳ vận trình" />
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="kim">{label}</Chip>
          <Btn variant="ghost" size="sm" onClick={() => ai.run(true)} ariaLabel={`Làm mới luận giải ${PERIOD_LABELS[period]}`}>
            ↻ Làm mới
          </Btn>
        </div>
      </div>

      <AiPanel
        cached={ai.text}
        loading={ai.loading}
        error={ai.error}
        runLabel="Xem luận giải"
        loadingLabel={`AstroX đang luận giải ${PERIOD_LABELS[period]}…`}
        onRun={ai.run}
      />
    </div>
  );
}
