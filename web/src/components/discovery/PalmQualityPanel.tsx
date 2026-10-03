import type { PalmQuality, PalmQualityCheck } from '@/lib/palm-quality';
import s from './Palm.module.css';
const labels = {
  vi: { resolution: 'Kích thước', lighting: 'Ánh sáng', sharpness: 'Độ nét', hand: 'Bàn tay', framing: 'Trong khung' },
  en: { resolution: 'Resolution', lighting: 'Lighting', sharpness: 'Sharpness', hand: 'Hand', framing: 'Framing' },
};
export function palmQualityMessage(quality: PalmQuality, en: boolean): string {
  const issue =
    quality.checks.find(c => c.status === 'fail') ??
    quality.checks.find(c => c.status === 'warn') ??
    quality.checks.find(c => c.status === 'unknown');
  if (!issue) return en ? 'Your photo is ready for review.' : 'Ảnh đã sẵn sàng để xem lại.';
  const messages = {
    resolution: en ? 'Move closer or choose a larger photo.' : 'Đưa tay gần hơn hoặc chọn ảnh lớn hơn.',
    lighting: en
      ? 'Use soft, even light; avoid glare and deep shadows.'
      : 'Dùng ánh sáng dịu, đều; tránh đèn chiếu chói và bóng tối.',
    sharpness: en
      ? 'Palm details look soft. Hold still, clean the lens and refocus.'
      : 'Nếp tay có thể chưa rõ. Giữ yên, lau ống kính và lấy nét lại.',
    hand: en
      ? 'Hand detection has not confirmed this photo. Check that it shows an open palm.'
      : 'Chưa xác nhận được bàn tay trong ảnh. Kiểm tra ảnh có lòng bàn tay mở.',
    framing: en
      ? 'Bring the hand closer, face your palm toward the camera and keep every edge in view.'
      : 'Đưa tay gần hơn, hướng lòng tay về máy và giữ đủ các mép tay trong ảnh.',
  };
  return messages[issue.id];
}
export function PalmQualityPanel({ quality, en }: { quality: PalmQuality; en: boolean }) {
  const status = (c: PalmQualityCheck) =>
    c.status === 'pass'
      ? en
        ? 'OK'
        : 'Đạt'
      : c.status === 'fail'
        ? en
          ? 'Retake'
          : 'Chụp lại'
        : c.status === 'unknown'
          ? en
            ? 'Check'
            : 'Cần xem lại'
          : en
            ? 'Check'
            : 'Cần cải thiện';
  return (
    <div className={s.qualityPanel} role="status">
      <div className={s.qualityHeading}>
        <strong>{en ? 'Photo check' : 'Kiểm tra ảnh'}</strong>
        <span>
          {quality.state === 'ready'
            ? en
              ? 'Ready'
              : 'Sẵn sàng'
            : quality.state === 'retake'
              ? en
                ? 'Retake needed'
                : 'Cần chụp lại'
              : en
                ? 'Review suggested'
                : 'Nên xem lại'}
        </span>
      </div>
      <ul className={s.qualityChecks}>
        {quality.checks.map(c => (
          <li key={c.id} data-status={c.status}>
            <span>{labels[en ? 'en' : 'vi'][c.id]}</span>
            <strong>{status(c)}</strong>
          </li>
        ))}
      </ul>
      <p>{palmQualityMessage(quality, en)}</p>
    </div>
  );
}
