'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { useAppState } from '@/lib/use-store';
import { cacheFingerprint } from '@/lib/state';

import { formatDob } from '@/lib/utils';
import { PROMPT_VERSION } from '@/lib/config';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { FeatureIcon, FEATURE_BY_ID } from '@/components/kit/FeatureIcon';
import { zodiacAsset } from '@/lib/earthly-branches';
import { useTarotHistoryCount } from '@/lib/use-tarot-history';
import { quickTools } from '@/lib/nav';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './Dashboard.module.css';

const excerpt = (text: string) => text.replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim();

export function Dashboard() {
  const t = useLocale();
  const router = useRouter();
  const state = useAppState();
  const { profile } = state;
  const [engine, setEngine] = useState<typeof import('@/lib/tuvi') | null>(null);
  useEffect(() => {
    let active = true;
    if (profile)
      void import('@/lib/tuvi').then(m => {
        if (active) setEngine(m);
      });
    return () => {
      active = false;
    };
  }, [profile]);
  const { loggedIn, ready, displayName } = useAuth();
  const { open } = useProfileModal();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);
  const cache = profile ? state.aiCache.profiles[cacheFingerprint()] : undefined;
  const today = now && engine ? cache?.tuviPeriod.today[engine.periodCacheKey('today')] : undefined;
  const usableToday =
    today &&
    (!today.promptVersion || today.promptVersion === PROMPT_VERSION) &&
    (!today.expiresAt || today.expiresAt > (now?.getTime() || 0))
      ? today
      : undefined;
  const recent = Object.entries(cache?.tuviTopics || {})
    .filter(
      ([, entry]) =>
        entry.text &&
        (!entry.promptVersion || entry.promptVersion === PROMPT_VERSION) &&
        (!entry.expiresAt || entry.expiresAt > (now?.getTime() || 0)),
    )
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 3);
  const chart = useMemo(() => {
    if (!engine || !profile?.dob || !profile.hourChi || !profile.gender) return null;
    try {
      return engine.buildZiweiChart(profile);
    } catch {
      return null;
    }
  }, [profile, engine]);
  const menh = chart && engine ? engine.menhPalace(chart) : null;
  const tarotCount = useTarotHistoryCount();
  // Tên gọi người dùng tự đặt ưu tiên trước tên từ kênh đăng nhập (Zalo).
  const name = loggedIn ? profile?.name || displayName : undefined;
  const greeting = now
    ? now.getHours() < 11
      ? t.t('dash.greetingMorning')
      : now.getHours() < 18
        ? t.t('dash.greetingAfternoon')
        : t.t('dash.greetingEvening')
    : t.t('dash.greetingGeneric');
  return (
    <div className={styles.page}>
      <header className={`${styles.header} ${!loggedIn ? styles.guestHeader : ''}`}>
        <div>
          <p>
            {now?.toLocaleDateString(t.locale === 'vi' ? 'vi-VN' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }) || t.t('dash.today')}
          </p>
          <h1>
            {greeting}
            {name ? (
              <>
                , <span>{name}.</span>
              </>
            ) : (
              '.'
            )}
          </h1>
        </div>
        {loggedIn ? (
          <button
            className={styles.avatar}
            aria-label={t.t('dash.openProfile')}
            onClick={() => router.push(moduleRoute('profile', t.locale))}
          >
            {name?.slice(0, 1).toUpperCase() || <FeatureIcon name="profile" size={26} />}
          </button>
        ) : (
          <div className={styles.guestLogin}>
            <span>{ready ? t.t('dash.notSignedIn') : t.t('dash.checkingLogin')}</span>
            <button onClick={openLoginDialog} disabled={!ready}>
              {t.t('auth.login')} <span aria-hidden="true">↗</span>
            </button>
          </div>
        )}
      </header>
      {!profile && (
        <button className={styles.profilePrompt} onClick={() => open()}>
          <span>
            {t.t('dash.completeProfile')} <small>{t.t('dash.completeProfileHint')}</small>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      )}
      {profile && (
        <div className={styles.dashboardGrid}>
          <section className={styles.today} aria-label={t.t('dash.yourToday')}>
            <div className={styles.todayCopy}>
              <span className={styles.eyebrow}>
                {t.formatDate(now ?? new Date())} · {t.t('dash.fortune')}
              </span>
              <h2>{name}</h2>
              {usableToday ? (
                <p className={styles.preview}>{excerpt(usableToday.text)}</p>
              ) : (
                <p>{t.t('dash.noReadingToday')}</p>
              )}
              <Link href={`${moduleRoute('tuvi', t.locale)}?view=period`}>
                {usableToday ? t.t('dash.readMore') : t.t('dash.createToday')} <span>↗</span>
              </Link>
            </div>
            <FeatureIcon name="tuvi" size={120} className={styles.sun} />
          </section>
          <section className={styles.identity} aria-label="Thông tin lá số cá nhân">
            <div className={styles.sectionHeading}>
              <h2>{t.t('dash.yourChart', { name: profile.name })}</h2>
              <Link href={moduleRoute('tuvi', t.locale)} aria-label={t.t('dash.openChart')}>
                ↗
              </Link>
            </div>
            <p className={styles.birth}>
              {formatDob(profile.dob)} · {profile.hourChi}
            </p>
            {chart ? (
              <dl className={styles.facts}>
                <div>
                  <dt>{t.t('dash.birthYear')}</dt>
                  <dd>
                    <img
                      src={zodiacAsset(chart.meta.zodiac)}
                      alt=""
                      aria-hidden="true"
                      width={48}
                      height={48}
                      className={styles.zodiacAnimal}
                    />
                    {chart.meta.zodiac}
                  </dd>
                </div>
                <div>
                  <dt>{t.t('dash.elementClass')}</dt>
                  <dd>{chart.meta.fiveElementsClass}</dd>
                </div>
                <div>
                  <dt>{t.t('dash.menhAt')}</dt>
                  <dd>{menh?.earthlyBranch || '—'}</dd>
                </div>
                <div>
                  <dt>{t.t('dash.majorStars')}</dt>
                  <dd>{menh?.majorStars.map(star => star.name).join(' · ') || t.t('dash.noMajorStar')}</dd>
                </div>
              </dl>
            ) : (
              <button onClick={() => open()}>{t.t('dash.addBirthInfo')}</button>
            )}
          </section>
          <Link href={`${moduleRoute('tarot', t.locale)}?history=1`} className={styles.tarotAction}>
            <FeatureIcon name="tarot" size={34} />
            <div>
              <h2>Tarot</h2>
              <p>{tarotCount ? t.t('dash.tarotJournal', { count: tarotCount }) : t.t('dash.tarotEmpty')}</p>
            </div>
            <span>{t.t('dash.viewJournal')} ↗</span>
          </Link>
        </div>
      )}
      <section aria-labelledby="dashboard-tools">
        <div className={styles.sectionHeading}>
          <h2 id="dashboard-tools">{t.t('dash.quickTools')}</h2>
        </div>
        <div className={styles.tools}>
          {quickTools(t.locale).map(tool => (
            <Link key={tool.href} href={tool.href}>
              <FeatureIcon name={FEATURE_BY_ID[tool.id] ?? 'home'} size={28} />
              {tool.label}
            </Link>
          ))}
        </div>
      </section>
      {recent.length > 0 && (
        <section aria-labelledby="dashboard-recent">
          <div className={styles.sectionHeading}>
            <h2 id="dashboard-recent">{t.t('dash.recent')}</h2>
            <span>{t.t('dash.savedReadings')}</span>
          </div>
          <div className={styles.recent}>
            {recent.map(([key, entry]) => {
              const [topicId, subId] = key.split('::');
              const topic = engine?.TUVI_TOPICS.find(t => t.id === topicId);
              return (
                <Link
                  key={key}
                  href={`${moduleRoute('tuvi', t.locale)}?view=topics&topic=${encodeURIComponent(topicId)}&sub=${encodeURIComponent(subId || '')}`}
                >
                  <div>
                    <h3>{topic?.subs.find(s => s.id === subId)?.label || topic?.title || t.t('dash.tuviReading')}</h3>
                    <p>{excerpt(entry.text)}</p>
                  </div>
                  <span aria-hidden="true">↗</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
