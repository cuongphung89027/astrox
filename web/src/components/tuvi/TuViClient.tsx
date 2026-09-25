"use client";

/**
 * TuViClient — module Tử Vi, 3 khối cuộn: (1) Lập lá số 12 cung bằng iztro,
 * (2) Chủ đề luận giải AI, (3) Vận trình theo kỳ. Gate: isModuleAllowed("tuvi")
 * + hồ sơ (useRequireProfile). Lá số chuẩn hoá lưu vào state.ziweiChart để
 * prompt AI + cache fingerprint dùng chung (đúng ràng buộc store cũ).
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { Btn } from "@/components/kit";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useAuth } from "@/lib/auth";
import { setState } from "@/lib/state";
import { useProfile } from "@/lib/use-store";
import { buildZiweiChart, type ZiweiChart } from "@/lib/tuvi";
import { formatDob } from "@/lib/utils";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { ChartBoard } from "./ChartBoard";
import { LockPanel } from "./LockPanel";
import { PeriodPanel } from "./PeriodPanel";
import { TopicsPanel } from "./TopicsPanel";
import styles from "./TuVi.module.css";

function NoProfileCta({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles.empty}>
      <FeatureIcon name="tuvi" size={52} className="text-ngoc-deep" />
      <p className="font-display text-xl font-extrabold text-muc">Lá số bắt đầu từ bạn</p>
      <p className="max-w-md text-sm leading-relaxed text-muc-2">
        Hồ sơ của bạn chưa đủ thông tin sinh. Bổ sung một lần để AstroX tự lập lá số và sử dụng cho những lần sau.
      </p>
      <Btn onClick={onOpen}>Hoàn tất hồ sơ</Btn>
    </div>
  );
}

function StepHint({ period = false, onOpen }: { period?: boolean; onOpen: () => void }) {
  return <section className={styles.welcomePanel}>
    <div className={styles.welcomeMark} aria-hidden="true"><FeatureIcon name="tuvi" size={42} /></div>
    <span className={styles.welcomeEyebrow}>{period ? "VẬN TRÌNH CỦA BẠN" : "LUẬN GIẢI RIÊNG BẠN"}</span>
    <h2>{period ? "Đón nhịp ngày mới" : "Hiểu mình, từng khía cạnh"}</h2>
    <p>Bổ sung ngày và giờ sinh để bắt đầu.</p>
    <div className={styles.welcomePreview} aria-label="Nội dung khám phá">{(period ? [["01","Hôm nay"],["02","Tuần này"],["03","Tháng này"]] : [["01","Bản thân"],["02","Sự nghiệp"],["03","Tình duyên"]]).map(([n,label])=><div key={n}><span>{n}</span><strong>{label}</strong></div>)}</div>
    <button onClick={onOpen}>Hoàn tất hồ sơ <span aria-hidden="true">↗</span></button>
  </section>;
}

export function TuViClient() {
  const [tab, setTab] = useState<"chart" | "topics" | "period">("chart");
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    // Read the client URL after hydration; the exported HTML has no query state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === "topics" || view === "period") setTab(view);
  }, []);
  const wideRef = useRef<HTMLDialogElement>(null);
  const { isModuleAllowed } = useAuth();
  const allowed = isModuleAllowed("tuvi");
  const profile = useProfile();
  const { open: openProfile } = useProfileModal();

  // The saved account profile is the sole source of birth information.
  const { chart, chartError } = useMemo<{ chart: ZiweiChart | null; chartError: string }>(() => {
    if (!profile?.gender || !/^\d{4}-\d{2}-\d{2}$/.test(profile.dob) || !profile.hourChi) return { chart: null, chartError: "" };
    try {
      return { chart: buildZiweiChart(profile), chartError: "" };
    } catch (e) {
      return { chart: null, chartError: e instanceof Error ? e.message : "Không lập được lá số." };
    }
  }, [profile]);

  // Lưu lá số vào store — nguồn dữ liệu duy nhất cho prompt + fingerprint cache.
  useEffect(() => {
    setState({ ziweiChart: chart });
  }, [chart]);

  if (!allowed) return <LockPanel />;

  const hasProfile = !!profile;
  const chartBlock = chart && profile ? (
    <ChartBoard chart={chart} profile={profile} />
  ) : chartError ? (
    <div role="alert"><p className="text-sm text-son-deep">Không thể lập lá số: {chartError}</p><button className={styles.outlineButton} onClick={() => openProfile()}>Kiểm tra hồ sơ</button></div>
  ) : <NoProfileCta onOpen={() => openProfile()} />;

  return (
    <main className={styles.page}>
      <h1 className="sr-only">Tử Vi</h1>
      <div className={styles.workspace}>
        {profile && <div className={styles.profileSummary}>
          <div><p className={styles.eyebrow}>HỒ SƠ CỦA BẠN</p><p className={styles.profileName}>{profile.name || "Thông tin đã lưu"}</p></div>
          <p className={styles.profileDetails}>{[profile.gender, profile.dob && formatDob(profile.dob), profile.hourChi && `Giờ ${profile.hourChi}`, profile.place].filter(Boolean).join(" · ")}</p>
          <button className={styles.outlineButton} onClick={() => openProfile()}>Sửa hồ sơ</button>
        </div>}
        <div className={styles.tabs} role="tablist" aria-label="Khám phá lá số">
          {([ ["chart", "Lá số"], ["topics", "Luận giải"], ["period", "Vận trình"] ] as const).map(([id, label], index, items) => (
            <button key={id} id={`${id}-tab`} role="tab" aria-selected={tab === id} aria-controls={`${id}-panel`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(e) => {
              if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
              e.preventDefault();
              const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (index + (e.key === "ArrowRight" ? 1 : -1) + 3) % 3;
              setTab(items[next][0]); document.getElementById(`${items[next][0]}-tab`)?.focus();
            }}>{label}</button>
          ))}
        </div>
        <div id="chart-panel" role="tabpanel" aria-labelledby="chart-tab" hidden={tab !== "chart"} className={styles.chartArea}>

          <div className={styles.chartHeader}><div><p className={styles.eyebrow}>BẢN ĐỒ CỦA BẠN</p><h2 id="tuvi-khoi-laso">{chart ? "Lá số của bạn" : "Lá số Tử Vi"}</h2></div>{chart && <button className={styles.outlineButton} onClick={() => wideRef.current?.showModal()}>Xem rộng ↗</button>}</div>
          {chartBlock}
          {!chart && <div className={styles.emptyFoot}><span>Ngày sinh</span><i /> <span>Giờ sinh</span><i /><span>Lá số riêng bạn</span></div>}
        </div>
        <div id="topics-panel" role="tabpanel" aria-labelledby="topics-tab" hidden={tab !== "topics"}>
          {hasProfile && chart ? <TopicsPanel profile={profile} chart={chart} /> : <StepHint onOpen={() => openProfile()} />}
        </div>
        <div id="period-panel" role="tabpanel" aria-labelledby="period-tab" hidden={tab !== "period"}>
          {hasProfile && chart ? <PeriodPanel profile={profile} chart={chart} /> : <StepHint period onOpen={() => openProfile()} />}
        </div>
      </div>
      <dialog ref={wideRef} className={styles.wideDialog} aria-label="Lá số Tử Vi mở rộng" onClick={(e) => { if (e.target === e.currentTarget) wideRef.current?.close(); }}>
        <div className={styles.wideContent}><div className={styles.chartHeader}><h2>Lá số Tử Vi</h2><button autoFocus className={styles.outlineButton} onClick={() => wideRef.current?.close()}>Đóng ×</button></div>{chart && profile && <ChartBoard chart={chart} profile={profile} />}</div>
      </dialog>
    </main>
  );
}
