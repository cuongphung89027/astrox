import { useLocale } from '@/i18n/LocaleProvider';
import { useParityCopy } from '@/i18n/parity-copy';
import type { BatuDayunItem } from '@/lib/batu';
import styles from './Batu.module.css';
export function DayunTimeline({ dayun }: { dayun: BatuDayunItem[] }) {
  const parityCopy = useParityCopy();
  const en = useLocale().locale === 'en';

  const year = new Date().getFullYear();
  if (!dayun.length) return <p>{parityCopy('Chưa có dữ liệu Đại vận.')}</p>;
  return (
    <ol className={styles.timeline}>
      {dayun.map((d, i) => {
        const active = year >= d.startYear && year <= d.endYear;
        return (
          <li key={i} data-current={active} aria-current={active ? 'step' : undefined}>
            <div className={styles.age}>
              <strong>{d.startAge}</strong>
              <span>
                {en ? 'to' : 'đến'} {d.endAge} {en ? 'years' : 'tuổi'}
              </span>
            </div>
            <article>
              <div>
                <span>
                  {d.startYear} — {d.endYear}
                </span>
                <h3>{d.viGanZhi}</h3>
                {active && <small>{parityCopy('Đang đi qua')}</small>}
              </div>
              <b lang="zh-Hant">{d.hanGanZhi}</b>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
