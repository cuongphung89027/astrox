"use client";
import { useFeatureResult } from "@/lib/use-feature-result";
import { cacheFingerprint, refreshPromptRevision } from "@/lib/state";

/**
 * InterpretationPanel — AI tổng hợp trải bài: prompt port từ
 * computeTarotInterpretationHtml (đủ các lá + chiều + câu hỏi + context hồ
 * sơ), cache "tarot" (key = hash spread + frame + lá + câu hỏi + prompt
 * version). Chờ SunSpinner/Skeleton → PanelReveal + AiText + LikeButton +
 * "Tạo lại".
 */
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { useCallback, useRef, useState } from "react";
import { Btn, Chip } from "@/components/kit";
import { LikeButton, PanelReveal } from "@/components/motion";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import styles from "./Tarot.module.css";
import { TarotReading } from "./TarotReading";
import { useProfileModal, useRequireProfile } from "@/components/profile/ProfileModal";
import { PROMPT_VERSION } from "@/lib/config";
import { runAiPrompt } from "@/lib/api";
import { usePaidPrice } from "@/lib/use-paid-price";
import { PaidPriceBadge } from "@/components/kit/PaidPriceBadge";
import { profileContextText } from "@/lib/numerology";
import { readAiCache, writeAiCache } from "@/lib/state";
import type { Profile } from "@/lib/types";
import { buildTarotPrompt, tarotCacheKey, tarotCardById, type DrawnCard, type TarotDeck, type TarotSpread } from "@/lib/tarot";
import { pushTarotHistory } from "@/lib/tarot-history";

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
  const { open: openProfile } = useProfileModal();
  const [text, setText] = useState("");
  const [state, setState] = useState<AiState>("idle");
  const [errMsg, setErrMsg] = useState("");
  const serviceId = spread.id === "three" ? `tarot--three--${spread.frames?.find(f=>f.label===frameLabel)?.id || "ppf"}` : `tarot--${spread.id}`;
  const pricePrompt = profile ? buildTarotPrompt({spread,frameLabel,deck,question,cards:drawn,positionLabels,profileContext:profileContextText(profile)}) : undefined;
  const price = usePaidPrice(serviceId, pricePrompt);
  const markFresh = useFeatureResult(text, serviceId, state === "done" && !!profile);
  const forceRef = useRef(false);

  const load = useCallback(async () => {
    const fingerprint = cacheFingerprint();
    const force = forceRef.current;
    forceRef.current = false;
    const cacheKey = tarotCacheKey(
      JSON.stringify({ question, deckId: deck.id, spreadId: spread.id, frameId: frameLabel ?? "", cards: drawn, promptVersion: `${PROMPT_VERSION}:english-card-names` }),
    );
    // Lưu vào nhật ký lượt trải (xem lại trong "Nhật ký trải bài" ở màn chọn bài).
    const remember = (result: string) => {
      pushTarotHistory({
        id: cacheKey,
        fingerprint,
        savedAt: Date.now(),
        question,
        deckId: deck.id,
        spreadId: spread.id,
        spreadName: spread.name,
        frameLabel: frameLabel ?? "",
        cards: drawn.map((card, i) => ({
          id: card.id,
          reversed: card.reversed,
          position: positionLabels[i] ?? "",
          nameEn: tarotCardById(card.id)?.nameEn ?? card.id,
        })),
        text: result,
      });
    };
    await refreshPromptRevision();
    if (cacheFingerprint() !== fingerprint) return;
    const cached = readAiCache("tarot", cacheKey, force);
    if (cached) {
      setText(cached);
      setState("done");
      remember(cached);
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
      const result = await runAiPrompt(prompt, { temperature: 0.8, serviceId: spread.id === "three" ? `tarot--three--${spread.frames?.find(f=>f.label===frameLabel)?.id || "ppf"}` : `tarot--${spread.id}` });
      if (cacheFingerprint() === fingerprint) writeAiCache("tarot", cacheKey, result, { module: "tarot", topic: spread.id });
      remember(result);
      if (cacheFingerprint() !== fingerprint) return;
      markFresh(result); setText(result);
      setState("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Không lấy được luận giải.");
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread.id, spread.count, spread.name, frameLabel, deck.id, deck.name, question, drawn, positionLabels, profile, requireProfile]);



  if (!profile) return <div className={styles.profileInvitation}>
    <span className={styles.profileInvitationIcon}><FeatureIcon name="tarot" size={32} /></span>
    <span className={styles.profileInvitationLabel}>THÊM MỘT CHÚT VỀ BẠN</span>
    <h3>Để những lá bài kể chuyện của bạn</h3>
    <p>Hoàn tất hồ sơ để mở luận giải riêng cho trải bài này.</p>
    <button onClick={() => openProfile()}>Bổ sung hồ sơ <span aria-hidden="true">↗</span></button>
    <small>Các lá vừa rút vẫn được giữ nguyên.</small>
  </div>;

  return (
    <div aria-live="polite">
      {state === "idle" ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="max-w-md text-sm leading-relaxed text-muc-2">
            Trải bài đã sẵn sàng. Khám phá thông điệp dành cho bạn.
          </p>
          <Btn
            size="lg"
            arrow
            disabled={price.pending}
            onClick={() => {
              if (requireProfile()) {
                void load();
              }
            }}
          >
            Luận giải trải bài<PaidPriceBadge price={price} />
          </Btn>
        </div>
      ) : state === "loading" ? (
        <ReadingLoader kind="tarot" />
      ) : state === "done" ? (
        <PanelReveal open>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Chip tone="kim">Luận giải AstroX</Chip>
            <div className="flex items-center gap-2">
              <Btn
                variant="ghost"
                size="sm"
                disabled={price.pending}
                onClick={() => {
                  forceRef.current = true;
                  void load();
                }}
              >
                Tạo lại<PaidPriceBadge price={price} />
              </Btn>
              <LikeButton label="Thích luận giải này" />
            </div>
          </div>
          <TarotReading text={text} />
        </PanelReveal>
      ) : (
        <PanelReveal open>
          <p role="alert" className="text-sm font-semibold text-son-deep">
            Không lấy được luận giải: {errMsg}
          </p>
          <div className="mt-4">
            <Btn size="sm" onClick={() => void load()}>
              Thử lại
            </Btn>
          </div>
        </PanelReveal>
      )}
    </div>
  );
}
