"use client";

/**
 * BatuClient — điều phối trang /battu (Tứ Trụ Mệnh Lý).
 * Gate: useAuth().isModuleAllowed("batu") — false → panel khoá.
 * Có profile: nút "Dùng hồ sơ đã lưu" + form (dob, hourChi từ
 * HOUR_CHI_OPTIONS, gender). Tính bằng lunar-typescript qua buildBatuChart
 * (port buildEightChar của app cũ): 4 trụ, Ngũ Hành, Thập Thần, quan hệ Địa
 * Chi, Đại Vận. Chủ đề AI ở BatuTopics (cache "batuTopics").
 */
import { useCallback, useEffect, useState } from "react";
import { Btn, Chip, GlassCard, ModuleLockBadge, SectionTitle } from "@/components/kit";
import { PanelReveal, TextsReveal, useToast } from "@/components/motion";
import { useAuth } from "@/lib/auth";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { buildBatuChart } from "@/lib/batu";
import type { BatuChart } from "@/lib/batu";
import { useProfile } from "@/lib/use-store";
import { HOUR_CHI_OPTIONS } from "@/lib/utils";
import { DayunTimeline } from "./DayunTimeline";
import { PillarCard } from "./PillarCard";
import { WuxingBar } from "./WuxingBar";
import { BatuTopics } from "./BatuTopics";

const REL_TONE: Record<string, "ngoc" | "son" | "kim" | "sen" | "neutral"> = {
  hop: "ngoc",
  xung: "son",
  hai: "kim",
  hinh: "sen",
  none: "neutral",
};

const INPUT_CLASS =
  "w-full rounded-xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[15px] text-muc shadow-inner outline-none transition-colors placeholder:text-muc/40 focus:border-son";

