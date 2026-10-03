import type { PalmReading } from '@/lib/palm';
import { GlassCard } from '@/components/kit';
import s from './Palm.module.css';
export function PalmReadingCards({
  result,
  side,
  active,
  onSelect,
  en,
}: {
  result: PalmReading;
  side: string;
  active: number;
  onSelect: (n: number) => void;
  en: boolean;
}) {
  const line = result.lines[active];
  return (
    <GlassCard className={s.panel}>
      <div className={s.resultEyebrow}>
        {en ? 'YOUR PALM READING' : 'BÀI ĐỌC CỦA BẠN'} ·{' '}
        {en ? (side === 'Tay trái' ? 'Left hand' : 'Right hand') : side}
      </div>
      <h2>{en ? 'A closer look' : 'Từng nét riêng'}</h2>
      <p className={s.summary}>{result.summary}</p>
      <div className={s.lineTabs} role="group" aria-label={en ? 'Select palm lines' : 'Chọn đường chỉ tay'}>
        {result.lines.map((l, i) => (
          <button key={`${l.name}-${i}`} aria-pressed={active === i} onClick={() => onSelect(i)}>
            {l.name}
          </button>
        ))}
      </div>
      {line && (
        <div className={s.lineReading} aria-live="polite">
          <div className={s.visibility}>
            {line.visibility === 'clear'
              ? en
                ? 'Visible detail'
                : 'Nếp nhìn rõ'
              : line.visibility === 'partial'
                ? en
                  ? 'Partly visible'
                  : 'Nhìn thấy một phần'
                : en
                  ? 'Visibility not confirmed'
                  : 'Độ rõ chưa xác nhận'}
          </div>
          <details key={active} className={s.observation} open>
            <summary>{en ? 'Photo observations' : 'Quan sát từ ảnh'}</summary>
            <p>{line.observation}</p>
          </details>
          {line.uncertainty && (
            <p className={s.uncertainty}>
              {en ? 'Unclear: ' : 'Chưa rõ: '}
              {line.uncertainty}
            </p>
          )}
          <div className={s.interpretation}>
            <span>{en ? 'Traditional interpretation' : 'Diễn giải truyền thống'}</span>
            <p>{line.reading}</p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
