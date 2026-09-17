"use client";

/**
 * InterpretationPanel — AI tổng hợp trải bài: prompt port từ
 * computeTarotInterpretationHtml (đủ các lá + chiều + câu hỏi + context hồ
 * sơ), cache "tarot" (key = hash spread + frame + lá + câu hỏi + prompt
 * version). Chờ SunSpinner/Skeleton → PanelReveal + AiText + LikeButton +
 * "Tạo lại".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AiText, Btn, Chip, Skeleton, SunSpinner } from "@/components/kit";
import { LikeButton, PanelReveal } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { PROMPT_VERSION } from "@/lib/config";
import { runAiPrompt } from "@/lib/api";
import { profileContextText } from "@/lib/numerology";
import { readAiCache, writeAiCache } from "@/lib/state";
import type { Profile } from "@/lib/types";
import { buildTarotPrompt, tarotCacheKey, type DrawnCard, type TarotDeck, type TarotSpread } from "@/lib/tarot";

interface InterpretationPanelProps {
  spread: TarotSpread;
  frameLabel?: string;
  deck: TarotDeck;
  question: string;
  drawn: DrawnCard[];
  positionLabels: string[];
  profile: Profile | null;
}

type AiState = "idle" | "loading" | "done" | "error";

export function InterpretationPanel(props: InterpretationPanelProps) {
  const { spread, frameLabel, deck, question, drawn, positionLabels, profile } = props;
  const requireProfile = useRequireProfile();
  const [text, setText] = useState("");
  const [state, setState] = useState<AiState>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [gen, setGen] = useState(0);
  const forceRef = useRef(false);

  const load = useCallback(async () => {
    const force = forceRef.current;
    forceRef.current = false;
    const cacheKey = tarotCacheKey(
      JSON.stringify({ question, deckId: deck.id, spreadId: spread.id, frameId: frameLabel ?? "", cards: drawn, promptVersion: PROMPT_VERSION }),
    );
    const cached = readAiCache("tarot", cacheKey, force);
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
      const prompt = buildTarotPrompt({
        spread,
        frameLabel,
        deck,
        question,
        cards: drawn,
        positionLabels,
        profileContext: profile ? profileContextText(profile) : undefined,
      });
      const result = await runAiPrompt(prompt, { temperature: 0.8 });
      writeAiCache("tarot", cacheKey, result, { module: "tarot", topic: spread.id });
      setText(result);
      setState("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Không lấy được luận giải.");
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread.id, spread.count, spread.name, frameLabel, deck.id, deck.name, question, drawn, positionLabels, profile, requireProfile]);

  useEffect(() => {
    if (gen > 0) void load();
  }, [gen, load]);

  return (
    <div aria-live="polite">
      {state === "idle" ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="max-w-md text-sm leading-relaxed text-muc-2">
            Đã rút đủ các lá. Bấm bên dưới để AstroX tổng hợp luận giải cho đúng các lá và chiều đã rút.
          </p>
          <Btn
            size="lg"
            arrow
            onClick={() => {
              if (requireProfile()) {
                setGen((g) => g + 1);
              }
            }}
          >
            Luận giải trải bài
          </Btn>
        </div>
      ) : state === "loading" ? (
        <PanelReveal open className="flex flex-col items-center gap-5">
          <SunSpinner size={46} label="AstroX đang phân tích các lá bài của bạn…" />
          <div className="w-full space-y-2.5">
            <Skeleton className="h-3.5 w-[95%]" />
            <Skeleton className="h-3.5 w-[85%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </PanelReveal>
      ) : state === "done" ? (
        <PanelReveal open>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Chip tone="kim">Luận giải AstroX</Chip>
            <div className="flex items-center gap-2">
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
              <LikeButton label="Thích luận giải này" />
            </div>
          </div>
          <AiText text={text} />
        </PanelReveal>
      ) : (
        <PanelReveal open>
          <p role="alert" className="text-sm font-semibold text-son-deep">
            Không lấy được luận giải: {errMsg}
          </p>
          <div className="mt-4">
            <Btn size="sm" onClick={() => setGen((g) => g + 1)}>
              Thử lại
            </Btn>
          </div>
        </PanelReveal>
      )}
    </div>
  );
}
