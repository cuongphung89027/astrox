/**
 * DayunTimeline — dải Đại Vận cuộn ngang với mốc tuổi + năm bắt đầu/kết thúc;
 * vận đang diễn (năm hiện tại nằm trong khoảng) nổi viền vàng kim.
 * Port thứ tự/cách đọc từ getYun().getDaYun(9) (bỏ vận index 0) của app cũ.
 */
import { GlassCard } from "@/components/kit";
import type { BatuDayunItem } from "@/lib/batu";

interface DayunTimelineProps {
  dayun: BatuDayunItem[];
}

export function DayunTimeline({ dayun }: DayunTimelineProps) {
  const nowYear = new Date().getFullYear();
  if (dayun.length === 0) {
    return <p className="text-[13px] font-medium text-muc-2">Không tính được Đại Vận.</p>;
  }
  return (
    <ul className="flex snap-x gap-2.5 overflow-x-auto pb-2" aria-label="Các kỳ Đại Vận">
      {dayun.map((d, i) => {
        const current = nowYear >= d.startYear && nowYear <= d.endYear;
        return (
          <li key={`${d.startAge}-${i}`} className="shrink-0 snap-start">
            <GlassCard variant={current ? "premium" : "default"} className={current ? "bg-kim-tint/70 p-3.5 text-center" : "p-3.5 text-center"}>
              <p className="text-[11px] font-bold text-muc-2" style={current ? { color: "var(--color-kim-deep)" } : undefined}>
                {d.startAge}–{d.endAge} tuổi
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold leading-none text-muc" lang="zh-Hant">
                {d.hanGanZhi}
              </p>
              <p className="mt-1.5 text-[12px] font-bold text-muc">{d.viGanZhi}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-muc-2">
                {d.startYear}–{d.endYear}
              </p>
              {current ? (
                <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-kim-deep">Đang diễn</p>
              ) : null}
            </GlassCard>
          </li>
        );
      })}
    </ul>
  );
}
