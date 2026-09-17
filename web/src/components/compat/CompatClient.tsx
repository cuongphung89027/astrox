"use client";

/**
 * CompatClient — trang /tuonghop: chọn 2 cung hoàng đạo (mặc định cung của
 * hồ sơ + 1 cung ngẫu nhiên), bấm "Đối chiếu" để xem:
 *  - hai vòng trống đồng giao nhau (CompatWheel),
 *  - điểm tương hợp % TĨNH theo quy tắc nguyên tố (port từ bảng nguyên tố
 *    của 12 cung cũ) hiển thị NumberPopIn màu kim,
 *  - luận giải chi tiết bằng AI (cache nhóm "compatibility", prompt port từ
 *    COMPATIBILITY cũ — trả JSON strengths/watchouts/advice).
 * Trang không gate module; riêng phần AI yêu cầu hồ sơ (useRequireProfile).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AiText, Btn, Chip, GlassCard, SectionTitle, Skeleton, SunSpinner } from "@/components/kit";
import { NumberPopIn, PanelReveal, useToast } from "@/components/motion";
import { useProfileModal, useRequireProfile } from "@/components/profile/ProfileModal";
import { cacheFingerprint, readAiCache, writeAiCache } from "@/lib/state";
import { runAiPrompt } from "@/lib/api";
import { useProfile } from "@/lib/use-store";
import {
  ELEMENT_TONE,
  ZODIAC_SIGNS,
  compatAnalysis,
  compatPrompt,
  extractJson,
  getZodiacSign,
  type CompatAiResult,
  type ZodiacSign,
} from "@/lib/zodiac";
import { CompatWheel } from "./CompatWheel";

const RELATION_TONE: Record<string, "ngoc" | "sen" | "kim" | "son"> = {
  "Hài hoà": "ngoc",
  "Bổ trợ": "sen",
  "Cần điều chỉnh": "kim",
  "Căng thẳng": "son",
};

function randomSignId(exceptId?: string): string {
  const pool = ZODIAC_SIGNS.filter((s) => s.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function signById(id: string): ZodiacSign {
  return ZODIAC_SIGNS.find((s) => s.id === id) ?? ZODIAC_SIGNS[0];
}

/** Gom JSON AI thành văn bản cho AiText (danh sách gạch đầu dòng + đoạn). */
function buildAiText(json: CompatAiResult): string {
  const parts: string[] = [];
  const strengths = (json.strengths || []).map((s) => `- ${s}`).join("\n");
  const watchouts = (json.watchouts || []).map((s) => `- ${s}`).join("\n");
  if (strengths) parts.push(`**Điểm hợp nhau**\n${strengths}`);
  if (watchouts) parts.push(`**Điểm cần dung hoà**\n${watchouts}`);
  if (json.advice) parts.push(`**Lời khuyên**\n${json.advice}`);
  return parts.join("\n\n") || "Chưa có nội dung luận giải.";
}

function SignSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.14em] text-muc-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass w-full cursor-pointer appearance-none rounded-2xl px-4 py-3 text-sm font-bold text-muc outline-none transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-son"
      >
        {ZODIAC_SIGNS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.symbol} {s.name} ({s.en})
          </option>
        ))}
      </select>
    </div>
  );
}

