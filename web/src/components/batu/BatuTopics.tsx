"use client";

/**
 * BatuTopics — chủ đề luận giải Bát Tự (TopicTabs từ topic list cũ) + AI
 * (runAiPrompt với prompt port batuPromptBody, cache "batuTopics").
 * Pattern chờ (SunSpinner + Skeleton) / xong (PanelReveal + AiText) chuẩn.
 */
import { useCallback, useMemo, useState } from "react";
import { AiText, Btn, GlassCard, Skeleton, SunSpinner, TopicTabs } from "@/components/kit";
import { LikeButton, PanelReveal } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { runAiPrompt } from "@/lib/api";
import { BATU_TOPICS, buildBatuPromptBody } from "@/lib/batu";
import type { BatuChart } from "@/lib/batu";
import { stableHash } from "@/lib/kinhdich";
import { readAiCache, writeAiCache } from "@/lib/state";
import { useProfile } from "@/lib/use-store";

interface BatuTopicsProps {
  chart: BatuChart;
}

type AiState = "idle" | "loading" | "done" | "error";

export function BatuTopics({ chart }: BatuTopicsProps) {
  const [topicId, setTopicId] = useState(BATU_TOPICS[0].id);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const profile = useProfile();
  const requireProfile = useRequireProfile();

  const topic = useMemo(() => BATU_TOPICS.find((t) => t.id === topicId) ?? BATU_TOPICS[0], [topicId]);
  /** Cache key gắn với chart hiện tại — đổi ngày giờ sinh là đổi key. */
  const cacheKey = useMemo(() => stableHash(`${topic.id}::${JSON.stringify(chart)}`), [topic, chart]);

  const run = useCallback(async () => {
    if (!requireProfile()) return;
    const cached = readAiCache("batuTopics", cacheKey);
    if (cached) {
      setText(cached);
      setAiState("done");
      return;
    }
    setAiState("loading");
    try {
      const prompt = buildBatuPromptBody(topic.prompt, chart, profile);
      const out = await runAiPrompt(prompt, {});
      writeAiCache("batuTopics", cacheKey, out, { module: "batu", topic: topic.id });
      setText(out);
      setAiState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không lấy được phân tích.");
      setAiState("error");
    }
  }, [cacheKey, chart, profile, requireProfile, topic]);

  const pickTopic = useCallback((id: string) => {
    setTopicId(id);
    setAiState("idle");
    setText("");
    setErrorMsg("");
  }, []);

  const done = aiState === "done";

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-muc">Luận giải theo chủ đề</h2>
      <TopicTabs
        className="mt-4 max-w-full overflow-x-auto"
        ariaLabel="Chủ đề luận giải Bát Tự"
        items={BATU_TOPICS.map((t) => ({ id: t.id, label: t.title }))}
        value={topicId}
        onChange={pickTopic}
      />
      <p className="mt-3 text-[13px] font-medium text-muc-2">{topic.desc}</p>

      <GlassCard variant={done ? "premium" : "default"} className="mt-4 p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-extrabold text-muc">{topic.title}</h3>
          {done ? <LikeButton label={`Thích bài ${topic.title}`} /> : null}
        </div>

        {aiState === "idle" ? (
          <div className="mt-4">
            <Btn variant="primary" size="md" onClick={run}>
              Luận giải chủ đề này
            </Btn>
            {!profile ? (
              <p className="mt-2.5 text-xs text-muc-2">Cần hồ sơ để AstroX luận cho đúng người — bấm nút sẽ mở form thiết lập.</p>
            ) : null}
          </div>
        ) : null}

        {aiState === "loading" ? (
          <div className="mt-5" role="status" aria-live="polite" aria-label="Đang phân tích chủ đề">
            <SunSpinner size={40} label="AstroX đang phân tích lá số…" className="items-start" />
            <div className="mt-4 space-y-2.5" aria-hidden="true">
              <Skeleton className="h-3.5 w-[95%]" />
              <Skeleton className="h-3.5 w-[80%]" />
              <Skeleton className="h-3.5 w-[60%]" />
            </div>
          </div>
        ) : null}

        {aiState === "error" ? (
          <div className="mt-4">
            <p role="alert" className="text-sm font-semibold text-son-deep">
              {errorMsg}
            </p>
            <Btn variant="ghost" size="sm" className="mt-3" onClick={run}>
              Thử lại
            </Btn>
          </div>
        ) : null}

        <PanelReveal open={done}>
          <div className="mt-4">
            <AiText text={text} />
          </div>
        </PanelReveal>
      </GlassCard>

      <p className="mt-4 text-xs leading-relaxed text-muc-2">
        Nội dung tham khảo văn hoá truyền thống, không phải lời khuyên y tế / tài chính / pháp lý tuyệt đối. Ở hình 12 con giáp, chi Mão
        dùng biểu tượng Mèo theo văn hoá dân gian Việt Nam (thay vì Thỏ).
      </p>
    </section>
  );
}
