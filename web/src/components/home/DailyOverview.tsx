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
  const target = a?.milestones.find(m => !a.claimed.includes(m.day) && m.day > streak)?.day ?? Math.max(7, streak);
  const weekday = date
    ? new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(
        new Date(date + 'T12:00:00+07:00'),
      )
    : text('Hôm nay', 'Today');
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
      <article className={s.calendar} aria-labelledby="home-calendar-title">
        <header className={s.cardTop}>
          <h2 id="home-calendar-title">
            <FeatureIcon name="calendar" size={17} />
            {text('Lịch âm hôm nay', 'Today’s lunar date')}
          </h2>
          <span className={s.timezone}>UTC+7</span>
        </header>
        <div className={s.calendarMain}>
          <div className={s.solar}>
            <span className={s.weekday}>{weekday}</span>
            <strong>{date ? Number(date.slice(-2)) : '—'}</strong>
            <span>
              {date
                ? `${text('Tháng', 'Month')} ${Number(date.slice(5, 7))} · ${date.slice(0, 4)}`
                : text('Đang mở ngày mới…', 'Opening a new day…')}
            </span>
          </div>
          <div className={s.lunar}>
            <div className={s.moonArt} aria-hidden="true">
              <svg viewBox="0 0 140 140" fill="none">
                <circle cx="70" cy="70" r="62" />
                <circle cx="70" cy="70" r="49" />
                <path d="M96 40a39 39 0 1 0 0 60 34 34 0 0 1 0-60Z" />
                <path d="m112 24 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />
              </svg>
            </div>
            <span>{text('Âm lịch', 'Lunar')}</span>
            <strong>{facts ? `${facts.lunar.day} / ${facts.lunar.month}` : '— / —'}</strong>
            <span>
              {facts
                ? `${facts.yearName}${facts.lunar.leap ? text(' · nhuận', ' · leap') : ''}`
                : text('Theo lịch Việt Nam', 'Vietnamese calendar')}
            </span>
          </div>
        </div>
        <div className={s.calendarMeta} aria-live="polite">
          {current?.error ? (
            <button type="button" onClick={() => setCalendarRetry(n => n + 1)}>
              {text('Chưa tải được lịch · Thử lại', 'Unable to load · Try again')}
            </button>
          ) : (
            <>
              <span>{facts?.term ?? text('Đang tính lịch…', 'Calculating dates…')}</span>
              <span>{facts?.holidays[0] || facts?.phase || text('Nhịp trăng hôm nay', 'Today’s moon')}</span>
            </>
          )}
        </div>
        <Link className={s.calendarLink} href={moduleRoute('lunar-calendar', locale)}>
          {text('Mở lịch đầy đủ', 'Open full calendar')}
          <span aria-hidden="true">↗</span>
        </Link>
      </article>
      <article className={s.checkin} data-claimed={today} aria-labelledby="home-checkin-title">
        <header className={s.cardTop}>
          <h2 id="home-checkin-title">
            <FeatureIcon name="wallet" size={17} />
            {text('Điểm danh mỗi ngày', 'Daily check-in')}
          </h2>
          <span className={s.badge}>
            {loading
              ? text('Đang tải…', 'Loading…')
              : preview
                ? text('Xem thử', 'Preview')
                : !loggedIn
                  ? text('Dành cho bạn', 'For you')
                  : failed
                    ? text('Chưa tải được', 'Unable to load')
                    : today
                      ? text('Đã nhận', 'Claimed')
                      : open
                        ? text('Sẵn sàng', 'Ready')
                        : text('Tạm đóng', 'Paused')}
          </span>
        </header>
        <div className={s.checkinMain}>
          <div className={s.rewardCopy}>
            <p>
              {today ? text('Một thói quen nhỏ.', 'A little daily habit.') : text('Ghé mỗi ngày.', 'Visit every day.')}
              <br />
              <em>
                {today
                  ? text('Thêm một ngày vui.', 'Another day of discovery.')
                  : text('Nhận điểm mới.', 'More to discover.')}
              </em>
            </p>
            <div className={s.reward}>
              <PointCoin size={23} />
              {a ? (
                <>
                  <strong>+{a.daily}</strong>
                  <span>
                    {unit} / {text('ngày', 'day')}
                  </span>
                </>
              ) : (
                <span>{text('Nhận thưởng mỗi ngày', 'Daily rewards')}</span>
              )}
            </div>
          </div>
          <div
            className={s.streak}
            aria-label={
              a ? text(`Chuỗi ${streak} ngày`, `${streak}-day streak`) : text('Điểm danh AstroX', 'AstroX check-in')
            }
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" />
              <circle
                cx="60"
                cy="60"
                r="52"
                pathLength="100"
                strokeDasharray={`${Math.min(100, (streak / target) * 100)} 100`}
              />
            </svg>
            <div>
              <strong>{loggedIn && a ? streak : '✦'}</strong>
              <span>{loggedIn && a ? text('ngày liên tiếp', 'day streak') : 'AstroX'}</span>
            </div>
          </div>
        </div>
        <div className={s.journey}>
          <span>
            {today
              ? text('Hẹn bạn ngày mai.', 'See you tomorrow.')
              : a
                ? text(`Mốc tiếp theo: ${target} ngày`, `Next milestone: day ${target}`)
                : text('Nhịp quen mỗi ngày.', 'Your daily ritual.')}
          </span>
          <Link href={`${moduleRoute('profile', locale)}?section=earn`}>
            {text('Xem hành trình', 'Your journey')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <button
          type="button"
          className={s.claimButton}
          disabled={loading || rewards.busy || today || (loggedIn && !preview && !failed && !open)}
          onClick={() => void checkin()}
        >
          <span>
            <FeatureIcon name="calendar" size={18} />
            {rewards.busy
              ? text('Đang nhận…', 'Claiming…')
              : today
                ? text('Đã điểm danh hôm nay', 'Checked in today')
                : failed
                  ? text('Tải lại trạng thái', 'Reload status')
                  : !loggedIn
                    ? text('Đăng nhập để điểm danh', 'Sign in to check in')
                    : text('Điểm danh ngay', 'Check in now')}
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
