"use client";

/**
 * NumerologyClient — module Thần Số Học (Pythagoras), port từ view
 * "numerology" của app cũ: form họ tên + ngày sinh (prefill hồ sơ), bảng
 * cipher tương tác, các nhóm chỉ số, biểu đồ ngày sinh, 4 Đỉnh Cao & Thử
 * Thách, và luận giải AI theo chủ đề (cache "numerologyTopics").
 * Gate: module "numerology" qua useAuth().isModuleAllowed; AI cần hồ sơ.
 */
import { useEffect, useRef, useState } from "react";
import { Btn, Chip, GlassCard, ModuleLockBadge, SectionTitle, TopicTabs } from "@/components/kit";
import { TextsReveal } from "@/components/motion";
import { useToast } from "@/components/motion/toast";
import { useProfileModal } from "@/components/profile/ProfileModal";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/use-store";
import {
  buildNumerologyChart,
  coreMetrics,
  extraMetrics,
  personalMetrics,
  NUMEROLOGY_TOPICS,
  type NumerologyChart,
} from "@/lib/numerology";
import { CipherBoard } from "./CipherBoard";
import { ChipRow, NumTile, PinnacleStrip, PythagorasGrid } from "./tiles";
import { TopicPanel } from "./TopicPanel";

const CORE_NUMBER_CLASSES = ["text-son-deep", "text-kim-deep", "text-sen-deep", "text-ngoc-deep"];