export function CompatClient() {
  const profile = useProfile();
  const requireProfile = useRequireProfile();
  const { open: openProfile } = useProfileModal();
  const { show: toast } = useToast();

  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [checked, setChecked] = useState<{ a: string; b: string } | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  /** Chống race: chỉ nhận kết quả của request mới nhất. */
  const reqRef = useRef(0);

  // Mặc định sau khi mount: cung của hồ sơ + một cung ngẫu nhiên (random chỉ
  // chạy client-side để tránh lệch hydrate).
  useEffect(() => {
    if (aId && bId) return;
    const mySign = getZodiacSign(profile?.dob);
    const first = aId || mySign?.id || randomSignId();
    setAId(first);
    setBId((prev) => prev || randomSignId(first));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.dob]);

  const a = signById(aId || ZODIAC_SIGNS[0].id);
  const b = signById(bId || ZODIAC_SIGNS[1].id);

  const analysis = useMemo(
    () => (checked ? compatAnalysis(signById(checked.a), signById(checked.b)) : null),
    [checked],
  );
  const checkedA = checked ? signById(checked.a) : null;
  const checkedB = checked ? signById(checked.b) : null;

  const loadAi = useCallback(
    async (force: boolean) => {
      // AI cần hồ sơ — tải tự động chỉ chạy khi đã có (không bật modal lặp).
      if (!checked || !profile) return;
      const ca = signById(checked.a);
      const cb = signById(checked.b);
      const key = `${[ca.id, cb.id].sort().join("+")}::${cacheFingerprint()}`;
      const cached = readAiCache("compatibility", key, force);
      if (cached) {
        try {
          setAiText(buildAiText(extractJson<CompatAiResult>(cached)));
        } catch {
          setAiText(cached);
        }
        setAiError("");
        return;
      }
      setAiLoading(true);
      setAiError("");
      setAiText("");
      const req = ++reqRef.current;
      try {
        const q = compatPrompt(ca, cb, compatAnalysis(ca, cb), profile);
        const raw = await runAiPrompt(q, { withChartImage: false, temperature: 0.6 });
        if (req !== reqRef.current) return;
        writeAiCache("compatibility", key, raw, { module: "compatibility", topic: "pair" });
        let text = raw;
        try {
          text = buildAiText(extractJson<CompatAiResult>(raw));
        } catch {
          /* AI trả văn thường — hiển thị nguyên văn */
        }
        setAiText(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không lấy được luận giải.";
        setAiError(msg);
        toast(`Lỗi luận giải: ${msg}`, "error");
      } finally {
        setAiLoading(false);
      }
    },
    [checked, profile, toast],
  );

  useEffect(() => {
    void loadAi(false);
  }, [loadAi]);

  const onCheck = () => {
    if (aId === bId) {
      toast("Hãy chọn hai cung khác nhau để đối chiếu.", "error");
      return;
    }
    setChecked({ a: aId, b: bId });
    // Gate AI: chưa có hồ sơ → mở modal; sau khi lưu, effect tự luận giải.
    if (!profile) requireProfile();
  };

  const pairKey = checked ? `${checked.a}+${checked.b}` : "";

  return (
    <section className="mx-auto w-full max-w-4xl px-5 py-14">
      <SectionTitle
        eyebrow="Tương Hợp"
        title="Đối chiếu hai cung hoàng đạo"
        sub="Chọn cung Mặt Trời của hai người, xem mức độ tương hợp theo quy tắc nguyên tố và luận giải chi tiết bằng AstroX."
      />

      <GlassCard className="mt-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
            <SignSelect id="compat-sign-a" label="Người 1" value={aId} onChange={(v) => { setAId(v); setChecked(null); }} />
            <span aria-hidden="true" className="hidden pb-3 font-display text-2xl font-extrabold text-kim-deep sm:block">
              ×
            </span>
            <SignSelect id="compat-sign-b" label="Người 2" value={bId} onChange={(v) => { setBId(v); setChecked(null); }} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn variant="primary" onClick={onCheck} disabled={!aId || !bId || aId === bId}>
              Đối chiếu
            </Btn>
            {!profile ? (
              <Btn variant="ghost" size="sm" onClick={() => { openProfile(); }}>
                Nhập hồ sơ để luận giải bằng AI
              </Btn>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div aria-live="polite">
        {checked && checkedA && checkedB && analysis ? (
          <PanelReveal open key={pairKey} className="mt-6">
            <GlassCard>
              <div className="p-6 text-center md:p-8">
                <p className="text-sm font-bold text-muc-2">
                  {checkedA.symbol} {checkedA.name} × {checkedB.symbol} {checkedB.name}
                </p>
                <CompatWheel a={checkedA} b={checkedB} pairKey={pairKey} />
                <div className="mt-2 flex items-end justify-center gap-1" role="img" aria-label={`Điểm tương hợp ${analysis.percent} trên 100`}>
                  <NumberPopIn value={analysis.percent} className="font-display text-6xl font-extrabold leading-none text-kim-deep md:text-7xl" />
                  <span className="pb-1 font-display text-2xl font-extrabold text-kim-deep">%</span>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Chip tone={RELATION_TONE[analysis.relation] ?? "neutral"}>{analysis.relation}</Chip>
                  <Chip tone="neutral">
                    Góc {analysis.angle}° · {analysis.aspectLabel}
                  </Chip>
                  <Chip tone={ELEMENT_TONE[checkedA.element]}>{checkedA.element}</Chip>
                  <span aria-hidden="true" className="text-xs font-bold text-muc-2">+</span>
                  <Chip tone={ELEMENT_TONE[checkedB.element]}>{checkedB.element}</Chip>
                </div>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muc-2">{analysis.elementNote}</p>
              </div>
            </GlassCard>

            <GlassCard className="mt-6">
              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl font-extrabold tracking-tight text-muc">
                    Luận giải chi tiết · {checkedA.name} &amp; {checkedB.name}
                  </h3>
                  {profile ? (
                    <Btn variant="ghost" size="sm" onClick={() => void loadAi(true)}>
                      ↻ Tạo lại
                    </Btn>
                  ) : null}
                </div>
                <div className="mt-4">
                  {!profile ? (
                    <p className="text-sm leading-relaxed text-muc-2">
                      Thêm hồ sơ của bạn để AstroX luận giải chi tiết cặp cung này.
                    </p>
                  ) : aiLoading ? (
                    <div className="flex flex-col items-center gap-5 py-6">
                      <SunSpinner size={40} label="AstroX đang đối chiếu hai lá số…" />
                      <div className="w-full max-w-md space-y-2.5" aria-hidden="true">
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  ) : aiError ? (
                    <div>
                      <p role="alert" className="text-sm font-semibold text-son-deep">
                        {aiError}
                      </p>
                      <Btn variant="ghost" size="sm" className="mt-3" onClick={() => void loadAi(true)}>
                        Thử lại
                      </Btn>
                    </div>
                  ) : aiText ? (
                    <AiText text={aiText} />
                  ) : (
                    <p className="text-sm text-muc-2">Đang chuẩn bị luận giải…</p>
                  )}
                </div>
              </div>
            </GlassCard>
          </PanelReveal>
        ) : null}
      </div>

      <p className="mt-8 text-center text-xs leading-relaxed text-muc-2">
        Điểm tương hợp tính theo quy tắc nguyên tố của chiêm tinh phương Tây (lửa hút khí, đất hút
        nước; lửa–nước và đất–khí khắc nhau). Nội dung tham khảo văn hoá, không phải lời khuyên
        tuyệt đối.
      </p>
    </section>
  );
}

