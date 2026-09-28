'use client';
import { useParityCopy } from '@/i18n/parity-copy';
import { LoadingWhisper } from '@/components/kit/LoadingWhisper';
import { useEffect, useRef, useState } from 'react';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { DivinationTube } from './DivinationTube';
import styles from './KinhDich.module.css';
export function CastRitual({
  numbers,
  onComplete,
  onCancel,
}: {
  numbers: [number, number, number];
  onComplete: () => void;
  onCancel: () => void;
}) {
  const parityCopy = useParityCopy();

  const [revealed, setRevealed] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const done = useRef(onComplete);
  useEffect(() => {
    done.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    const timers = [1100, 2350, 3600].map((delay, i) => setTimeout(() => setRevealed(i + 1), delay));
    timers.push(setTimeout(() => setLeaving(true), 4550));
    timers.push(setTimeout(() => done.current(), 4850));
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = old;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.castingStage}
      data-leaving={leaving}
      aria-label={parityCopy('Nghi thức xóc quẻ')}
      onCancel={e => {
        e.preventDefault();
        onCancel();
      }}
    >
      <header className={styles.castingHeader}>
        <span>
          {parityCopy('KINH DỊCH')}
          <i> / </i> {parityCopy('GIEO QUẺ')}
        </span>
        <button onClick={onCancel} aria-label={parityCopy('Huỷ gieo quẻ')}>
          <FeatureIcon name="close" size={20} />
        </button>
      </header>
      <div className={styles.castingTitle}>
        <span className={styles.eyebrow}>
          {revealed === 3 ? parityCopy('BA SỐ ĐÃ SẴN SÀNG') : parityCopy('MỘT ĐIỀU TRONG TÂM')}
        </span>
        <h2>{revealed === 3 ? parityCopy('Quẻ đang mở') : parityCopy('Lắng lại. Gieo một quẻ.')}</h2>
      </div>
      <div className={styles.castingObject}>
        <DivinationTube shaking={revealed < 3} revealed={revealed} numbers={numbers} />
      </div>
      <footer className={styles.castingFooter}>
        <div className={styles.castSteps}>
          {[0, 1, 2].map(i => (
            <div key={i} data-done={revealed > i} data-active={revealed === i}>
              <span>{revealed > i ? <b key="number">{numbers[i]}</b> : <em>0{i + 1}</em>}</span>
              <small>{[parityCopy('Thượng quái'), parityCopy('Hạ quái'), parityCopy('Hào động')][i]}</small>
            </div>
          ))}
        </div>
        <div className={styles.castFooterLine}>
          <p role="status">
            <LoadingWhisper kind="cast" />
          </p>
          <button onClick={onComplete}>
            {parityCopy('Bỏ qua')}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </footer>
    </dialog>
  );
}
