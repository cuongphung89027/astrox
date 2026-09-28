'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import { TRIGRAMS_EN, HEXAGRAM_NAMES_EN, KD_METHODS_EN, KD_RELATION_EN } from '@/i18n/divination-en';
import type { CastResult } from '@/lib/kinhdich';
import { KD_METHODS, hexagramName, hexagramInfo } from '@/lib/kinhdich';
import { HexagramSvg, hexagramAriaLabel } from './HexagramSvg';
import styles from './KinhDich.module.css';
interface KdResultPanelProps {
  result: CastResult;
}
export function KdResultPanel({ result }: KdResultPanelProps) {
  const t = useLocale();
  const en = t.locale === 'en';
  const triLabel = (tr: { idx: number; name: string; nature: string; elem: string; dir: string }) =>
    en ? (TRIGRAMS_EN[tr.idx] ?? tr) : tr;
  // Quẻ biến dựng lại từ dòng hào đã đảo hào động (port logic cũ).
  const bienLines = result.lines.map(l => ({ ...l, bit: l.moving ? 1 - l.bit : l.bit, moving: false }));
  const mainInfo = hexagramInfo(result.upper, result.lower);
  const mainName = en ? HEXAGRAM_NAMES_EN[mainInfo.number - 1] : mainInfo.name;
  const bienInfo = hexagramInfo(result.bienUpper, result.bienLower);
  const bienName = en ? HEXAGRAM_NAMES_EN[bienInfo.number - 1] : bienInfo.name;

  return (
    <section className={styles.quietResult}>
      <div className={styles.oracleSeal}>
        <div className={styles.sealMain}>
          <div className={styles.sealText}>
            <span>{en ? 'PRIMARY HEXAGRAM' : 'QUẺ CHÍNH'}</span>
            <h3>{mainName}</h3>
            <small>
              {result.lines.some(l => l.moving)
                ? `${en ? 'Moving lines' : 'Hào động'}: ${result.lines
                    .filter(l => l.moving)
                    .map(l => l.pos)
                    .join(', ')}`
                : en
                  ? 'No moving lines'
                  : 'Không có hào động'}
            </small>
          </div>
          <div className={styles.sealFigure}>
            <HexagramSvg lines={result.lines} label={hexagramAriaLabel(result.lines, mainName, en)} />
          </div>
        </div>
        <div className={styles.sealChange}>
          <span aria-hidden="true">↳</span>
          <div>
            <small>{en ? 'TRANSFORMS INTO' : 'CHUYỂN THÀNH'}</small>
            <h4>{bienName}</h4>
          </div>
          <HexagramSvg lines={bienLines} label={hexagramAriaLabel(bienLines, bienName, en)} />
        </div>
      </div>
      <details className={styles.castDetails}>
        <summary>{en ? 'Hexagram details' : 'Xem chi tiết quẻ'}</summary>
        <p>
          {(en ? KD_METHODS_EN : KD_METHODS)[result.method || 'numbers']}
          {result.algorithmVersion === 'legacy-v1'
            ? en
              ? ' · Previously saved version'
              : ' · Bản đã lưu trước đây'
            : ''}
        </p>
        {result.method !== 'coins' && (
          <>
            <p>
              {en ? (KD_RELATION_EN[result.relation.key]?.label ?? 'Elemental relationship') : result.relation.label} ·{' '}
              {en ? (KD_RELATION_EN[result.relation.key]?.desc ?? '') : result.relation.desc}
            </p>
            <p>
              {en ? 'Body' : 'Thể'}: {triLabel(result.the).name} · {triLabel(result.the).elem}. {en ? 'Use' : 'Dụng'}:{' '}
              {triLabel(result.dung).name} · {triLabel(result.dung).elem}.
            </p>
            {result.method === 'numbers' && (
              <p>
                {en ? 'Three numbers' : 'Ba số'}: {result.s1} · {result.s2} · {result.s3}
              </p>
            )}
            <p>
              {en ? 'Upper' : 'Thượng quái'}: {triLabel(result.upper).name} · {t.locale === 'en' ? 'Lower' : 'Hạ quái'}:{' '}
              {triLabel(result.lower).name}
            </p>
            <p>
              {en ? 'Nuclear hexagram' : 'Quẻ hỗ'}:{' '}
              {en
                ? HEXAGRAM_NAMES_EN[hexagramInfo(result.hoUpper, result.hoLower).number - 1]
                : hexagramName(result.hoUpper, result.hoLower)}
            </p>
          </>
        )}
        {result.metadata?.normalized && (
          <p>
            {en ? 'Input' : 'Dữ liệu'}: {String(result.metadata.normalized)}
          </p>
        )}
        {result.metadata?.timestamp && (
          <p>
            {en ? 'Time' : 'Thời điểm'}:{' '}
            {new Date(String(result.metadata.timestamp)).toLocaleString(en ? 'en-US' : 'vi-VN', {
              timeZone: 'Asia/Ho_Chi_Minh',
            })}{' '}
            (UTC+7). {en ? 'Lunar date' : 'Âm lịch'}: {String(result.metadata.lunarDay)}/
            {String(result.metadata.lunarMonth)}/{String(result.metadata.lunarYear)}
            {result.metadata.leapMonth ? (en ? ' · leap month' : ' · tháng nhuận') : ''}.{' '}
            {en ? 'Year branch' : 'Chi năm'}: {String(result.metadata.yearBranch)} · {en ? 'Hour branch' : 'chi giờ'}:{' '}
            {String(result.metadata.hourBranch)}.
          </p>
        )}
        {result.method === 'coins' && (
          <p>
            {en ? 'Line values, bottom to top' : 'Giá trị hào từ dưới lên'}:{' '}
            {(result.metadata?.values as number[])?.join(' · ')}
          </p>
        )}
      </details>
    </section>
  );
}