export function NumerologyClient() {
  const profile = useProfile();
  const { isModuleAllowed } = useAuth();
  const { open: openProfileModal } = useProfileModal();
  const { show } = useToast();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [chart, setChart] = useState<NumerologyChart | null>(null);
  const [calcSeq, setCalcSeq] = useState(0);
  const [err, setErr] = useState("");
  const [topicId, setTopicId] = useState(NUMEROLOGY_TOPICS[0].id);
  const prefillRef = useRef(false);

  // Prefill từ hồ sơ (nạp sau hydration) — tự tính luôn khi đủ dữ liệu.
  useEffect(() => {
    if (prefillRef.current || !profile) return;
    const name = (profile.fullName || profile.name || "").trim();
    if (!name || !profile.dob) return;
    prefillRef.current = true;
    setFullName(name);
    setDob(profile.dob);
    try {
      setChart(buildNumerologyChart({ fullName: name, dob: profile.dob }));
      setCalcSeq((s) => s + 1);
    } catch {
      /* hồ sơ lạ — để người dùng bấm tính */
    }
  }, [profile]);

  const compute = () => {
    try {
      const c = buildNumerologyChart({ fullName: fullName.trim(), dob });
      setChart(c);
      setErr("");
      setCalcSeq((s) => s + 1);
    } catch (e) {
      setChart(null);
      const msg = e instanceof Error ? e.message : "Không tính được chỉ số.";
      setErr(msg);
      show(msg, "error");
    }
  };

  /* ------------------------- Gate module ------------------------- */
  if (!isModuleAllowed("numerology")) {
    return (
      <section className="mx-auto w-full max-w-5xl px-5 py-14">
        <GlassCard className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
          <ModuleLockBadge />
          <h1 className="font-display text-2xl font-extrabold text-muc">Chưa được cấp quyền</h1>
          <p className="text-sm leading-relaxed text-muc-2">
            Bạn chưa được cấp quyền truy cập Thần Số Học, vui lòng liên hệ AstroX để được cấp quyền.
          </p>
          <Btn href="/" variant="ghost" size="sm">
            Về trang chủ
          </Btn>
        </GlassCard>
      </section>
    );
  }

  const topic = NUMEROLOGY_TOPICS.find((t) => t.id === topicId) ?? NUMEROLOGY_TOPICS[0];

  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-14">
      <SectionTitle
        eyebrow="Thần Số Học"
        title="Thần Số Học — Pythagoras"
        sub="Các chỉ số tính từ họ tên và ngày sinh dương lịch theo hệ Pythagoras."
      />

      {/* ------------------------------ Form ------------------------------ */}
      <GlassCard className="mt-8 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="numer-fullname" className="mb-1.5 block text-[12.5px] font-bold text-muc">
                Họ tên đầy đủ <span className="font-medium text-muc-2">(dùng để tính biểu đạt & linh hồn)</span>
              </label>
              <input
                id="numer-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn An"
                autoComplete="name"
                className="glass w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-muc outline-none placeholder:font-normal placeholder:text-muc-2/60"
              />
            </div>
            <div>
              <label htmlFor="numer-dob" className="mb-1.5 block text-[12.5px] font-bold text-muc">
                Ngày sinh dương lịch
              </label>
              <input
                id="numer-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="glass w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-muc outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={compute} arrow>
              Tính chỉ số
            </Btn>
            {!profile ? (
              <Btn variant="ghost" onClick={() => openProfileModal()}>
                Thiết lập hồ sơ
              </Btn>
            ) : (
              <Btn variant="ghost" onClick={() => openProfileModal()}>
                Sửa thông tin
              </Btn>
            )}
          </div>
        </div>
        {err ? (
          <p role="alert" className="mt-3 text-sm font-semibold text-son-deep">
            {err}
          </p>
        ) : null}
      </GlassCard>

      {!chart ? (
        <GlassCard className="mt-6 p-6 text-center">
          <p className="text-sm font-semibold text-muc">Chưa có dữ liệu để tính</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muc-2">
            Điền họ tên và ngày sinh rồi bấm “Tính chỉ số” — hoặc thiết lập hồ sơ để AstroX tự điền giúp bạn.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* -------------------- Bảng cipher tương tác -------------------- */}
          <GlassCard className="mt-6 overflow-hidden p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold text-muc">Bảng cipher của {chart.name}</p>
                <p className="mt-1 text-[12.5px] text-muc-2">
                  Mỗi chữ cái mang một con số 1–9 — bấm vào màu để làm nổi bật các chữ mang đúng số đó.
                </p>
              </div>
              <Chip tone="kim">Pythagoras 1–9</Chip>
            </div>
            <div className="mt-5">
              <CipherBoard name={chart.name} calcSeq={calcSeq} />
            </div>
          </GlassCard>

          {/* ---------------------- 4 chỉ số cốt lõi ---------------------- */}
          <h2 className="mt-10 font-display text-xl font-extrabold text-muc">4 chỉ số cốt lõi</h2>
          <TextsReveal className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {coreMetrics(chart).map((m, i) => (
              <GlassCard key={m.key} className="overflow-hidden">
                <NumTile metric={m} numberClass={CORE_NUMBER_CLASSES[i % CORE_NUMBER_CLASSES.length]} />
              </GlassCard>
            ))}
          </TextsReveal>

          {/* ------------- Chỉ số bổ sung + cá nhân (2 cột) ------------- */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5">
              <p className="font-display text-base font-extrabold text-muc">Ngày Sinh · Thái Độ · Trưởng Thành</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {extraMetrics(chart).map((m) => (
                  <GlassCard key={m.key} className="overflow-hidden bg-white/40">
                    <NumTile metric={m} numberClass="text-cham-deep" />
                  </GlassCard>
                ))}
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="font-display text-base font-extrabold text-muc">
                Năm · Tháng · Ngày cá nhân <span className="text-muc-2">({chart.now.year})</span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {personalMetrics(chart).map((m) => (
                  <GlassCard key={m.key} className="overflow-hidden bg-white/40">
                    <NumTile metric={m} numberClass="text-ngoc-deep" />
                  </GlassCard>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ---------- Biểu đồ ngày sinh + Số Nợ Nghiệp (2 cột) ---------- */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <GlassCard className="p-5">
              <p className="font-display text-base font-extrabold text-muc">Biểu đồ ngày sinh</p>
              <div className="mt-4 flex flex-wrap items-start gap-6">
                <PythagorasGrid chart={chart} />
                <div className="min-w-[160px] flex-1">
                  <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-muc-2">Số khuyết</p>
                  <ChipRow
                    items={chart.grid.missing.map((n) => (
                      <span key={n} aria-label={`Thiếu số ${n}`}>
                        {n}
                      </span>
                    ))}
                    emptyText="Không thiếu số nào"
                  />
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="font-display text-base font-extrabold text-muc">Số Nợ Nghiệp</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muc-2">
                Tham khảo — quy tắc phát hiện chưa thống nhất tuyệt đối giữa các nguồn thần số học.
              </p>
              <div className="mt-3">
                <ChipRow
                  items={chart.karmicDebts.map((k) => `${k.label} (${k.raw})`)}
                  emptyText="Không có số nợ nghiệp"
                  tone="ok"
                />
              </div>
            </GlassCard>
          </div>

          {/* ---------------- 4 Đỉnh Cao & 4 Thử Thách ---------------- */}
          <GlassCard className="mt-6 p-5">
            <p className="font-display text-base font-extrabold text-muc">4 Đỉnh Cao &amp; 4 Thử Thách</p>
            <div className="mt-4">
              <PinnacleStrip chart={chart} />
            </div>
          </GlassCard>

          {/* ------------------- Luận giải theo chủ đề ------------------- */}
          <div className="mt-12">
            <h2 className="font-display text-2xl font-extrabold text-muc">Luận giải theo chủ đề</h2>
            <p className="mt-2 text-sm text-muc-2">
              Chọn chủ đề — AstroX phân tích ngay từ biểu đồ đã tính. {profile ? "" : "Cần hồ sơ để dùng AI."}
            </p>
            <div className="mt-4">
              <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1">
                <TopicTabs
                  items={NUMEROLOGY_TOPICS.map((t) => ({ id: t.id, label: t.title }))}
                  value={topicId}
                  onChange={setTopicId}
                  ariaLabel="Chủ đề thần số học"
                />
              </div>
              <p className="mt-3 text-[12.5px] font-semibold text-muc-2">
                {topic.icon} {topic.title} — {topic.desc}
              </p>
            </div>
            <div className="mt-5">
              <TopicPanel topic={topic} chart={chart} profile={profile} />
            </div>
          </div>

          {/* ------------------------- Disclaimer ------------------------- */}
          <div className="glass mt-10 rounded-[var(--radius-card)] p-4">
            <p className="text-[12.5px] leading-relaxed text-muc-2">
              Nội dung tham khảo văn hoá, không phải lời khuyên y tế / tài chính / pháp lý. Tên dùng để tính: họ tên
              khai sinh đầy đủ nếu đã điền trong hồ sơ, ngược lại dùng tên thường gọi.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
