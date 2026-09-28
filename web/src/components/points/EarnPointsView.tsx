'use client';
import { useLocale } from '@/i18n/LocaleProvider';
import Link from 'next/link';
import type { RewardsSummary } from '@/lib/api';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { PointCoin } from './PointCoin';
import styles from './EarnPointsView.module.css';

type Props = {
  unit?: string;
  summary: RewardsSummary | null;
  preview: boolean;
  failed?: boolean;
  checkingIn: boolean;
  adBusy: boolean;
  copied: boolean;
  referralLink: string;
  onCheckin: () => void;
  onCopy: () => void;
  onAd: () => void;
};
export function EarnPointsView({
  summary: s,
  unit: walletUnit,
  preview,
  failed = false,
  checkingIn,
  adBusy,
  copied,
  referralLink,
  onCheckin,
  onCopy,
  onAd,
}: Props) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const unit = walletUnit ?? (en ? 'Credits' : 'Point');
  const text = (vi: string, us: string) => (en ? us : vi).replaceAll('Credits', unit).replaceAll('Point', unit);
  const a = s?.attendance,
    r = s?.referral,
    ad = s?.ads;
  const streak = a?.streak ?? 0,
    milestones = a?.milestones ?? [],
    target = milestones.find(m => !a?.claimed.includes(m.day) && m.day > streak)?.day ?? Math.max(7, streak);
  const open = Boolean(s?.enabled && a?.enabled),
    today = Boolean(a?.today);
  const adsOpen = Boolean(s?.enabled && ad?.enabled),
    referralOpen = Boolean(s?.enabled && r?.enabled);
  const loading = !s && !preview && !failed;
  return (
    <div className={styles.page}>
      {preview && (
        <small>{text('Chế độ xem thử · không ghi nhận phần thưởng', 'Preview mode · rewards are not recorded')}</small>
      )}
      <section className={styles.daily} aria-labelledby="daily-title">
        <div className={styles.dailyTop}>
          <span className={styles.eyebrow}>
            <FeatureIcon name="calendar" size={16} /> {text('MỖI NGÀY MỘT CHÚT', 'A LITTLE EVERY DAY')}
          </span>
          <span className={styles.status}>
            {today
              ? text('Đã nhận hôm nay', 'Claimed today')
              : open
                ? text('Sẵn sàng nhận', 'Ready to claim')
                : loading
                  ? text('Đang tải…', 'Loading…')
                  : failed
                    ? text('Chưa tải được', 'Unable to load')
                    : text('Tạm đóng', 'Paused')}
          </span>
        </div>
        <div className={styles.dailyMain}>
          <div>
            <h3 id="daily-title">
              {text('Ghé AstroX.', 'Visit AstroX.')}
              <br />
              {text('Nhận thêm Point.', 'Earn more Credits.')}
            </h3>
            <p className={styles.reward}>
              <PointCoin size={24} />
              <strong>{a ? `+${a.daily}` : '—'}</strong>
              <span>{text('Point / ngày', 'Credits / day')}</span>
            </p>
          </div>
          <div className={styles.orbit} aria-label={en ? `${streak}-day streak` : `Chuỗi ${streak} ngày`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="53" />
              <circle
                cx="60"
                cy="60"
                r="53"
                pathLength="100"
                strokeDasharray={`${Math.min(100, (streak / target) * 100)} 100`}
              />
            </svg>
            <div>
              <strong>{streak}</strong>
              <span>{text('ngày liên tiếp', 'day streak')}</span>
            </div>
            <i aria-hidden="true">✦</i>
          </div>
        </div>
        <div className={styles.dailyBottom}>
          <span>
            {today
              ? text('Hẹn bạn ngày mai.', 'See you tomorrow.')
              : target > streak
                ? en
                  ? `${target - streak} days until your next milestone`
                  : `Thêm ${target - streak} ngày đến mốc tiếp theo`
                : text('Bắt đầu một thói quen nhỏ.', 'Start a daily habit.')}
          </span>
          <button onClick={onCheckin} disabled={!open || today || checkingIn}>
            {checkingIn
              ? text('Đang nhận…', 'Claiming…')
              : today
                ? text('Đã điểm danh ✓', 'Checked in ✓')
                : text('Điểm danh ngay', 'Check in now')}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>
      {milestones.length > 0 && (
        <section className={styles.journey} aria-label={text('Mốc thưởng điểm danh', 'Check-in milestones')}>
          <header>
            <h3>{text('Hành trình của bạn', 'Your journey')}</h3>
            <span>
              {a?.claimed.length ?? 0}/{milestones.length} {en ? 'milestones' : 'mốc'}
            </span>
          </header>
          <div className={styles.milestones}>
            {milestones.map((m, i) => {
              const done = a?.claimed.includes(m.day);
              return (
                <article key={m.day} data-done={done} style={{ animationDelay: `${i * 70}ms` }}>
                  <span className={styles.marker}>{done ? '✓' : '✦'}</span>
                  <small>
                    {en ? 'Day' : 'Ngày'} {m.day}
                  </small>
                  <strong>
                    +{m.points}
                    <span> {unit}</span>
                  </strong>
                  <p>
                    {done
                      ? text('Đã nhận', 'Claimed')
                      : en
                        ? `${Math.max(0, m.day - streak)} days left`
                        : `Còn ${Math.max(0, m.day - streak)} ngày`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.icon}>
              <FeatureIcon name="invite" size={24} />
            </span>
            <span className={styles.badge}>
              {referralOpen
                ? text('Cùng nhau nhận thưởng', 'Earn together')
                : loading
                  ? text('Đang tải…', 'Loading…')
                  : failed
                    ? text('Chưa tải được', 'Unable to load')
                    : text('Tạm đóng', 'Paused')}
            </span>
          </div>
          <h3>{text('Rủ bạn, thêm vui.', 'Invite friends. Share the joy.')}</h3>
          <p className={styles.rate}>
            <strong>{r ? `+${r.registrationInviter}` : '—'}</strong> {text('Point / bạn mới', 'Credits / new friend')}
          </p>
          <div className={styles.stats}>
            <div>
              <strong>{r?.invited ?? '—'}</strong>
              <span>{text('Bạn đã mời', 'Friends invited')}</span>
            </div>
            <div>
              <strong>{r?.earned.toLocaleString(en ? 'en-US' : 'vi-VN') ?? '—'}</strong>
              <span>{text('Point đã nhận', 'Credits earned')}</span>
            </div>
          </div>
          <button className={styles.action} onClick={onCopy} disabled={!referralOpen || !referralLink}>
            {copied ? text('Đã sao chép ✓', 'Copied ✓') : text('Sao chép link mời', 'Copy invite link')}
            <span aria-hidden="true">↗</span>
          </button>
          <details>
            <summary>{text('Cách nhận thưởng', 'How rewards work')}</summary>
            <p>
              {en
                ? `Friends sign up with Google for the first time using your link. They receive +${r?.registrationUser ?? 0} Credits.`
                : `Bạn bè đăng ký Zalo lần đầu qua link của bạn. Người mới nhận +${r?.registrationUser ?? 0} Point.`}
            </p>
            {r?.firstTopupEnabled && (
              <p>
                {en ? (
                  `Earn +${r.firstTopupInviter} Credits when your friend makes their first qualifying purchase.`
                ) : (
                  <>
                    Thêm +{r.firstTopupInviter} Point khi bạn bè nạp lần đầu
                    {r.firstTopupMinVnd ? ` từ ${r.firstTopupMinVnd.toLocaleString('vi-VN')}đ` : ''}.
                  </>
                )}
              </p>
            )}
            {milestones
              .filter(m => (m.inviterPoints ?? 0) > 0)
              .map(m => (
                <p key={m.day}>
                  {en
                    ? `Your friend reaches day ${m.day}: +${m.inviterPoints} Credits.`
                    : `Bạn bè điểm danh mốc ${m.day} ngày: +${m.inviterPoints} Point.`}
                </p>
              ))}
          </details>
        </section>
        <section className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.icon}>
              <FeatureIcon name="play" size={24} />
            </span>
            <span className={styles.badge}>
              {adsOpen
                ? text('Đang mở', 'Available')
                : loading
                  ? text('Đang tải…', 'Loading…')
                  : failed
                    ? text('Chưa tải được', 'Unable to load')
                    : text('Sắp mở', 'Coming soon')}
            </span>
          </div>
          <h3>{text('Một phút khám phá.', 'A moment to explore.')}</h3>
          <p className={styles.rate}>
            <strong>{ad ? `+${ad.points}` : '—'}</strong> {text('Point / quảng cáo', 'Credits / ad')}
          </p>
          <div className={styles.adProgress}>
            <div>
              <strong>
                {ad?.used ?? 0}
                <small> / {ad?.dailyLimit ?? 0}</small>
              </strong>
              <span>{text('Lượt hôm nay', 'Today’s views')}</span>
            </div>
            <progress
              aria-label={text('Lượt quảng cáo đã nhận hôm nay', 'Rewarded ads today')}
              max={Math.max(1, ad?.dailyLimit ?? 1)}
              value={ad?.used ?? 0}
            />
          </div>
          <button
            className={styles.action}
            onClick={onAd}
            disabled={!adsOpen || adBusy || (ad?.used ?? 0) >= (ad?.dailyLimit ?? 0)}
          >
            {adBusy
              ? text('Đang mở…', 'Opening…')
              : !adsOpen
                ? text('Chưa có quảng cáo', 'No ads available')
                : (ad?.used ?? 0) >= (ad?.dailyLimit ?? 0)
                  ? text('Đã đủ lượt hôm nay', 'Daily limit reached')
                  : text('Xem & nhận Point', 'Watch & earn Credits')}
            <span aria-hidden="true">▷</span>
          </button>
          <details>
            <summary>{text('Điều kiện nhận Point', 'Reward conditions')}</summary>
            <p>
              {en
                ? `Credits are added when the ad network confirms eligibility. Closing early earns no reward. Wait ${ad?.cooldownSeconds ?? 0} seconds between ads.`
                : `Point được cộng khi mạng quảng cáo xác nhận đủ điều kiện. Đóng sớm sẽ không nhận thưởng. Chờ ${ad?.cooldownSeconds ?? 0} giây giữa hai lượt.`}
            </p>
          </details>
        </section>
      </div>
      <footer className={styles.footer}>
        <details>
          <summary>{text('Quy tắc điểm danh', 'Check-in rules')}</summary>
          <p>
            {text(
              'Tính theo giờ Việt Nam. Bỏ một ngày thì chuỗi tính lại; mỗi mốc thưởng chỉ nhận một lần cho mỗi tài khoản.',
              'Check-ins reset at midnight Vietnam time (UTC+7). Missing a day resets your streak. Each milestone is rewarded once per account.',
            )}
          </p>
        </details>
        <Link href={en ? '/en/profile?section=points' : '/hoso?section=points'}>
          {text('Xem lịch sử Point ↗', 'View Credits history ↗')}
        </Link>
      </footer>
    </div>
  );
}
