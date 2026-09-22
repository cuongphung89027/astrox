"use client";
import styles from "./Zodiac.module.css";
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { SavedReading, ReadingInvitation } from "@/components/kit/SavedReading";

/**
 * SignDetailPanel — đặc tính tĩnh của cung đang chọn (port từ dữ liệu
 * ZODIAC_SIGNS cũ) + luận giải sâu bằng AI (Bộ ba cốt lõi / Tình yêu /
 * Sự nghiệp — prompt port từ ZODIAC_TOPICS, cache nhóm "zodiacTopics").
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/motion";
import { useRequireProfile } from "@/components/profile/ProfileModal";
import { readAiCache, setState, writeAiCache } from "@/lib/state";
import { runAiPrompt } from "@/lib/api";
import {
  ZODIAC_DEEP_TOPICS,
  buildNatalChart,
  zodiacPromptBody,
  type NatalChart,
  type ZodiacSign,
} from "@/lib/zodiac";
import type { Profile } from "@/lib/types";



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
      const cacheKey = `natal-v2::${topic.id}::${topic.subId}::${sign.id}`;
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
        if (req !== reqRef.current) return;
        const msg = e instanceof Error ? e.message : "Không lấy được phân tích.";
        setError(msg);
        toast(`Lỗi phân tích: ${msg}`, "error");
      } finally {
        if (req === reqRef.current) setLoading(false);
      }
    },
    [profile, natalChart, topic, sign, toast],
  );

  useEffect(() => {
    reqRef.current += 1;
    setText(readAiCache("zodiacTopics", `natal-v2::${topic.id}::${topic.subId}::${sign.id}`));
    setError(""); setLoading(false);
    return () => { reqRef.current += 1; };
  }, [topic.id, topic.subId, sign.id, profile]);

  return <section className={`${styles.detail} ${className || ""}`}>
    <div className={styles.topicChoices}>{ZODIAC_DEEP_TOPICS.map((item,i)=><button key={item.id} aria-pressed={topicId===item.id} onClick={()=>setTopicId(item.id)}><span>0{i+1}</span><strong>{item.label}</strong><i aria-hidden="true">↗</i></button>)}</div>
    <div className={styles.result} aria-live="polite">{loading ? <ReadingLoader kind="zodiac" /> : text ? <SavedReading text={text} /> : <>{error && <p role="alert">{error}</p>}<ReadingInvitation label={error ? "Thử lại" : `Khám phá ${topic.label.toLowerCase()}`} onRun={()=> { if (requireProfile()) void load(false); }} /></>}</div>
  </section>;
}
