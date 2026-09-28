'use client';
import { useParityCopy } from '@/i18n/parity-copy';
import { useLocale } from '@/i18n/LocaleProvider';
import { useState } from 'react';
import type { NatalChart } from '@/lib/zodiac';
import styles from './Zodiac.module.css';
const symbols: Record<string, string> = {
  'Trùng tụ': '☌',
  'Lục hợp': '⚹',
  'Tam hợp': '△',
  Vuông: '□',
  'Đối đỉnh': '☍',
};
export function AspectMatrix({ chart }: { chart: NatalChart }) {
  const parityCopy = useParityCopy();
  const en = useLocale().locale === 'en';
  const labels: Record<string, string> = {
    'Trùng tụ': 'Conjunction',
    'Lục hợp': 'Sextile',
    'Tam hợp': 'Trine',
    Vuông: 'Square',
    'Đối đỉnh': 'Opposition',
  };
  const viewSymbols = en
    ? Object.fromEntries(Object.entries(symbols).map(([key, value]) => [labels[key], value]))
    : symbols;

  const [selected, setSelected] = useState<{ a: string; b: string; aspect: string; angle: number } | null>(null);
  return (
    <section className={styles.matrixSection}>
      <header>
        <span>{parityCopy('CÁC KẾT NỐI TRÊN BẦU TRỜI')}</span>
        <h3>{parityCopy('Ma trận góc chiếu')}</h3>
        <p>{parityCopy('Chạm vào một ô để xem hai hành tinh liên kết.')}</p>
      </header>
      <div className={styles.matrix} style={{ gridTemplateColumns: `repeat(${chart.planets.length},minmax(0,1fr))` }}>
        {chart.planets.flatMap((planet, row) =>
          chart.planets.slice(0, row + 1).map((other, col) => {
            const aspect = chart.aspects.find(
              a => (a.a === planet.name && a.b === other.name) || (a.b === planet.name && a.a === other.name),
            );
            const active = !!aspect && selected === aspect;
            return row === col ? (
              <span
                key={`${row}-${col}`}
                className={styles.matrixPlanet}
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
                title={planet.name}
                aria-label={planet.name}
              >
                {planet.symbol.replace(/\uFE0F/g, '')}&#xfe0e;
              </span>
            ) : (
              <button
                key={`${row}-${col}`}
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
                aria-label={`${planet.name} ${en ? 'and' : 'và'} ${other.name}: ${aspect ? `${aspect.aspect}, ${aspect.angle} ${en ? 'degrees' : 'độ'}` : parityCopy('không có góc chiếu chính trong phạm vi đang xét')}`}
                aria-pressed={active}
                data-tone={
                  ['Vuông', 'Đối đỉnh', 'Square', 'Opposition'].includes(aspect?.aspect || '') ? 'tension' : 'soft'
                }
                onClick={() =>
                  setSelected(
                    aspect || {
                      a: planet.name,
                      b: other.name,
                      aspect: parityCopy('Không có góc chiếu chính'),
                      angle:
                        Math.round(
                          Math.min(
                            Math.abs(planet.longitude - other.longitude),
                            360 - Math.abs(planet.longitude - other.longitude),
                          ) * 10,
                        ) / 10,
                    },
                  )
                }
              >
                {aspect ? viewSymbols[aspect.aspect] || '·' : <span className={styles.noAspect}>·</span>}
              </button>
            );
          }),
        )}
      </div>
      <div className={styles.matrixSelection} aria-live="polite">
        {selected ? (
          <>
            <strong>
              {selected.a} <span>↔</span> {selected.b}
            </strong>
            <p>
              {selected.aspect} · {selected.angle}°
            </p>
          </>
        ) : (
          <>
            <strong>{parityCopy('Mỗi ô, một kết nối')}</strong>
            <p>{parityCopy('Đường chéo là các hành tinh. Dấu chấm là cặp không có góc chiếu chính.')}</p>
          </>
        )}
      </div>
      <div className={styles.matrixLegend}>
        {Object.entries(viewSymbols).map(([name, symbol]) => (
          <span key={name}>
            <b>{symbol}</b>
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
