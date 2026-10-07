'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/lib/auth';
import { usePointsBalance } from '@/lib/points';
import { useDailyCheckin } from '@/lib/use-daily-checkin';
import { vietnamRewardDay } from '@/lib/daily-checkin-store';
import { openLoginDialog } from '@/lib/login-dialog';
import { moduleRoute } from '@/lib/locale';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { PointCoin } from '@/components/points/PointCoin';
import { useToast } from '@/components/motion';
import { Term } from '@/components/kit/Term';
import s from './DailyOverview.module.css';

type Facts = ReturnType<typeof import('@/lib/almanac').dayFacts>;
export function DailyOverview({ now }: { now: Date | null }) {
  const { locale } = useLocale(),
    en = locale === 'en';
  const text = (vi: string, us: string) => (en ? us : vi);
  const { ready, loggedIn, astroxUser } = useAuth();
  const preview = astroxUser?.id === 'localhost-preview';
  const { market } = usePointsBalance(loggedIn && !preview);
  const unit = market === 'US' ? 'Credits' : market === 'VN' ? 'Point' : en ? 'Credits' : 'Point';
  const rewards = useDailyCheckin(),
    toast = useToast();
  const date = now ? vietnamRewardDay(now) : '';
  const [calendar, setCalendar] = useState<{
    date: string;
    locale: string;
    facts: Facts | null;
    error: boolean;
  } | null>(null);
  const [calendarRetry, setCalendarRetry] = useState(0);
  useEffect(() => {
    if (!date) return;
    let alive = true;
    void import('@/lib/almanac')
      .then(({ dayFacts }) => dayFacts(date, locale))
      .then(facts => {
        if (alive) setCalendar({ date, locale, facts, error: false });
      })
      .catch(() => {
        if (alive) setCalendar({ date, locale, facts: null, error: true });
      });
    return () => {
      alive = false;
    };
  }, [date, locale, calendarRetry]);
  const current = calendar?.date === date && calendar?.locale === locale ? calendar : null;
  const facts = current?.facts;
  const a = rewards.summary?.attendance;
  const today = Boolean(a?.today);
  const open = Boolean(rewards.status === 'ready' && rewards.summary?.enabled && a?.enabled);
  const loading = !ready || (loggedIn && !preview && ['idle', 'loading'].includes(rewards.status));
  const failed = rewards.status === 'error';
  const streak = a?.streak ?? 0;
  const weekday = date
    ? new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(
        new Date(date + 'T12:00:00+07:00'),
      )
    : text('Hôm nay', 'Today');
  const solarDate = date
    ? en
      ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(
          new Date(date + 'T12:00:00+07:00'),
        )
      : `${Number(date.slice(-2))}/${Number(date.slice(5, 7))}`
    : '';
  async function checkin() {
    if (!loggedIn) {
      openLoginDialog();
      return;
    }
    if (preview) {
      toast.show(
        text(
          'Đăng nhập thật để nhận thưởng. Tài khoản xem thử không ghi nhận điểm danh.',
          'Sign in to claim rewards. Preview check-ins are not recorded.',
        ),
        'info',
      );
      return;
    }
    if (failed) {
      void rewards.reload();
      return;
    }
    const result = await rewards.claim();
    if ('error' in result) {
      if (['account_changed', 'checkin_busy'].includes(result.error)) return;
      toast.show(
        result.error === 'already_checked_in'
          ? text('Hôm nay bạn đã điểm danh rồi.', 'You have already checked in today.')
          : result.error === 'attendance_disabled'
            ? text('Điểm danh đang tạm đóng.', 'Check-in is currently paused.')
            : text(
                'Chưa xác nhận được điểm danh. Kiểm tra lịch sử rồi thử lại.',
                'Check-in could not be confirmed. Check your history before retrying.',
              ),
        result.error === 'already_checked_in' ? 'info' : 'error',
      );
    } else toast.show(`${text('Điểm danh thành công', 'Checked in')} +${result.points} ${unit}`, 'success');
  }
  return (
    <section
      className={s.overview}
      aria-label={text('Lịch âm và điểm danh hôm nay', 'Today’s lunar calendar and check-in')}
    >
      <article className={s.calendar} aria-labelledby="home-calendar-title" aria-describedby="home-lunar-date">
        <header className={s.cardTop}>
          <h2 id="home-calendar-title">
            <FeatureIcon name="calendar" size={17} />
            {text('Lịch âm', 'Lunar date')}
          </h2>
          {current?.error && (
            <button
              className={s.calendarRetry}
              type="button"
              onClick={() => setCalendarRetry(n => n + 1)}
              aria-label={text('Thử lại lịch', 'Retry calendar')}
            >
              ↻
            </button>
          )}
        </header>
        <div id="home-lunar-date" className={s.calendarMain} aria-live="polite">
          <div className={s.moonArt} aria-hidden="true">
            <svg viewBox="0 0 140 140" fill="none">
              <circle cx="70" cy="70" r="62" />
              <circle cx="70" cy="70" r="49" />
              <path d="M96 40a39 39 0 1 0 0 60 34 34 0 0 1 0-60Z" />
              <path d="m112 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
            </svg>
          </div>
          <strong>{facts ? `${facts.lunar.day}/${facts.lunar.month}` : '—'}</strong>
          {facts && (
            <span style={{ fontSize: '11px', color: '#6d715b', marginTop: '2px' }}>
              <Term termKey={facts.god}>{facts.god}</Term> · {facts.good ? text('Hoàng đạo', 'Auspicious') : text('Hắc đạo', 'Inauspicious')}
            </span>
          )}
          {facts?.lunar.leap && <span>{text('Tháng nhuận', 'Leap month')}</span>}
          {current?.error && <span>{text('Chưa tải được lịch', 'Calendar unavailable')}</span>}
        </div>
        <Link
          className={s.calendarLink}
          href={moduleRoute('lunar-calendar', locale)}
          aria-label={text('Mở lịch đầy đủ', 'Open full calendar')}
        >
          <span>{date ? `${solarDate} · ${weekday}` : '—'}</span>
          <span aria-hidden="true">↗</span>
        </Link>
      </article>
      <article
        className={s.checkin}
        data-claimed={today}
        aria-labelledby="home-checkin-title"
        aria-describedby="home-reward-detail"
      >
        <header className={s.cardTop}>
          <h2 id="home-checkin-title">
            <FeatureIcon name="wallet" size={17} />
            {text('Điểm danh', 'Check-in')}
          </h2>
        </header>
        <Link
          id="home-reward-detail"
          className={s.checkinMain}
          href={`${moduleRoute('profile', locale)}?section=earn`}
          aria-label={text('Xem hành trình', 'Your journey')}
        >
          {a && !loading && !failed ? (
            <>
              <div className={s.reward}>
                <strong>+{a.daily}</strong>
                <span>{unit}</span>
              </div>
              <span className={s.streak}>
                <FeatureIcon name="calendar" size={12} />
                {text(`${streak} ngày liên tiếp`, `${streak}-day streak`)}
              </span>
            </>
          ) : (
            <>
              <PointCoin size={32} />
              {!loading && (
                <span className={s.rewardHint}>
                  {failed ? text('Chưa tải được', 'Unable to load') : text('Nhận thưởng', 'Daily rewards')}
                </span>
              )}
            </>
          )}
        </Link>
        <button
          type="button"
          className={s.claimButton}
          aria-label={
            loading
              ? text('Đang tải trạng thái', 'Loading status')
              : rewards.busy
                ? text('Đang nhận thưởng', 'Claiming rewards')
                : today
                  ? text('Đã điểm danh hôm nay', 'Checked in today')
                  : failed
                    ? text('Tải lại trạng thái', 'Reload status')
                    : !loggedIn
                      ? text('Đăng nhập để điểm danh', 'Sign in to check in')
                      : loggedIn && !preview && !open
                        ? text('Điểm danh đang tạm đóng', 'Check-in is paused')
                        : text('Điểm danh ngay', 'Check in now')
          }
          disabled={loading || rewards.busy || today || (loggedIn && !preview && !failed && !open)}
          onClick={() => void checkin()}
        >
          <span>
            <FeatureIcon name="calendar" size={18} />
            {loading
              ? text('Đang tải…', 'Loading…')
              : rewards.busy
                ? text('Đang nhận…', 'Claiming…')
                : today
                  ? text('Đã nhận', 'Claimed')
                  : failed
                    ? text('Thử lại', 'Retry')
                    : !loggedIn
                      ? text('Đăng nhập', 'Sign in')
                      : loggedIn && !preview && !open
                        ? text('Tạm đóng', 'Paused')
                        : text('Điểm danh', 'Check in')}
          </span>
          <span aria-hidden="true">{today ? '✓' : '↗'}</span>
        </button>
        <span
          className={s.rewardBurst}
          key={rewards.reward === null ? 'idle' : `reward-${rewards.day}`}
          aria-hidden="true"
        >
          {rewards.reward !== null ? `+${rewards.reward} ${unit} ✦` : ''}
        </span>
      </article>
    </section>
  );
}
