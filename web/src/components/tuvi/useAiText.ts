"use client";
import { refreshPromptRevision } from "@/lib/state";

/**
 * useAiText — máy trạng thái chạy runAiPrompt + cache AI cho từng mục của
 * module Tử Vi (chủ đề: group "tuviTopics"; vận trình: group "tuviPeriod.*").
 * Force=true bỏ qua cache; huỷ request cũ khi đổi mục; lỗi → toast + hiện lại CTA.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { runAiPrompt } from "@/lib/api";
import { readAiCache, writeAiCache } from "@/lib/state";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { useToast } from "@/components/motion";

type TuviCacheGroup = "tuviTopics" | "tuviPeriod.today" | "tuviPeriod.week" | "tuviPeriod.month";

interface UseAiTextOptions {
  group: TuviCacheGroup;
  /** Key cache (mục "topic::sub" hoặc ngày/tuần/tháng ISO). */
  cacheKey: string;
  /** Prompt đầy đủ — caller đã useMemo sẵn. */
  prompt: string;
  topic?: string;
  period?: string;
  revealDelayMs?: number;
}

export function useAiText({ group, cacheKey, prompt, topic, period, revealDelayMs = 0 }: UseAiTextOptions) {
  const requireProfile = useRequireProfile();
  const { show } = useToast();
  const [text, setText] = useState<string>(() => readAiCache(group, cacheKey));
  const [completing, setCompleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Cache AI nằm trong store phi-reactive → khi đổi mục thì đọc lại chủ động.
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setCompleting(false);
    setLoading(false);
    setText(readAiCache(group, cacheKey));
    setError("");
  }, [group, cacheKey]);

  // Huỷ request khi unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (force: boolean) => {
      if (!requireProfile()) return;
      abortRef.current?.abort();
      await refreshPromptRevision();
      const cached = readAiCache(group, cacheKey, force);
      if (cached) {
        setText(cached);
        setError("");
        return;
      }
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setError("");
      setCompleting(false);
      setLoading(true);
      try {
        const result = await runAiPrompt(prompt, { withChartImage: false, signal: ctrl.signal, serviceId: period ? `tuvi--period--${period}` : `tuvi--${cacheKey.replace("::", "--")}` });
        if (abortRef.current !== ctrl) return; // đã có yêu cầu mới thay thế
        writeAiCache(group, cacheKey, result, { module: "tuvi", topic: topic ?? "", period: period ?? "" });
        if (revealDelayMs > 0) {
          setCompleting(true);
          await new Promise<void>((resolve) => {
            const done = () => {
              clearTimeout(timer);
              ctrl.signal.removeEventListener("abort", done);
              resolve();
            };
            const timer = setTimeout(done, revealDelayMs);
            ctrl.signal.addEventListener("abort", done, { once: true });
          });
          if (abortRef.current !== ctrl || ctrl.signal.aborted) return;
        }
        setText(result);
      } catch (e) {
        if (abortRef.current !== ctrl) return;
        const msg = ctrl.signal.aborted
          ? "AstroX dừng yêu cầu — quá thời gian chờ, hãy thử lại."
          : e instanceof Error
            ? e.message
            : "Không lấy được phân tích.";
        setError(msg);
        show(msg, "error");
      } finally {
        if (abortRef.current === ctrl) { setLoading(false); setCompleting(false); }
      }
    },
    [group, cacheKey, prompt, topic, period, requireProfile, show, revealDelayMs],
  );

  return { text, loading, completing, error, run };
}
