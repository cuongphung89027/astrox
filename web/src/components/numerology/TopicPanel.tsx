"use client";

/**
 * TopicPanel — luận giải AI theo chủ đề Thần Số: cache "numerologyTopics"
 * (readAiCache/writeAiCache), chờ SunSpinner + Skeleton → PanelReveal + AiText
 * + nút "Tạo lại" (bỏ cache). Port từ openNumerologyTopic/loadNumerologyTopic
 * Content của app cũ.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AiText, Btn, Skeleton, SunSpinner } from "@/components/kit";
import { PanelReveal } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { runAiPrompt } from "@/lib/api";
import { readAiCache, writeAiCache } from "@/lib/state";
import { numerologyPromptBody, type NumerologyChart, type NumerologyTopic } from "@/lib/numerology";
import type { Profile } from "@/lib/types";

type PanelState = "loading" | "done" | "error";

export function TopicPanel({ topic, chart, profile }: { topic: NumerologyTopic; chart: NumerologyChart; profile: Profile | null }) {
  const requireProfile = useRequireProfile();
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [gen, setGen] = useState(0);
  /** Bật cho lần chạy kế tiếp để bỏ cache (nút "Tạo lại"). */
  const forceRef = useRef(false);

  const load = useCallback(
    async (force: boolean) => {
      const cached = readAiCache("numerologyTopics", topic.id, force);
      if (cached) {
        setText(cached);
        setState("done");
        return;
      }
      if (!requireProfile()) {
        setState("error");
        setErrMsg("Cần hồ sơ để lấy luận giải AstroX.");
        return;
      }
      setState("loading");
      try {
        const q = numerologyPromptBody(topic.prompt, chart, profile);
        const result = await runAiPrompt(q, {});
        writeAiCache("numerologyTopics", topic.id, result, { module: "numerology", topic: topic.id });
        setText(result);
        setState("done");
      } catch (e) {
        setErrMsg(e instanceof Error ? e.message : "Không lấy được phân tích.");
        setState("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic.id, chart, profile, requireProfile],
  );

  useEffect(() => {
    const force = forceRef.current;
    forceRef.current = false;
    void load(force);
  }, [load, gen]);

  return (
    <div aria-live="polite">
      {state === "loading" ? (
        <PanelReveal open className="flex flex-col items-center gap-5 rounded-[var(--radius-card)]">
          <SunSpinner size={46} label="AstroX đang luận giải…" />
          <div className="w-full space-y-2.5">
            <Skeleton className="h-3.5 w-[95%]" />
            <Skeleton className="h-3.5 w-[85%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </PanelReveal>
      ) : state === "done" ? (
        <PanelReveal open className="rounded-[var(--radius-card)]">
          <AiText text={text} />
          <div className="mt-5 flex items-center gap-3">
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                forceRef.current = true;
                setGen((g) => g + 1);
              }}
            >
              Tạo lại
            </Btn>
            <span className="text-[11.5px] text-muc-2">Bấm “Tạo lại” để xin một góc nhìn mới.</span>
          </div>
        </PanelReveal>
      ) : (
        <PanelReveal open className="rounded-[var(--radius-card)]">
          <p className="text-sm font-semibold text-son-deep">Không lấy được phân tích: {errMsg}</p>
          <div className="mt-4">
            <Btn size="sm" onClick={() => setGen((g) => g + 1)}>
              Thử lại
            </Btn>
          </div>
        </PanelReveal>
      )}
      {/* aria-live chính của panel nằm ở div bọc ngoài */}
    </div>
  );
}
