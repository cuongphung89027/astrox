"use client";

/**
 * TuViClient — module Tử Vi, 3 khối cuộn: (1) Lập lá số 12 cung bằng iztro,
 * (2) Chủ đề luận giải AI, (3) Vận trình theo kỳ. Gate: isModuleAllowed("tuvi")
 * + hồ sơ (useRequireProfile). Lá số chuẩn hoá lưu vào state.ziweiChart để
 * prompt AI + cache fingerprint dùng chung (đúng ràng buộc store cũ).
 */
import { useEffect, useMemo, useState } from "react";
import { Btn, SectionTitle } from "@/components/kit";
import { DongSonSun, LyCloudDivider } from "@/components/kit/motifs";
import { useAuth } from "@/lib/auth";
import { setState } from "@/lib/state";
import { useProfile } from "@/lib/use-store";
import { buildZiweiChart, TUVI_TOPICS, type ZiweiChart } from "@/lib/tuvi";
import { HOUR_CHI_OPTIONS } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { ChartBoard } from "./ChartBoard";
import { ChartFormPanel, type ChartFormValue } from "./ChartFormPanel";
import { LockPanel } from "./LockPanel";
import { PeriodPanel } from "./PeriodPanel";
import { TopicsPanel } from "./TopicsPanel";

function formFromProfile(profile: Profile | null): ChartFormValue {
  return {
    gender: profile?.gender || "Nam",
    dob: profile?.dob || "",
    hourChi: profile?.hourChi || HOUR_CHI_OPTIONS[0],
    place: profile?.place || "",
  };
}

function NoProfileCta({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-[var(--radius-card)] p-10 text-center">
      <DongSonSun size={52} className="text-son" />
      <p className="font-display text-xl font-extrabold text-muc">Chưa có hồ sơ</p>
      <p className="max-w-md text-sm leading-relaxed text-muc-2">
        AstroX cần giới tính, ngày sinh và giờ sinh để lập lá số Tử Vi. Hoàn tất 5 bước hồ sơ ngắn là lá số hiện ngay.
      </p>
      <Btn onClick={onOpen}>Nhập hồ sơ để lập lá số</Btn>
    </div>
  );
}