export function BatuClient() {
  const { isModuleAllowed, zaloLogin } = useAuth();
  const profile = useProfile();
  const { open: openProfileModal } = useProfileModal();
  const { show } = useToast();

  const [gender, setGender] = useState<"Nam" | "Nữ" | "">("");
  const [dob, setDob] = useState("");
  const [hourChi, setHourChi] = useState("");
  const [chart, setChart] = useState<BatuChart | null>(null);
  const [chartError, setChartError] = useState("");

  const compute = useCallback(
    (g: string, d: string, h: string, place?: string) => {
      setChartError("");
      try {
        setChart(buildBatuChart({ gender: g, dob: d, hourChi: h, place }));
      } catch (e) {
        setChart(null);
        setChartError(e instanceof Error ? e.message : "Không lập được lá số.");
      }
    },
    [],
  );

  const useSavedProfile = useCallback(() => {
    if (!profile) {
      openProfileModal();
      return;
    }
    setGender(profile.gender === "Nam" ? "Nam" : "Nữ");
    setDob(profile.dob);
    setHourChi(profile.hourChi);
    compute(profile.gender, profile.dob, profile.hourChi, profile.place);
    show("Đã dùng hồ sơ đã lưu.", "success");
  }, [compute, openProfileModal, profile, show]);

  // Có hồ sơ → tự lập lá số ngay khi vào trang (như refreshBatuMini cũ).
  // Defer qua timeout: không setState đồng bộ trong effect body (react-hooks).
  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(() => {
      setGender(profile.gender === "Nam" ? "Nam" : "Nữ");
      setDob(profile.dob);
      setHourChi(profile.hourChi);
      compute(profile.gender, profile.dob, profile.hourChi, profile.place);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, profile?.dob, profile?.hourChi, profile?.place]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!gender || !dob || !hourChi) {
        show("Nhập đủ giới tính, ngày sinh và giờ sinh.", "error");
        return;
      }
      compute(gender, dob, hourChi, profile?.place);
    },
    [compute, dob, gender, hourChi, profile?.place, show],
  );

  const todayIso = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  /* ---------------- Gate: module bị khoá ---------------- */
  if (!isModuleAllowed("batu")) {
    return (
      <section className="mx-auto w-full max-w-3xl px-5 py-14">
        <SectionTitle
          eyebrow="Bát Tự"
          title="Bát Tự — Tứ Trụ Mệnh Lý"
          sub="Lá số 4 trụ Năm–Tháng–Ngày–Giờ tính trực tiếp từ ngày giờ sinh dương lịch, cùng Đại Vận và tỷ lệ Ngũ Hành."
        />
        <GlassCard variant="premium" className="mt-8 flex flex-col items-center gap-4 p-8 text-center">
          <ModuleLockBadge />
          <p className="max-w-md text-sm leading-relaxed text-muc-2">
            Tính năng Bát Tự đang dành cho tài khoản được bật. Đăng nhập Zalo để kiểm tra quyền truy cập hoặc nạp điểm để mở khoá.
          </p>
          <Btn variant="gold" size="md" onClick={zaloLogin}>
            Đăng nhập bằng Zalo
          </Btn>
        </GlassCard>
      </section>
    );
  }

  const order = chart ? (["year", "month", "day", "time"] as const) : [];

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-10 md:py-14">
      <SectionTitle
        eyebrow="Bát Tự"
        title="Bát Tự — Tứ Trụ Mệnh Lý"
        sub="Lá số 4 trụ Năm–Tháng–Ngày–Giờ tính trực tiếp từ ngày giờ sinh dương lịch, cùng Đại Vận và tỷ lệ Ngũ Hành."
      />

      {/* Form nhập ngày giờ sinh */}
      <GlassCard className="mt-8 p-6 sm:p-7">
        <form onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-muc">Ngày giờ sinh (dương lịch)</h2>
            {profile ? (
              <Btn variant="ghost" size="sm" onClick={useSavedProfile}>
                Dùng hồ sơ đã lưu
              </Btn>
            ) : (
              <Btn variant="ghost" size="sm" onClick={() => openProfileModal()}>
                Thiết lập hồ sơ
              </Btn>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="batu-dob" className="mb-1.5 block text-xs font-semibold text-muc-2">
                Ngày sinh dương lịch
              </label>
              <input
                id="batu-dob"
                type="date"
                min="1920-01-01"
                max={todayIso()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="batu-hour" className="mb-1.5 block text-xs font-semibold text-muc-2">
                Giờ sinh (can giờ)
              </label>
              <select id="batu-hour" value={hourChi} onChange={(e) => setHourChi(e.target.value)} className={INPUT_CLASS}>
                <option value="">— Chọn can giờ —</option>
                {HOUR_CHI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p id="batu-gender-label" className="mb-1.5 text-xs font-semibold text-muc-2">
              Giới tính (quyết định thuận/nghịch của Đại Vận)
            </p>
            <div role="radiogroup" aria-labelledby="batu-gender-label" className="flex gap-2">
              {(["Nam", "Nữ"] as const).map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setGender(g)}
                    className={`rounded-full border px-5 py-2 text-sm font-bold transition-all ${
                      active
                        ? "border-son bg-son text-white shadow-[var(--shadow-pop)]"
                        : "border-white/80 bg-white/55 text-muc hover:bg-white/85"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <Btn variant="primary" size="lg" type="submit" className="mt-5 w-full sm:w-auto">
            Lập lá số
          </Btn>
        </form>
      </GlassCard>

      {chartError ? (
        <p role="alert" className="mt-4 rounded-2xl border border-son/25 bg-son-tint px-4 py-3 text-sm font-semibold text-son-deep">
          {chartError}
        </p>
      ) : null}

      {/* Lá số */}
      {chart ? (
        <PanelReveal open className="mt-8">
          {/* 4 trụ — mobile xếp 2×2 */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-muc">Tứ Trụ</h2>
            <Chip tone="ngoc">{chart.lunarText}</Chip>
          </div>
          <TextsReveal className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" stagger={90}>
            {order.map((key) => (
              <PillarCard key={key} pillar={chart.pillars[key]} />
            ))}
          </TextsReveal>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <GlassCard className="p-6">
              <h3 className="font-display text-lg font-extrabold text-muc">Tỷ lệ Ngũ Hành (đếm Thiên Can + Địa Chi)</h3>
              <div className="mt-4">
                <WuxingBar wuxing={chart.wuxing} />
              </div>
            </GlassCard>
            <GlassCard className="p-6">
              <h3 className="font-display text-lg font-extrabold text-muc">Xung — Hợp — Hình — Hại giữa các trụ</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {chart.relations.map((r, i) => (
                  <li key={i}>
                    <Chip tone={REL_TONE[r.type]} className="normal-case tracking-normal">
                      {r.text}
                    </Chip>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-muc-2">
                Quan hệ giữa 4 Địa Chi (Năm, Tháng, Ngày, Giờ) theo các bộ Lục Hợp / Lục Xung / Tam Hợp / Lục Hại / Tương Hình cổ điển.
              </p>
            </GlassCard>
          </div>

          <GlassCard className="mt-5 p-6">
            <h3 className="font-display text-lg font-extrabold text-muc">Đại Vận</h3>
            <div className="mt-4">
              <DayunTimeline dayun={chart.dayun} />
            </div>
          </GlassCard>

          <BatuTopics chart={chart} />
        </PanelReveal>
      ) : null}
    </section>
  );
}
