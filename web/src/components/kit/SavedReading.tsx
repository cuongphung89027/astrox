'use client';
import { useState, type ReactNode } from 'react';
import { StructuredReading } from './StructuredReading';
import styles from './ReadingState.module.css';
import { usePaidPrice } from '@/lib/use-paid-price';
import { PaidPriceBadge } from './PaidPriceBadge';
import { useLocale } from '@/i18n/LocaleProvider';
import { readVisualReading } from '../../../../services/admin/visual-reading';
import { VisualReading } from './VisualReading';
import { ReadingUpgrade, type ReadingUpgradeContext } from './ReadingUpgrade';
import { readAiReadingHistory } from '@/lib/state';
import upgradeStyles from './ReadingUpgrade.module.css';

export function SavedReading({
  text,
  periodic = false,
  upgrade,
  renderLegacy,
}: {
  text: string;
  periodic?: boolean;
  upgrade?: ReadingUpgradeContext;
  renderLegacy?: (text: string) => ReactNode;
}) {
  const t = useLocale();
  const [historyId, setHistoryId] = useState('');
  const history = upgrade ? readAiReadingHistory(upgrade.cache.group, upgrade.cache.key) : [];
  const historical = history.find(entry => entry.id === historyId);
  const shown = historical?.text ?? text;
  const visual = readVisualReading(shown);
  return (
    <div>
      <div className={styles.saved}>
        <span aria-hidden="true">✓</span>
        <span>{t.t('saved.saved')}</span>
        <small>{periodic ? t.t('saved.periodic') : t.t('saved.anytime')}</small>
      </div>
      {!!history.length && (
        <details className={upgradeStyles.history}>
          <summary>
            {t.locale === 'en' ? 'Saved versions' : 'Các phiên bản đã lưu'} · {history.length + 1}
          </summary>
          <div>
            <button type="button" aria-pressed={!historical} onClick={() => setHistoryId('')}>
              {t.locale === 'en' ? 'Current version' : 'Bản hiện tại'}
            </button>
            {history.map(entry => (
              <button
                type="button"
                key={entry.id}
                aria-pressed={entry.id === historyId}
                onClick={() => setHistoryId(entry.id)}
              >
                {t.locale === 'en' ? 'Earlier reading' : 'Bài trước'} ·{' '}
                {new Date(entry.updatedAt).toLocaleString(t.locale === 'en' ? 'en-US' : 'vi-VN')}
              </button>
            ))}
          </div>
        </details>
      )}
      {upgrade && !readVisualReading(text) && (
        <ReadingUpgrade
          key={upgrade.serviceId + upgrade.prompt}
          context={{
            ...upgrade,
            onComplete: next => {
              setHistoryId('');
              upgrade.onComplete(next);
            },
          }}
        />
      )}
      {visual ? (
        <VisualReading key={visual.createdAt + visual.report.serviceId} saved={visual} />
      ) : renderLegacy ? (
        renderLegacy(shown)
      ) : (
        <StructuredReading text={shown} />
      )}
    </div>
  );
}

export function ReadingInvitation({
  label,
  onRun,
  serviceId,
  prompt,
  upgrade,
}: {
  label: string;
  onRun: () => void;
  serviceId?: string;
  prompt?: string;
  upgrade?: ReadingUpgradeContext;
}) {
  const t = useLocale();
  const price = usePaidPrice(serviceId ?? '', prompt);
  return (
    <>
      {upgrade && <ReadingUpgrade context={upgrade} onlyEntitled />}
      <div className={styles.invitation}>
        <div>
          <span>{t.t('saved.none')}</span>
          <p>{t.t('saved.invite')}</p>
        </div>
        <button onClick={onRun} disabled={!!serviceId && price.pending}>
          {label}
          {serviceId && <PaidPriceBadge price={price} />}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </>
  );
}
