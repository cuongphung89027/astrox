import { StructuredReading } from './StructuredReading';
import styles from './ReadingState.module.css';
import { usePaidPrice } from '@/lib/use-paid-price';
import { PaidPriceBadge } from './PaidPriceBadge';
import { useLocale } from '@/i18n/LocaleProvider';
import { readVisualReading } from '../../../../services/admin/visual-reading';
import { VisualReading } from './VisualReading';

export function SavedReading({ text, periodic = false }: { text: string; periodic?: boolean }) {
  const t = useLocale();
  const visual = readVisualReading(text);
  return (
    <div>
      <div className={styles.saved}>
        <span aria-hidden="true">✓</span>
        <span>{t.t('saved.saved')}</span>
        <small>{periodic ? t.t('saved.periodic') : t.t('saved.anytime')}</small>
      </div>
      {visual ? (
        <VisualReading key={visual.createdAt + visual.report.serviceId} saved={visual} />
      ) : (
        <StructuredReading text={text} />
      )}
    </div>
  );
}

export function ReadingInvitation({
  label,
  onRun,
  serviceId,
  prompt,
}: {
  label: string;
  onRun: () => void;
  serviceId?: string;
  prompt?: string;
}) {
  const t = useLocale();
  const price = usePaidPrice(serviceId ?? '', prompt);
  return (
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
  );
}
