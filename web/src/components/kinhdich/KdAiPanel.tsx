"use client";
import { useFeatureResult } from "@/lib/use-feature-result";
import { refreshPromptRevision } from "@/lib/state";

/**
 * KdAiPanel — luận giải quẻ bằng AI (useRequireProfile → runAiPrompt, cache
 * "kinhDich"). Chờ: SunSpinner + Skeleton; xong: PanelReveal + AiText +
 * LikeButton + "Gieo quẻ khác". Port prompt từ performCast của app cũ.
 */
import { LoadingWhisper } from "@/components/kit/LoadingWhisper";
import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/kit";
import { KdReading } from "./KdReading";
import { LikeButton } from "@/components/motion";
import styles from "./KinhDich.module.css";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { useProfileModal, useRequireProfile } from "@/components/profile/ProfileModal";
import { runAiPrompt } from "@/lib/api";
import { buildKdPrompt, kdCacheKey } from "@/lib/kinhdich";
import type { CastResult } from "@/lib/kinhdich";
import { readAiCache, writeAiCache } from "@/lib/state";
import { useProfile } from "@/lib/use-store";

interface KdAiPanelProps {
  result: CastResult;
  question: string;
  onReset: () => void;
}

type AiState = "idle" | "loading" | "done" | "error";

export function KdAiPanel({ result, question, onReset }: KdAiPanelProps) {
  const [state, setState] = useState<AiState>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const profile = useProfile();
  const requireProfile = useRequireProfile();
  const { open: openProfile } = useProfileModal();

  const markFresh = useFeatureResult(text, "kinhdich--interpretation", state === "done" && !!profile);
  const interpret = useCallback(async () => {
    if (!requireProfile()) return;
    const q = question.trim() || "(không có câu hỏi cụ thể — luận giải tổng quát)";
    const key = kdCacheKey(result, q);
    await refreshPromptRevision();
      const cached = readAiCache("kinhDich", key);
    if (cached) {
      setText(cached);
      setState("done");
      return;
    }
    setElapsed(0);
    setState("loading");
    try {
      const prompt = buildKdPrompt(result, q, profile);
      const out = await runAiPrompt(prompt, { withChartImage: false, temperature: 0.75, serviceId: "kinhdich--interpretation" });
      writeAiCache("kinhDich", key, out, { module: "kinh-dich", topic: "interpretation" });
      markFresh(out); setText(out);
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không lấy được luận giải.");
      setState("error");
    }
  }, [markFresh, requireProfile, question, result, profile]);

  const done = state === "done";
  useEffect(() => {
    if (state !== "loading") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state]);

  if (!profile) return <section className={styles.profileInvitation}>
    <div className={styles.invitationIcon}><FeatureIcon name="kinhdich" size={28}/></div>
    <h3>Đọc luận giải của bạn</h3>
    <p>Bổ sung hồ sơ để đọc luận giải cho câu hỏi của bạn.</p>
    <button className={styles.primary} onClick={()=>openProfile()}>Bổ sung hồ sơ <span aria-hidden="true">↗</span></button>

  </section>;

  return (
    <section className={styles.readingPanel} aria-busy={state === "loading"}>
      {state !== "idle" && <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-normal text-muc">Luận giải quẻ</h3>
        {done ? <LikeButton label="Thích luận giải này" /> : null}
      </div>}

      {state === "idle" ? (
        <div>
          <button className={styles.primary} onClick={interpret}>
            Đọc luận giải <span aria-hidden="true">↗</span>
          </button>

        </div>
      ) : null}

      {state === "loading" ? <div className={styles.readingWait} role="status" aria-live="polite">
        <div className={styles.loadingHex} aria-hidden="true">{[0,1,2,3,4,5].map(i=><i key={i} style={{animationDelay:`${i*120}ms`}}>{i%2===0?<><b/><b/></>:<b/>}</i>)}</div>
        <div><span className={styles.eyebrow}>ĐANG LUẬN GIẢI</span><p>Đọc quẻ của bạn…</p><small><LoadingWhisper kind="kinhdich"/></small></div>
        <span className={styles.waitTime} aria-hidden="true">{elapsed}s</span>
      </div> : null}

      {state === "error" ? (
        <div className="mt-4">
          <p role="alert" className="text-sm font-semibold text-son-deep">
            {errorMsg}
          </p>
          <Btn variant="ghost" size="sm" className="mt-3" onClick={interpret}>
            Thử lại
          </Btn>
        </div>
      ) : null}

      {done && <div className={styles.readingReveal}>
        <div className="mt-4">
          <KdReading text={text} />
          <Btn variant="ghost" size="md" className="mt-5" onClick={onReset} arrow>
            Gieo quẻ khác
          </Btn>
        </div>
      </div>}
    </section>
  );
}
