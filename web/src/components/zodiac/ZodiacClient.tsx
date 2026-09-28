'use client';

/**
 * ZodiacClient — trang /cunghoangdao: hub 12 cung (SignGrid) + chi tiết cung
 * (SignDetailPanel) + horoscope theo kỳ (Horoscope) + chế độ "Bản đồ sao
 * chi tiết" (NatalChartSection). Gate module "zodiac" qua useAuth; mọi tính
 * toán cá nhân hoá đều chạy sau useRequireProfile.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Btn, GlassCard, ModuleLockBadge, SectionTitle } from '@/components/kit';
import { useLocale } from '@/i18n/LocaleProvider';
import { ZODIAC_ELEMENT_EN, ZODIAC_QUALITY_EN } from '@/i18n/astrology-en';
import styles from './Zodiac.module.css';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { useProfileModal } from '@/components/profile/ProfileModal';
import { useAuth } from '@/lib/auth';
import { setState } from '@/lib/state';
import { useProfile } from '@/lib/use-store';
import { ZODIAC_SIGNS, buildNatalChart, getZodiacSign, type NatalChart } from '@/lib/zodiac';
import { Horoscope } from './Horoscope';
import { NatalChartSection } from './NatalChartSection';
import { SignDetailPanel } from './SignDetailPanel';
import { SignGrid } from './SignGrid';

export function ZodiacClient() {
  const t = useLocale();
  const en = t.locale === 'en';
  const copy = (vi: string, us: string) => (en ? us : vi);
  const profile = useProfile();
  const { isModuleAllowed } = useAuth();
  const allowed = isModuleAllowed('zodiac');
  const { open: openProfile } = useProfileModal();

  const mySign = getZodiacSign(profile?.dob);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'overview' | 'forecast' | 'natal'>('overview');

  // Bản đồ sao tính 1 lần cho mỗi hồ sơ; lưu vào store cho các module khác + AI.
  const natalChart = useMemo(
    () => (profile?.dob ? buildNatalChart(profile, t.locale) : null),
    [profile?.dob, profile?.hourChi, profile?.place, profile?.birthTime], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const savedChartRef = useRef<NatalChart | null>(null);
  useEffect(() => {
    if (natalChart && natalChart !== savedChartRef.current) {
      savedChartRef.current = natalChart;
      setState({ natalChart });
    }
  }, [natalChart]);

  if (!allowed) {
    return (
      <section className="mx-auto w-full max-w-5xl px-5 py-14">
        <SectionTitle eyebrow={en ? 'Astrology' : 'Cung Hoàng Đạo'} title={en ? 'Astrology' : 'Cung Hoàng Đạo'} />
        <GlassCard variant="premium" className="mt-8">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <ModuleLockBadge />
            <p className="max-w-md text-sm leading-relaxed text-muc-2">
              {copy(
                'Module Cung Hoàng Đạo đang ở gói Premium. Nâng cấp để xem cung Mặt Trời, horoscope theo kỳ và bản đồ sao tính trực tiếp.',
                'Astrology is a premium feature. Upgrade to explore your Sun sign, forecasts and calculated birth chart.',
              )}
            </p>
            <Btn href={en ? '/en' : '/trangchu'} variant="gold" size="sm">
              {copy('Về trang chủ', 'Back to home')}
            </Btn>
          </div>
        </GlassCard>
      </section>
    );
  }

  const selected = ZODIAC_SIGNS.find(s => s.id === selectedId) ?? mySign ?? ZODIAC_SIGNS[0];

  return (
    <section className={styles.page}>
      <h1 className="sr-only">{en ? 'Astrology' : 'Cung Hoàng Đạo'}</h1>
      {!profile ? (
        <div className={styles.welcome}>
          <FeatureIcon name="zodiac" size={50} />
          <span>{copy('BẦU TRỜI RIÊNG BẠN', 'YOUR PERSONAL SKY')}</span>
          <h2>{copy('Bắt đầu từ ngày bạn sinh', 'Begin with your birth date')}</h2>
          <p>
            {copy(
              'Thêm hồ sơ để xem cung Mặt Trời, bản đồ sao và dự báo của bạn.',
              'Add your birth details to see your Sun sign, birth chart and forecasts.',
            )}
          </p>
          <button onClick={() => openProfile()}>
            {copy('Hoàn tất hồ sơ', 'Complete profile')} <span>↗</span>
          </button>
        </div>
      ) : (
        <>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <span>
                {selected.id === mySign?.id
                  ? copy('CUNG MẶT TRỜI CỦA BẠN', 'YOUR SUN SIGN')
                  : copy('ĐANG KHÁM PHÁ', 'EXPLORING')}
              </span>
              <h2>{en ? selected.en : selected.name}</h2>
              <p>
                {selected.en} · {profile.name}
              </p>
              <button onClick={() => openProfile()}>{copy('Chỉnh hồ sơ ↗', 'Edit profile ↗')}</button>
            </div>
            <div className={styles.orb} aria-hidden="true">
              <span>{selected.symbol.replace(/\uFE0F/g, '')}&#xfe0e;</span>
            </div>
            <div className={styles.facts}>
              <div>
                <span>{copy('Nguyên tố', 'Element')}</span>
                <strong>{en ? ZODIAC_ELEMENT_EN[selected.element] : selected.element}</strong>
              </div>
              <div>
                <span>{copy('Chủ tinh', 'Ruling planet')}</span>
                <strong>
                  {en ? selected.ruler.replace(/[^(]+\(([^)]+)\)/g, '$1').replace(' và ', ' & ') : selected.ruler}
                </strong>
              </div>
              <div>
                <span>{copy('Đặc tính', 'Quality')}</span>
                <strong>{en ? ZODIAC_QUALITY_EN[selected.quality] : selected.quality}</strong>
              </div>
            </div>
          </header>
          <details className={styles.explore}>
            <summary>
              {copy('Khám phá 12 cung', 'Explore all 12 signs')} <span>＋</span>
            </summary>
            <SignGrid mySignId={mySign?.id ?? null} selectedId={selected.id} onSelect={setSelectedId} />
            {selected.id !== mySign?.id && (
              <button className={styles.backToMine} onClick={() => setSelectedId(null)}>
                {copy('Về cung của tôi ↗', 'Back to my sign ↗')}
              </button>
            )}
          </details>
          <div className={styles.tabs} role="tablist" aria-label={en ? 'Astrology' : 'Cung Hoàng Đạo'}>
            {(
              [
                ['overview', copy('Luận giải', 'Readings')],
                ['forecast', copy('Dự báo', 'Forecast')],
                ['natal', copy('Bản đồ sao', 'Birth chart')],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                id={`zodiac-${id}`}
                role="tab"
                aria-selected={mode === id}
                aria-controls={`zodiac-panel-${id}`}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            key={mode}
            className={styles.content}
            role="tabpanel"
            id={`zodiac-panel-${mode}`}
            aria-labelledby={`zodiac-${mode}`}
          >
            {mode === 'overview' ? (
              <SignDetailPanel sign={selected} profile={profile} natalChart={natalChart} />
            ) : mode === 'forecast' ? (
              <div className={styles.forecast}>
                <Horoscope sign={selected} profile={profile} natalChart={natalChart} />
              </div>
            ) : (
              <NatalChartSection
                chart={natalChart}
                hasProfile={!!profile.dob}
                className={styles.natal}
                exactTime={!!profile.birthTime}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
