'use client';

/**
 * TuViClient — module Tử Vi, 3 khối cuộn: (1) Lập lá số 12 cung bằng iztro,
 * (2) Chủ đề luận giải AI, (3) Vận trình theo kỳ. Gate: isModuleAllowed("tuvi")
 * + hồ sơ (useRequireProfile). Lá số chuẩn hoá lưu vào state.ziweiChart để
 * prompt AI + cache fingerprint dùng chung (đúng ràng buộc store cũ).
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { Btn } from '@/components/kit';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { useAuth } from '@/lib/auth';
import { setState } from '@/lib/state';
import { useProfile } from '@/lib/use-store';
import { buildZiweiChart, type ZiweiChart } from '@/lib/tuvi';
import { useLocale } from '@/i18n/LocaleProvider';
import { formatDob } from '@/lib/utils';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { ChartBoard } from './ChartBoard';
import { LockPanel } from './LockPanel';
import { PeriodPanel } from './PeriodPanel';
import { TopicsPanel } from './TopicsPanel';
import { hourChiLabel } from '@/i18n/astrology-en';
import styles from './TuVi.module.css';

function NoProfileCta({ onOpen }: { onOpen: () => void }) {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  return (
    <div className={styles.empty}>
      <FeatureIcon name="tuvi" size={52} className="text-ngoc-deep" />
      <p className="font-display text-xl font-extrabold text-muc">
        {en ? 'Your chart starts with you' : 'Lá số bắt đầu từ bạn'}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-muc-2">
        {en
          ? 'Your profile is missing birth details. Add them once and AstroX will build your chart and reuse it.'
          : 'Hồ sơ của bạn chưa đủ thông tin sinh. Bổ sung một lần để AstroX tự lập lá số và sử dụng cho những lần sau.'}
      </p>
      <Btn onClick={onOpen}>{en ? 'Complete your profile' : copy('Hoàn tất hồ sơ', 'Complete profile')}</Btn>
    </div>
  );
}

function StepHint({ period = false, onOpen }: { period?: boolean; onOpen: () => void }) {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  return (
    <section className={styles.welcomePanel}>
      <div className={styles.welcomeMark} aria-hidden="true">
        <FeatureIcon name="tuvi" size={42} />
      </div>
      <span className={styles.welcomeEyebrow}>
        {period ? copy('VẬN TRÌNH CỦA BẠN', 'YOUR FORECAST') : copy('LUẬN GIẢI RIÊNG BẠN', 'YOUR PERSONAL READING')}
      </span>
      <h2>
        {period
          ? copy('Đón nhịp ngày mới', 'Meet the day ahead')
          : copy('Hiểu mình, từng khía cạnh', 'Understand every side of yourself')}
      </h2>
      <p>{en ? 'Add your birth date and hour to begin.' : 'Bổ sung ngày và giờ sinh để bắt đầu.'}</p>
      <div className={styles.welcomePreview} aria-label={copy('Nội dung khám phá', 'Explore readings')}>
        {(period
          ? [
              ['01', copy('Hôm nay', 'Today')],
              ['02', copy('Tuần này', 'This week')],
              ['03', copy('Tháng này', 'This month')],
            ]
          : [
              ['01', copy('Bản thân', 'Self')],
              ['02', copy('Sự nghiệp', 'Career')],
              ['03', copy('Tình duyên', 'Relationships')],
            ]
        ).map(([n, label]) => (
          <div key={n}>
            <span>{n}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <button onClick={onOpen}>
        {copy('Hoàn tất hồ sơ', 'Complete profile')} <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}

export function TuViClient() {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const [tab, setTab] = useState<'chart' | 'topics' | 'period'>('chart');
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    // Read the client URL after hydration; the exported HTML has no query state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'topics' || view === 'period') setTab(view);
  }, []);
  const wideRef = useRef<HTMLDialogElement>(null);
  const { isModuleAllowed } = useAuth();
  const allowed = isModuleAllowed('tuvi');
  const profile = useProfile();
  const { open: openProfile } = useProfileModal();

  // The saved account profile is the sole source of birth information.
  const { chart, chartError } = useMemo<{ chart: ZiweiChart | null; chartError: string }>(() => {
    if (!profile?.gender || !/^\d{4}-\d{2}-\d{2}$/.test(profile.dob) || !profile.hourChi)
      return { chart: null, chartError: '' };
    try {
      return { chart: buildZiweiChart(profile, t.locale), chartError: '' };
    } catch (e) {
      return { chart: null, chartError: e instanceof Error ? e.message : 'Không lập được lá số.' };
    }
  }, [profile, t.locale]);

  // Lưu lá số vào store — nguồn dữ liệu duy nhất cho prompt + fingerprint cache.
  useEffect(() => {
    setState({ ziweiChart: chart });
  }, [chart]);

  if (!allowed) return <LockPanel />;

  const hasProfile = !!profile;
  const chartBlock =
    chart && profile ? (
      <ChartBoard chart={chart} profile={profile} />
    ) : chartError ? (
      <div role="alert">
        <p className="text-sm text-son-deep">
          {copy('Không thể lập lá số', 'Unable to build chart')}: {en ? 'Please check your birth details.' : chartError}
        </p>
        <button className={styles.outlineButton} onClick={() => openProfile()}>
          {copy('Kiểm tra hồ sơ', 'Review profile')}
        </button>
      </div>
    ) : (
      <NoProfileCta onOpen={() => openProfile()} />
    );

  return (
    <section className={styles.page}>
      <h1 className="sr-only">{copy('Tử Vi', 'Zi Wei')}</h1>
      <div className={styles.workspace}>
        {profile && (
          <div className={styles.profileSummary}>
            <div>
              <p className={styles.eyebrow}>{en ? 'YOUR PROFILE' : 'HỒ SƠ CỦA BẠN'}</p>
              <p className={styles.profileName}>{profile.name || copy('Thông tin đã lưu', 'Saved birth details')}</p>
            </div>
            <p className={styles.profileDetails}>
              {[
                en ? (profile.gender === 'Nam' ? 'Male' : 'Female') : profile.gender,
                profile.dob && formatDob(profile.dob),
                profile.hourChi && `${en ? 'Hour' : 'Giờ'} ${hourChiLabel(profile.hourChi, t.locale)}`,
                profile.place,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <button className={styles.outlineButton} onClick={() => openProfile()}>
              {copy('Sửa hồ sơ', 'Edit profile')}
            </button>
          </div>
        )}
        <div className={styles.tabs} role="tablist" aria-label={copy('Khám phá lá số', 'Explore your chart')}>
          {(
            [
              ['chart', copy('Lá số', 'Chart')],
              ['topics', en ? 'Readings' : copy('Luận giải', 'Readings')],
              ['period', en ? 'Fortune' : 'Vận trình'],
            ] as const
          ).map(([id, label], index, items) => (
            <button
              key={id}
              id={`${id}-tab`}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`${id}-panel`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={e => {
                if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
                e.preventDefault();
                const next =
                  e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
                setTab(items[next][0]);
                document.getElementById(`${items[next][0]}-tab`)?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          id="chart-panel"
          role="tabpanel"
          aria-labelledby="chart-tab"
          hidden={tab !== 'chart'}
          className={styles.chartArea}
        >
          <div className={styles.chartHeader}>
            <div>
              <p className={styles.eyebrow}>{copy('BẢN ĐỒ CỦA BẠN', 'YOUR CHART')}</p>
              <h2 id="tuvi-khoi-laso">
                {chart ? copy('Lá số của bạn', 'Your chart') : copy('Lá số Tử Vi', 'Zi Wei chart')}
              </h2>
            </div>
            {chart && (
              <button className={styles.outlineButton} onClick={() => wideRef.current?.showModal()}>
                {copy('Xem rộng ↗', 'Expand chart ↗')}
              </button>
            )}
          </div>
          {chartBlock}
          {!chart && (
            <div className={styles.emptyFoot}>
              <span>{copy('Ngày sinh', 'Birth date')}</span>
              <i /> <span>{copy('Giờ sinh', 'Birth hour')}</span>
              <i />
              <span>{copy('Lá số riêng bạn', 'Your personal chart')}</span>
            </div>
          )}
        </div>
        <div id="topics-panel" role="tabpanel" aria-labelledby="topics-tab" hidden={tab !== 'topics'}>
          {hasProfile && chart ? (
            <TopicsPanel profile={profile} chart={chart} />
          ) : (
            <StepHint onOpen={() => openProfile()} />
          )}
        </div>
        <div id="period-panel" role="tabpanel" aria-labelledby="period-tab" hidden={tab !== 'period'}>
          {hasProfile && chart ? (
            <PeriodPanel profile={profile} chart={chart} />
          ) : (
            <StepHint period onOpen={() => openProfile()} />
          )}
        </div>
      </div>
      <dialog
        ref={wideRef}
        className={styles.wideDialog}
        aria-label={copy('Lá số Tử Vi mở rộng', 'Expanded Zi Wei chart')}
        onClick={e => {
          if (e.target === e.currentTarget) wideRef.current?.close();
        }}
      >
        <div className={styles.wideContent}>
          <div className={styles.chartHeader}>
            <h2>{copy('Lá số Tử Vi', 'Zi Wei chart')}</h2>
            <button autoFocus className={styles.outlineButton} onClick={() => wideRef.current?.close()}>
              {copy('Đóng ×', 'Close ×')}
            </button>
          </div>
          {chart && profile && <ChartBoard chart={chart} profile={profile} />}
        </div>
      </dialog>
    </section>
  );
}
