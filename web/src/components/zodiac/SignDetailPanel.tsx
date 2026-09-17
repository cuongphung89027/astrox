"use client";

/**
 * SignDetailPanel — đặc tính tĩnh của cung đang chọn (port từ dữ liệu
 * ZODIAC_SIGNS cũ) + luận giải sâu bằng AI (Bộ ba cốt lõi / Tình yêu /
 * Sự nghiệp — prompt port từ ZODIAC_TOPICS, cache nhóm "zodiacTopics").
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AiText, Btn, Chip, GlassCard, Skeleton, SunSpinner, TopicTabs, type TabItem } from "@/components/kit";
import { DrumRing } from "@/components/kit/motifs";
import { PanelReveal, useToast } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { readAiCache, setState, writeAiCache } from "@/lib/state";
import { runAiPrompt } from "@/lib/api";
import {
  ELEMENT_CLASH,
  ELEMENT_FRIEND,
  ELEMENT_TONE,
  ZODIAC_DEEP_TOPICS,
  buildNatalChart,
  signDateRange,
  zodiacPromptBody,
  type NatalChart,
  type ZodiacSign,
} from "@/lib/zodiac";
import type { Profile } from "@/lib/types";

const TOPIC_TABS: TabItem[] = ZODIAC_DEEP_TOPICS.map((t) => ({ id: t.id, label: t.label }));

interface SignDetailPanelProps {
  sign: ZodiacSign;
  profile: Profile | null;
  natalChart: NatalChart | null;
  className?: string;
}

export function SignDetailPanel({ sign, profile, natalChart, className }: SignDetailPanelProps) {
  const [topicId, setTopicId] = useState(ZODIAC_DEEP_TOPICS[0].id);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { show: toast } = useToast();
  const requireProfile = useRequireProfile();
  /** Chống race: chỉ nhận kết quả của request mới nhất. */
  const reqRef = useRef(0);

  const topic = ZODIAC_DEEP_TOPICS.find((t) => t.id === topicId) ?? ZODIAC_DEEP_TOPICS[0];

  const load = useCallback(
    async (force: boolean) => {
      // Tải tự động: chỉ chạy khi đã có hồ sơ (không bật modal).
      if (!profile) return;
      const req = ++reqRef.current;
      const cacheKey = `${topic.id}::${topic.subId}::${sign.id}`;
      const cached = readAiCache("zodiacTopics", cacheKey, force);
      if (cached) {
        setText(cached);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      setText("");
      try {
        const chart = natalChart ?? buildNatalChart(profile);
        if (chart && chart !== natalChart) setState({ natalChart: chart });
        const q = zodiacPromptBody(
          profile,
          chart,
          topic.prompt.replace(/\{SIGN\}/g, `${sign.name} (${sign.en})`).replace(/\{ELEMENT\}/g, sign.element).replace(/\{RULER\}/g, sign.ruler),
        );
        const result = await runAiPrompt(q, { withChartImage: false });
        if (req !== reqRef.current) return;
        writeAiCache("zodiacTopics", cacheKey, result, { module: "zodiac", topic: topic.id });
        setText(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Không lấy được phân tích.";
        setError(msg);
        toast(`Lỗi phân tích: ${msg}`, "error");
      } finally {
        setLoading(false);
      }
    },
    [profile, natalChart, topic, sign, toast],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <GlassCard className={className}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <DrumRing size={120} className={sign.element === "Thuỷ" ? "text-sen" : sign.element === "Hoả" ? "text-son" : sign.element === "Thổ" ? "text-ngoc" : "text-cham"}>
            <span aria-hidden="true" className="text-[40px] leading-none text-muc">
              {sign.symbol}
            </span>
          </DrumRing>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-son-deep">Cung đang chọn</p>
            <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-muc md:text-3xl">
              {sign.name} <span className="text-lg font-bold text-muc-2">({sign.en})</span>
            </h3>
            <p className="mt-1 text-sm font-semibold text-muc-2">{signDateRange(sign)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone={ELEMENT_TONE[sign.element]}>Nguyên tố {sign.element}</Chip>
              <Chip tone="kim">{sign.quality}</Chip>
              <Chip tone="neutral">Chủ tinh {sign.ruler}</Chip>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muc-2">
              Người của cung này thường <strong className="text-muc">{sign.traits}</strong>.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muc-2">
              Khắc chế: hợp với nguyên tố{" "}
              <b className="text-muc">{ELEMENT_FRIEND[sign.element] ?? "—"}</b>, cần chú ý khi tiếp
              năng lượng nguyên tố{" "}
              <b className="text-muc">{ELEMENT_CLASH[sign.element] ?? "—"}</b>.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-muc/10 pt-6">
          <h4 className="text-sm font-extrabold text-muc">Luận giải sâu bằng AstroX</h4>
          <div className="mt-3">
            <TopicTabs items={TOPIC_TABS} value={topicId} onChange={setTopicId} ariaLabel="Chọn chủ đề luận giải" />
          </div>
          <div aria-live="polite" className="mt-4">
            {loading ? (
              <div className="flex flex-col items-center gap-5 py-6">
                <SunSpinner size={40} label="AstroX đang luận giải…" />
                <div className="w-full max-w-md space-y-2.5" aria-hidden="true">
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ) : error ? (
              <div>
                <p role="alert" className="text-sm font-semibold text-son-deep">
                  {error}
                </p>
                <Btn variant="ghost" size="sm" className="mt-3" onClick={() => void load(true)}>
                  Thử lại
                </Btn>
              </div>
            ) : text ? (
              <PanelReveal open key={`${sign.id}-${topicId}`}>
                <AiText text={text} />
                <div className="mt-4">
                  <Btn variant="ghost" size="sm" onClick={() => void load(true)}>
                    ↻ Tạo lại
                  </Btn>
                </div>
              </PanelReveal>
            ) : (
              <div>
                <p className="text-sm text-muc-2">
                  {profile
                    ? "Đang chuẩn bị phân tích…"
                    : "Thêm ngày sinh trong Hồ sơ để AstroX luận giải sâu theo lá số đã tính."}
                </p>
                {!profile ? (
                  <Btn variant="primary" size="sm" className="mt-3" onClick={() => { requireProfile(); }}>
                    Điền ngày sinh
                  </Btn>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
