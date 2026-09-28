'use client';
import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { useProfile } from '@/lib/use-store';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { buildBatuChart, BATU_WX_LABEL, type WxKey } from '@/lib/batu';
import { BATU_WX_EN } from '@/i18n/astrology-en';
import { FourPillars } from './FourPillars';
import { WuxingBar } from './WuxingBar';
import { DayunTimeline } from './DayunTimeline';
import { BatuTopics } from './BatuTopics';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './Batu.module.css';
const ORDER = ['year', 'month', 'day', 'time'] as const;
const TABS = ['Mệnh bàn', 'Luận giải', 'Đại vận'];
export function BatuClient() {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const { isModuleAllowed } = useAuth();
  const profile = useProfile();
  const { open } = useProfileModal();
  const [tab, setTab] = useState(0);
  const [activeElement, setActiveElement] = useState<WxKey | null>(null);
  const calculated = useMemo(() => {
    if (!profile) return { chart: null, error: '' };
    try {
      return { chart: buildBatuChart(profile, t.locale), error: '' };
    } catch (e) {
      return {
        chart: null,
        error: en
          ? 'Unable to calculate your chart. Check your birth details and try again.'
          : e instanceof Error
            ? e.message
            : 'Không lập được mệnh bàn.',
      };
    }
  }, [profile, t.locale, en]);
  const { chart, error } = calculated;
  if (!isModuleAllowed('batu'))
    return (
      <section className={styles.page}>
        <div className={styles.welcome}>
          <FeatureIcon name="battu" size={40} />
          <h2>{copy('Mở Bát Tự của bạn', 'Explore your Ba Zi')}</h2>
          <button className={styles.primary} onClick={openLoginDialog}>
            {copy('Đăng nhập ↗', 'Sign in ↗')}
          </button>
        </div>
      </section>
    );
  return (
    <section className={styles.page}>
      <h1 className="sr-only">{copy('Bát Tự', 'Ba Zi')}</h1>
      {!chart ? (
        <div className={styles.welcome}>
          <div className={styles.emptyPillars} aria-hidden="true">
            {['年', '月', '日', '時'].map((s, i) => (
              <span key={s} style={{ animationDelay: `${i * 100}ms` }}>
                {s}
              </span>
            ))}
          </div>
          <span className={styles.eyebrow}>{copy('TỨ TRỤ MỆNH LÝ', 'FOUR PILLARS OF DESTINY')}</span>
          <h2>
            {copy('Tứ trụ.', 'Four pillars.')}
            <br />
            {copy('Một dấu ấn riêng.', 'Your unique imprint.')}
          </h2>
          <p>{copy('Mở mệnh bàn từ ngày giờ sinh của bạn.', 'Build your chart from your birth date and hour.')}</p>
          {error && <p role="alert">{error}</p>}
          <button className={styles.primary} onClick={() => open()}>
            {en ? (profile ? 'Edit profile' : 'Add your profile') : profile ? 'Chỉnh sửa hồ sơ' : 'Bổ sung hồ sơ'}
            <span>↗</span>
          </button>
        </div>
      ) : (
        <>
          <header className={styles.profile}>
            <div>
              <span>{copy('MỆNH BÀN CỦA', 'BIRTH CHART FOR')}</span>
              <h2>{profile?.name}</h2>
            </div>
            <button onClick={() => open()} aria-label={copy('Chỉnh sửa hồ sơ Bát Tự', 'Edit Ba Zi birth details')}>
              <FeatureIcon name="settings" size={20} />
            </button>
          </header>
          <div className={styles.tabs} role="tablist" aria-label={copy('Bát Tự', 'Ba Zi')}>
            {TABS.map((label, i) => (
              <button
                key={en ? ['Chart', 'Readings', 'Luck cycles'][i] : label}
                role="tab"
                id={`batu-tab-${i}`}
                aria-controls={`batu-panel-${i}`}
                aria-selected={tab === i}
                onClick={() => setTab(i)}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const next = (i + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
                    setTab(next);
                    document.getElementById(`batu-tab-${next}`)?.focus();
                  }
                }}
                tabIndex={tab === i ? 0 : -1}
              >
                {en ? ['Chart', 'Readings', 'Luck cycles'][i] : label}
              </button>
            ))}
          </div>
          <div
            hidden={tab !== 0}
            role="tabpanel"
            id="batu-panel-0"
            aria-labelledby="batu-tab-0"
            className={styles.panel}
          >
            <div className={styles.masthead}>
              <div>
                <span className={styles.eyebrow}>{copy('NHẬT CHỦ', 'DAY MASTER')}</span>
                <h2>
                  {chart.pillars.day.viGan}{' '}
                  {chart.pillars.day.wxKeyGan &&
                    (t.locale === 'en' ? BATU_WX_EN : BATU_WX_LABEL)[chart.pillars.day.wxKeyGan]}
                </h2>
                <p>
                  {profile?.dob.split('-').reverse().join('/')} · {profile?.hourChi.split(' (')[0]}
                </p>
              </div>
              <span className={styles.daySeal} lang="zh-Hant">
                {chart.pillars.day.hanGan}
              </span>
            </div>
            <FourPillars chart={chart} active={activeElement} onSelect={setActiveElement} />
            <div className={styles.insights}>
              <section className={styles.elementCard}>
                <header>
                  <h3>{copy('Ngũ hành', 'Five elements')}</h3>
                  <span>{copy('8 chữ trong mệnh bàn', 'The eight characters in your chart')}</span>
                </header>
                <WuxingBar wuxing={chart.wuxing} active={activeElement} onSelect={setActiveElement} />
              </section>
              <section className={styles.relationCard}>
                <span className={styles.eyebrow}>{copy('GIỮA CÁC TRỤ', 'BETWEEN THE PILLARS')}</span>
                <h3>{copy('Những mối liên hệ', 'Connections in your chart')}</h3>
                <ul>
                  {chart.relations.map((r, i) => (
                    <li key={i}>
                      <span aria-hidden="true">↗</span>
                      {r.text}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <details className={styles.details}>
              <summary>{copy('Chi tiết mệnh bàn', 'Chart details')}</summary>
              <p>{chart.lunarText}</p>
              <div className={styles.tenGods}>
                {ORDER.map(key => (
                  <div key={key}>
                    <h4>{chart.pillars[key].label}</h4>
                    <p>{chart.pillars[key].shishenGan}</p>
                    <small>{chart.pillars[key].shishenZhi.join(' · ')}</small>
                  </div>
                ))}
              </div>
            </details>
          </div>
          <div
            hidden={tab !== 1}
            role="tabpanel"
            id="batu-panel-1"
            aria-labelledby="batu-tab-1"
            className={styles.panel}
          >
            <BatuTopics chart={chart} />
          </div>
          <div
            hidden={tab !== 2}
            role="tabpanel"
            id="batu-panel-2"
            aria-labelledby="batu-tab-2"
            className={styles.panel}
          >
            <header className={styles.periodHeading}>
              <span className={styles.eyebrow}>{en ? 'TEN-YEAR RHYTHMS' : 'NHỊP MƯỜI NĂM'}</span>
              <h2>{copy('Đi qua những đại vận', 'Explore your luck cycles')}</h2>
            </header>
            <DayunTimeline dayun={chart.dayun} />
          </div>
        </>
      )}
    </section>
  );
}
