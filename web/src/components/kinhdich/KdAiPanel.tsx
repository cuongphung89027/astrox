"use client";

/**
 * KdAiPanel — luận giải quẻ bằng AI (useRequireProfile → runAiPrompt, cache
 * "kinhDich"). Chờ: SunSpinner + Skeleton; xong: PanelReveal + AiText +
 * LikeButton + "Gieo quẻ khác". Port prompt từ performCast của app cũ.
 */
import { useCallback, useState } from "react";
import { AiText, Btn, GlassCard, Skeleton, SunSpinner } from "@/components/kit";
import { LikeButton, PanelReveal } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
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
  const profile = useProfile();
  const requireProfile = useRequireProfile();

  const interpret = useCallback(async () => {
    if (!requireProfile()) return;
    const q = question.trim() || "(không có câu hỏi cụ thể — luận giải tổng quát)";
    const key = kdCacheKey(result, q);
    const cached = readAiCache("kinhDich", key);
    if (cached) {
      setText(cached);
      setState("done");
      return;
    }
    setState("loading");
    try {
      const prompt = buildKdPrompt(result, q, profile);
      const out = await runAiPrompt(prompt, { withChartImage: false, temperature: 0.75 });
      writeAiCache("kinhDich", key, out, { module: "kinh-dich", topic: "interpretation" });
      setText(out);
      setState("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không lấy được luận giải.");
      setState("error");
    }
  }, [requireProfile, question, result, profile]);

  const done = state === "done";

  return (
    <GlassCard className="p-6 sm:p-7" variant={done ? "premium" : "default"}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold text-muc">Luận giải bằng trí tuệ nhân tạo</h3>
        {done ? <LikeButton label="Thích luận giải này" /> : null}
      </div>

      {state === "idle" ? (
        <div className="mt-4">
          <Btn variant="primary" size="md" onClick={interpret}>
            Luận giải quẻ này
          </Btn>
          <p className="mt-2.5 text-xs leading-relaxed text-muc-2">
            {profile
              ? "AstroX luận theo đúng phép Thể–Dụng của Mai Hoa Dịch Số, gắn với câu hỏi của bạn."
              : "Cần hồ sơ để AstroX xưng hô và luận cho đúng người — bấm nút sẽ mở form thiết lập."}
          </p>
        </div>
      ) : null}

      {state === "loading" ? (
        <div className="mt-5" role="status" aria-live="polite" aria-label="Đang luận giải quẻ">
          <SunSpinner size={40} label="AstroX đang đọc quẻ…" className="items-start" />
          <div className="mt-4 space-y-2.5" aria-hidden="true">
            <Skeleton className="h-3.5 w-[95%]" />
            <Skeleton className="h-3.5 w-[85%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </div>
      ) : null}

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

      <PanelReveal open={done}>
        <div className="mt-4">
          <AiText text={text} />
          <Btn variant="ghost" size="md" className="mt-5" onClick={onReset} arrow>
            Gieo quẻ khác
          </Btn>
        </div>
      </PanelReveal>
    </GlassCard>
  );
}
