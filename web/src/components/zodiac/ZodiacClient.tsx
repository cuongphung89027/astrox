"use client";

/**
 * ZodiacClient — trang /cunghoangdao: hub 12 cung (SignGrid) + chi tiết cung
 * (SignDetailPanel) + horoscope theo kỳ (Horoscope) + chế độ "Bản đồ sao
 * chi tiết" (NatalChartSection). Gate module "zodiac" qua useAuth; mọi tính
 * toán cá nhân hoá đều chạy sau useRequireProfile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, GlassCard, ModuleLockBadge, SectionTitle } from "@/components/kit";
import styles from "./Zodiac.module.css";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { useAuth } from "@/lib/auth";
import { setState } from "@/lib/state";
import { useProfile } from "@/lib/use-store";
import { ZODIAC_SIGNS, buildNatalChart, getZodiacSign, type NatalChart } from "@/lib/zodiac";
import { Horoscope } from "./Horoscope";
import { NatalChartSection } from "./NatalChartSection";
import { SignDetailPanel } from "./SignDetailPanel";
import { SignGrid } from "./SignGrid";

export function ZodiacClient() {
  const profile = useProfile();
  const { isModuleAllowed } = useAuth();
  const allowed = isModuleAllowed("zodiac");
  const { open: openProfile } = useProfileModal();

  const mySign = getZodiacSign(profile?.dob);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"overview" | "forecast" | "natal">("overview");

  // Bản đồ sao tính 1 lần cho mỗi hồ sơ; lưu vào store cho các module khác + AI.
  const natalChart = useMemo(
    () => (profile?.dob ? buildNatalChart(profile) : null),
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
        <SectionTitle eyebrow="Cung Hoàng Đạo" title="Cung Hoàng Đạo" />
        <GlassCard variant="premium" className="mt-8">
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <ModuleLockBadge />
            <p className="max-w-md text-sm leading-relaxed text-muc-2">
              Module Cung Hoàng Đạo đang ở gói Premium. Nâng cấp để xem cung Mặt Trời, horoscope
              theo kỳ và bản đồ sao tính trực tiếp.
            </p>
            <Btn href="/trangchu" variant="gold" size="sm">
              Về trang chủ
            </Btn>
          </div>
        </GlassCard>
      </section>
    );
  }

  const selected = ZODIAC_SIGNS.find((s) => s.id === selectedId) ?? mySign ?? ZODIAC_SIGNS[0];

  return <section className={styles.page}>
    <h1 className="sr-only">Cung Hoàng Đạo</h1>
    {!profile ? <div className={styles.welcome}><FeatureIcon name="zodiac" size={50} /><span>BẦU TRỜI RIÊNG BẠN</span><h2>Bắt đầu từ ngày bạn sinh</h2><p>Thêm hồ sơ để xem cung Mặt Trời, bản đồ sao và dự báo của bạn.</p><button onClick={() => openProfile()}>Hoàn tất hồ sơ <span>↗</span></button></div> : <>
      <header className={styles.hero}><div className={styles.heroCopy}><span>{selected.id === mySign?.id ? "CUNG MẶT TRỜI CỦA BẠN" : "ĐANG KHÁM PHÁ"}</span><h2>{selected.name}</h2><p>{selected.en} · {profile.name}</p><button onClick={() => openProfile()}>Chỉnh hồ sơ ↗</button></div><div className={styles.orb} aria-hidden="true"><span>{selected.symbol.replace(/\uFE0F/g, "")}&#xfe0e;</span></div><div className={styles.facts}><div><span>Nguyên tố</span><strong>{selected.element}</strong></div><div><span>Chủ tinh</span><strong>{selected.ruler}</strong></div><div><span>Đặc tính</span><strong>{selected.quality}</strong></div></div></header>
      <details className={styles.explore}><summary>Khám phá 12 cung <span>＋</span></summary><SignGrid mySignId={mySign?.id ?? null} selectedId={selected.id} onSelect={setSelectedId} />{selected.id !== mySign?.id && <button className={styles.backToMine} onClick={() => setSelectedId(null)}>Về cung của tôi ↗</button>}</details>
      <div className={styles.tabs} role="tablist" aria-label="Cung Hoàng Đạo">{([ ["overview","Luận giải"],["forecast","Dự báo"],["natal","Bản đồ sao"] ] as const).map(([id,label])=><button key={id} id={`zodiac-${id}`} role="tab" aria-selected={mode===id} aria-controls={`zodiac-panel-${id}`} onClick={()=>setMode(id)}>{label}</button>)}</div>
      <div key={mode} className={styles.content} role="tabpanel" id={`zodiac-panel-${mode}`} aria-labelledby={`zodiac-${mode}`}>
        {mode === "overview" ? <SignDetailPanel sign={selected} profile={profile} natalChart={natalChart} /> : mode === "forecast" ? <div className={styles.forecast}><Horoscope sign={selected} profile={profile} natalChart={natalChart} /></div> : <NatalChartSection chart={natalChart} hasProfile={!!profile.dob} className={styles.natal} exactTime={!!profile.birthTime} />}
      </div>
    </>}
  </section>;
}
