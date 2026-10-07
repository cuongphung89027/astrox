'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { useAppState } from '@/lib/use-store';
import { hourChiLabel, TUVI_TOPICS_EN } from '@/i18n/astrology-en';
import { dashboardEntries } from '@/lib/dashboard-cache';
import { cacheFingerprint, localeCacheKey } from '@/lib/state';

import { formatDob } from '@/lib/utils';
import { PROMPT_VERSION } from '@/lib/config';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { FeatureIcon, FEATURE_BY_ID } from '@/components/kit/FeatureIcon';
import { zodiacAsset } from '@/lib/earthly-branches';
import { useTarotHistoryCount } from '@/lib/use-tarot-history';
import { quickTools } from '@/lib/nav';
import { moduleRoute } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import { dayFacts } from '@/lib/almanac';
import { almanacInsights, dashboardReadingPreview, nextReferenceHour } from '@/lib/dashboard-reading';
import { readingDay, readingTimeZone, referenceAlmanacDay } from '@/lib/reading-day';
import { readVisualReading } from '../../../../services/admin/visual-reading';
import { Term } from '@/components/kit/Term';
import { DailyOverview } from './DailyOverview';
import styles from './Dashboard.module.css';

const excerpt = dashboardReadingPreview;

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
    const timer = setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  const personalDay = now ? readingDay(now, t.locale) : '';
  const almanacDay = now ? referenceAlmanacDay(now) : '';
  const clockZone = readingTimeZone(t.locale);
  const localHour = now
    ? Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: clockZone }).format(now))
    : 12;
  const dateLabel = personalDay
    ? new Intl.DateTimeFormat(t.locale === 'vi' ? 'vi-VN' : 'en-US', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(personalDay + 'T12:00:00Z'))
    : '';
  const cache = profile ? state.aiCache.profiles[cacheFingerprint()] : undefined;
  const today = now && engine ? cache?.tuviPeriod.today[localeCacheKey(t.locale, personalDay)] : undefined;
  const todayVisual = today ? readVisualReading(today.text) : null;
  const usableToday =
    today &&
    (!todayVisual?.snapshot.period || todayVisual.snapshot.period.asOf === personalDay) &&
    (!today.promptVersion || today.promptVersion === PROMPT_VERSION) &&
    (!today.expiresAt || today.expiresAt > (now?.getTime() || 0))
      ? today
      : undefined;
  const recent = dashboardEntries(cache?.tuviTopics, t.locale)
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
      return engine.buildZiweiChart(profile, t.locale);
    } catch {
      return null;
    }
  }, [profile, engine, t.locale]);
  const menh = chart && engine ? engine.menhPalace(chart) : null;
  const tarotCount = useTarotHistoryCount();
  // Tên gọi người dùng tự đặt ưu tiên trước tên từ kênh đăng nhập (Zalo).
  const name = loggedIn ? profile?.name || displayName : undefined;
  const greeting = now
    ? localHour < 11
      ? t.t('dash.greetingMorning')
      : localHour < 18
        ? t.t('dash.greetingAfternoon')
        : t.t('dash.greetingEvening')
    : t.t('dash.greetingGeneric');
  const quickAccess = (
    <section className={styles.quickAccess} aria-labelledby="dashboard-tools">
      <div className={styles.sectionHeading}>
        <h2 id="dashboard-tools">{t.t('dash.quickTools')}</h2>
      </div>
      <div className={styles.tools}>
        {quickTools(t.locale).map(tool =>
          tool.disabled ? (
            <span key={tool.href} aria-disabled="true" className={styles.developmentTile}>
              <FeatureIcon name={FEATURE_BY_ID[tool.id] ?? 'home'} size={28} />
              {tool.label}
              <small>{tool.statusLabel}</small>
            </span>
          ) : (
            <Link key={tool.href} href={tool.href}>
              <FeatureIcon name={FEATURE_BY_ID[tool.id] ?? 'home'} size={28} />
              {tool.label}
            </Link>
          ),
        )}
      </div>
    </section>
  );
  const en = t.locale === 'en';
  const almanacFacts = useMemo(() => {
    if (!almanacDay) return null;
    try {
      return dayFacts(almanacDay, t.locale);
    } catch {
      return null;
    }
  }, [almanacDay, t.locale]);
  const insights = almanacFacts ? almanacInsights(almanacFacts, t.locale) : [];

  const nextGoodHour = almanacFacts && now ? nextReferenceHour(almanacFacts.hours, now) : null;

  return (
    <div className={styles.page}>
      <header className={`${styles.header} ${!loggedIn ? styles.guestHeader : ''}`}>
        <div>
          <p>
            {now?.toLocaleDateString(t.locale === 'vi' ? 'vi-VN' : 'en-US', {
              timeZone: clockZone,
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
      <div className={`${styles.summary} ${profile ? styles.withProfile : styles.withoutProfile}`}>
        <div className={styles.dailyCards}>
          <DailyOverview now={now} />
        </div>
        {!profile && (
          <button className={styles.profilePrompt} onClick={() => open()}>
            <span>
              {t.t('dash.completeProfile')} <small>{t.t('dash.completeProfileHint')}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        )}
        {profile && (
          <>
            <div className={styles.personalMain}>
              <section className={styles.today} aria-label={t.t('dash.yourToday')}>
                <div className={styles.todayCopy}>
                  <span className={styles.eyebrow}>
                    {dateLabel || t.t('dash.today')} ·{' '}
                    {usableToday ? t.t('dash.fortune') : en ? 'DAY GUIDE' : 'CHỈ DẪN NGÀY'}
                  </span>
                  <h2>{name}</h2>
                  {usableToday ? (
                    <>
                      {almanacFacts && (
                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={styles.cosmicBadge} data-good={almanacFacts.good}>
                            <Term termKey={almanacFacts.good ? 'hoang-dao' : 'hac-dao'}>
                              {almanacFacts.good ? (en ? 'Auspicious' : 'Hoàng đạo') : en ? 'Inauspicious' : 'Hắc đạo'}
                            </Term>
                            <span>·</span>
                            <Term termKey={almanacFacts.god}>{almanacFacts.god}</Term>
                          </span>
                        </div>
                      )}
                      {en && <small className={styles.referenceNote}>Vietnamese almanac · {almanacDay} · UTC+7</small>}
                      <p className={styles.preview}>{excerpt(usableToday.text)}</p>
                    </>
                  ) : (
                    <div className={styles.dailyCosmic}>
                      {almanacFacts && (
                        <>
                          <div className={styles.cosmicMeta}>
                            <span className={styles.cosmicBadge} data-good={almanacFacts.good}>
                              <Term termKey={almanacFacts.good ? 'hoang-dao' : 'hac-dao'}>
                                {almanacFacts.good
                                  ? en
                                    ? 'Auspicious'
                                    : 'Hoàng đạo'
                                  : en
                                    ? 'Inauspicious'
                                    : 'Hắc đạo'}
                              </Term>
                              <span>·</span>
                              <Term termKey={almanacFacts.god}>{almanacFacts.god}</Term>
                            </span>
                            <span style={{ fontSize: '12.5px', color: '#c9d4be' }}>
                              {almanacFacts.dayName} · {en ? 'Lunar' : 'Âm'} {almanacFacts.lunar.day}/
                              {almanacFacts.lunar.month}
                            </span>
                          </div>

                          <div className={styles.dayInsights}>
                            {insights.map(item => (
                              <div key={item.id} className={styles.dayInsight}>
                                <strong>{item.title}</strong>
                                <span>{item.body}</span>
                                <small>
                                  {en ? 'Basis: ' : 'Căn cứ: '}
                                  {item.basis}
                                </small>
                              </div>
                            ))}
                          </div>
                          <small className={styles.referenceNote}>
                            {en
                              ? `Vietnamese almanac · ${almanacDay} · UTC+7.`
                              : `Lịch dân gian Việt Nam · ${almanacDay.split('-').reverse().join('/')} · UTC+7`}
                          </small>

                          {nextGoodHour && (
                            <div className={styles.cosmicHours}>
                              <span>✦</span>
                              <span>
                                {en
                                  ? 'Current or next favorable window (UTC+7):'
                                  : 'Khung giờ thuận hiện tại hoặc tiếp theo (UTC+7):'}{' '}
                                <strong>{nextGoodHour.name}</strong> ({nextGoodHour.range})
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <Link href={`${moduleRoute('tuvi', t.locale)}?view=period`}>
                    {usableToday ? t.t('dash.readMore') : en ? 'Personal reading with AI' : 'Tạo vận trình cá nhân'}{' '}
                    <span>↗</span>
                  </Link>
                </div>
                <FeatureIcon name="tuvi" size={120} className={styles.sun} />
              </section>
              <section
                className={styles.identity}
                aria-label={t.locale === 'en' ? 'Personal birth chart details' : 'Thông tin lá số cá nhân'}
              >
                <div className={styles.sectionHeading}>
                  <h2>{t.t('dash.yourChart', { name: profile.name })}</h2>
                  <Link href={moduleRoute('tuvi', t.locale)} aria-label={t.t('dash.openChart')}>
                    ↗
                  </Link>
                </div>
                <p className={styles.birth}>
                  {formatDob(profile.dob)} · {hourChiLabel(profile.hourChi, t.locale)}
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
                      <dd>
                        <Term termKey={chart.meta.fiveElementsClass}>{chart.meta.fiveElementsClass}</Term>
                      </dd>
                    </div>
                    <div>
                      <dt>{t.t('dash.menhAt')}</dt>
                      <dd>
                        <Term termKey="cung-menh">{menh?.earthlyBranch || '—'}</Term>
                      </dd>
                    </div>
                    <div>
                      <dt>{t.t('dash.majorStars')}</dt>
                      <dd>
                        {menh?.majorStars && menh.majorStars.length > 0
                          ? menh.majorStars.map((star, idx) => (
                              <span key={star.name}>
                                {idx > 0 ? ' · ' : ''}
                                <Term termKey={star.name}>{star.name}</Term>
                              </span>
                            ))
                          : t.t('dash.noMajorStar')}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <button onClick={() => open()}>{t.t('dash.addBirthInfo')}</button>
                )}
              </section>
            </div>
            <Link href={`${moduleRoute('tarot', t.locale)}?history=1`} className={styles.tarotAction}>
              <FeatureIcon name="tarot" size={34} />
              <div>
                <h2>Tarot</h2>
                <p>{tarotCount ? t.t('dash.tarotJournal', { count: tarotCount }) : t.t('dash.tarotEmpty')}</p>
              </div>
              <span>{t.t('dash.viewJournal')} ↗</span>
            </Link>
          </>
        )}
        {!profile && quickAccess}
      </div>
      {profile && quickAccess}
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
                    <h3>
                      {t.locale === 'en'
                        ? TUVI_TOPICS_EN[topicId]?.subs[subId] ||
                          TUVI_TOPICS_EN[topicId]?.title ||
                          t.t('dash.tuviReading')
                        : topic?.subs.find(s => s.id === subId)?.label || topic?.title || t.t('dash.tuviReading')}
                    </h3>
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