/** Empty-state cho khối 2/3: panel gợi ý thay vì dòng chữ mỏng — kèm preview chip. */
function StepHint({
  text,
  chips,
}: {
  text: string;
  chips?: { id: string; label: string }[];
}) {
  return (
    <div className="glass rounded-[var(--radius-card)] border-dashed border-muc/25 p-8">
      <div className="flex items-start gap-4">
        <DongSonSun size={40} className="mt-0.5 shrink-0 text-muc-2/70" />
        <div>
          <p className="text-sm font-semibold text-muc">{text}</p>
          {chips ? (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Các chủ đề sẽ mở khi có lá số">
              {chips.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="cursor-default rounded-full bg-white/55 px-3 py-1 text-xs font-medium text-muc-2"
                >
                  {c.label}
                </li>
              ))}
              {chips.length > 8 ? <li className="px-1 py-1 text-xs text-muc-2">+{chips.length - 8} nữa</li> : null}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TuViClient() {
  const { isModuleAllowed } = useAuth();
  const allowed = isModuleAllowed("tuvi");
  const profile = useProfile();
  const requireProfile = useRequireProfile();

  // Form nguồn dữ liệu lá số — khởi tạo từ hồ sơ, tự sync khi hồ sơ đổi ngoài wizard.
  const [form, setForm] = useState<ChartFormValue>(() => formFromProfile(profile));
  useEffect(() => {
    setForm(formFromProfile(profile));
  }, [profile]);

  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(form.dob);

  // Tính lá số cục bộ (iztro, không gọi mạng) từ form.
  const { chart, chartError } = useMemo<{ chart: ZiweiChart | null; chartError: string }>(() => {
    if (!form.gender || !dobValid || !form.hourChi) return { chart: null, chartError: "" };
    try {
      return { chart: buildZiweiChart(form), chartError: "" };
    } catch (e) {
      return { chart: null, chartError: e instanceof Error ? e.message : "Không lập được lá số." };
    }
  }, [form, dobValid]);

  // Lưu lá số vào store — nguồn dữ liệu duy nhất cho prompt + fingerprint cache.
  useEffect(() => {
    if (chart) setState({ ziweiChart: chart });
  }, [chart]);

  if (!allowed) return <LockPanel />;

  const hasProfile = !!profile;
  // ChartBoard cần Profile để hiển thị trung tâm — khi chưa lưu hồ sơ dùng form.
  const chartProfile: Profile =
    profile ?? { name: "", gender: form.gender, dob: form.dob, hourChi: form.hourChi, place: form.place };

  const chartBlock =
    chart && dobValid ? (
      <ChartBoard chart={chart} profile={chartProfile} />
    ) : !hasProfile ? (
      <NoProfileCta onOpen={() => requireProfile()} />
    ) : chartError ? (
      <p role="alert" className="text-sm font-semibold text-son-deep">
        Không thể lập lá số: {chartError}
      </p>
    ) : (
      <p className="text-sm text-muc-2">Điền ngày sinh và giờ sinh ở trên để lập lá số.</p>
    );

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <SectionTitle
        eyebrow="Tử Vi"
        as="h1"
        title="Tử Vi Đẩu Số"
        sub="Xem dữ liệu 12 cung, vận trình năm 2026 và các chủ đề bạn muốn phân tích."
      />

      <div className="mt-10 space-y-14">
        {/* Khối 1 — Lập lá số */}
        <section aria-labelledby="tuvi-khoi-laso" className="space-y-5 scroll-mt-24">
          <SectionTitle
            id="tuvi-khoi-laso"
            eyebrow="Bước 1"
            as="h2"
            title="Lập lá số 12 cung"
            sub="Tính trực tiếp từ ngày sinh, giờ sinh và giới tính bằng thuật toán Tử Vi thật."
          />
          <ChartFormPanel
            value={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onUseProfile={() => setForm(formFromProfile(profile))}
            hasProfile={hasProfile}
          />
          {chartBlock}
        </section>

        <LyCloudDivider />

        {/* Khối 2 — Chủ đề luận giải */}
        <section aria-labelledby="tuvi-khoi-chude" className="space-y-5 scroll-mt-24">
          <SectionTitle
            id="tuvi-khoi-chude"
            eyebrow="Bước 2"
            as="h2"
            title="Chủ đề luận giải"
            sub="Chọn chủ đề bạn muốn phân tích — AstroX đọc trực tiếp dữ liệu lá số đã tính ở trên."
          />
          {hasProfile && chart ? (
            <TopicsPanel profile={profile} chart={chart} />
          ) : (
            <StepHint
              text="Hoàn tất hồ sơ và lá số ở Bước 1 để mở 12 chủ đề luận giải theo dữ liệu cung của riêng bạn."
              chips={TUVI_TOPICS.map((t) => ({ id: t.id, label: t.title }))}
            />
          )}
        </section>

        <LyCloudDivider />

        {/* Khối 3 — Vận trình */}
        <section aria-labelledby="tuvi-khoi-vantrinh" className="space-y-5 scroll-mt-24">
          <SectionTitle
            id="tuvi-khoi-vantrinh"
            eyebrow="Bước 3"
            as="h2"
            title="Vận trình"
            sub="Hôm nay, tuần này, tháng này — dựa trên Lưu Nhật, Lưu Nguyệt và Tứ Hóa thật của từng kỳ."
          />
          {hasProfile && chart ? (
            <PeriodPanel profile={profile} chart={chart} />
          ) : (
            <StepHint text="Vận trình hôm nay / tuần này / tháng này sẽ mở ngay khi lá số ở Bước 1 sẵn sàng." />
          )}
        </section>

        <p className="text-xs leading-relaxed text-muc-2">
          Nội dung tham khảo văn hoá truyền thống, không phải lời khuyên y tế / tài chính / pháp lý tuyệt đối.
        </p>
      </div>
    </section>
  );
}
