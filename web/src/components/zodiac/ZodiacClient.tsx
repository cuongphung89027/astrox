"use client";

/**
 * ZodiacClient — trang /hoangdao: hub 12 cung (SignGrid) + chi tiết cung
 * (SignDetailPanel) + horoscope theo kỳ (Horoscope) + chế độ "Bản đồ sao
 * chi tiết" (NatalChartSection). Gate module "zodiac" qua useAuth; mọi tính
 * toán cá nhân hoá đều chạy sau useRequireProfile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, GlassCard, ModuleLockBadge, SectionTitle } from "@/components/kit";
import { TextsReveal } from "@/components/motion";
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
  const [mode, setMode] = useState<"hub" | "natal">("hub");

  // Bản đồ sao tính 1 lần cho mỗi hồ sơ; lưu vào store cho các module khác + AI.
  const natalChart = useMemo(
    () => (profile?.dob ? buildNatalChart(profile) : null),
    [profile?.dob, profile?.hourChi, profile?.place], // eslint-disable-line react-hooks/exhaustive-deps
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

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      {mode === "natal" ? (
        <div>
          <Btn variant="ghost" size="sm" onClick={() => setMode("hub")} ariaLabel="Quay lại Cung Hoàng Đạo">
            ← Quay lại Cung Hoàng Đạo
          </Btn>
          <SectionTitle
            eyebrow="Bản đồ sao chi tiết"
            title="Hành tinh · 12 nhà · góc chiếu"
            sub="Dữ liệu thiên văn được tính trực tiếp bằng astronomy-engine; phần diễn giải bằng AI chỉ dùng dữ liệu này làm nguồn duy nhất."
            className="mt-4"
          />
          <NatalChartSection chart={natalChart} hasProfile={!!profile?.dob} className="mt-8" />
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Cung Hoàng Đạo"
              title="Cung Hoàng Đạo"
              sub="Tính cung Mặt Trời theo ngày sinh, xem đặc tính và horoscope hôm nay, tuần này hoặc tháng này."
            />
            <div className="flex flex-wrap items-center gap-2">
              {profile?.dob ? null : (
                <Btn variant="ghost" size="sm" onClick={() => openProfile()}>
                  Nhập hồ sơ
                </Btn>
              )}
              <Btn variant="gold" size="sm" arrow onClick={() => setMode("natal")}>
                Bản đồ sao chi tiết
              </Btn>
            </div>
          </div>

          <TextsReveal className="mt-9" stagger={60}>
            <div className="ax-stagger-line">
              <SignGrid mySignId={mySign?.id ?? null} selectedId={selected.id} onSelect={setSelectedId} />
            </div>
            <SignDetailPanel sign={selected} profile={profile} natalChart={natalChart} className="ax-stagger-line mt-6" />
            <GlassCard className="ax-stagger-line mt-6">
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl font-extrabold tracking-tight text-muc">
                    Horoscope · {selected.name}
                  </h3>
                  <p className="text-xs font-semibold text-muc-2">
                    Dự báo theo quá cảnh thật — không phải nội dung cố định cho mọi năm.
                  </p>
                </div>
                <Horoscope
                  sign={selected}
                  profile={profile}
                  natalChart={natalChart}
                  className="mt-5"
                />
              </div>
            </GlassCard>
            <p className="ax-stagger-line mt-6 text-center text-xs leading-relaxed text-muc-2">
              Ngày phân chia 12 cung theo hệ chiêm tinh nhiệt đới (tropical) phổ biến nhất hiện nay.
              Nội dung tham khảo văn hoá, không phải lời khuyên tuyệt đối.
            </p>
          </TextsReveal>
        </div>
      )}
    </section>
  );
}

