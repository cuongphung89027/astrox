"use client";
import { refreshPromptRevision } from "@/lib/state";
import { ReadingLoader } from "@/components/kit/ReadingLoader";
import { SavedReading, ReadingInvitation } from "@/components/kit/SavedReading";

/**
 * BatuTopics — chủ đề luận giải Bát Tự (TopicTabs từ topic list cũ) + AI
 * (runAiPrompt với prompt port batuPromptBody, cache "batuTopics").
 * Pattern chờ (SunSpinner + Skeleton) / xong (PanelReveal + AiText) chuẩn.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Batu.module.css";
import { ReadingQuestion } from "@/components/kit/ReadingQuestion";
import { FeatureIcon, type FeatureName } from "@/components/kit/FeatureIcon";
import { Btn } from "@/components/kit";
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
  const [reading,setReading]=useState(false);
  const request=useRef(0);
  const [topicId, setTopicId] = useState(BATU_TOPICS[0].id);
  const [aiState, setAiState] = useState<AiState>("idle");
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const profile = useProfile();
  const requireProfile = useRequireProfile();

  const topic = useMemo(() => BATU_TOPICS.find((t) => t.id === topicId) ?? BATU_TOPICS[0], [topicId]);
  /** Cache key gắn với chart hiện tại — đổi ngày giờ sinh là đổi key. */
  const cacheKey = useMemo(() => stableHash(`${topic.id}::${JSON.stringify(chart)}`), [topic, chart]);

  const [cacheIdentity,setCacheIdentity]=useState<string|null>(null);
  if(cacheIdentity!==cacheKey){
    setCacheIdentity(cacheKey);
    const cached = readAiCache("batuTopics", cacheKey);
    setText(cached);
    setAiState(cached ? "done" : "idle");
    setErrorMsg("");
  }
  useEffect(()=>()=>{request.current++;},[cacheKey]);

  const run = useCallback(async () => {
    if (!requireProfile()) return;
    await refreshPromptRevision();
      const cached = readAiCache("batuTopics", cacheKey);
    if (cached) {
      setText(cached);
      setAiState("done");
      return;
    }
    const id=++request.current;
    setAiState("loading");
    try {
      const prompt = buildBatuPromptBody(topic.prompt, chart, profile);
      const out = await runAiPrompt(prompt, {serviceId: `batu--${topic.id}`});
      writeAiCache("batuTopics", cacheKey, out, { module: "batu", topic: topic.id });
      if(id!==request.current)return;
      setText(out);
      setAiState("done");
    } catch (e) {
      if(id!==request.current)return;
      setErrorMsg(e instanceof Error ? e.message : "Không lấy được phân tích.");
      setAiState("error");
    }
  }, [cacheKey, chart, profile, requireProfile, topic]);

  const pickTopic = useCallback((id: string) => {
    setReading(true);
    if(id===topicId)return;
    request.current++;
    setTopicId(id);
    setAiState("idle");
    setText("");
    setErrorMsg("");
  }, [topicId]);

  const done = aiState === "done";

  const icons:FeatureName[]=["profile","wallet","compat","battu"];
  if(!reading)return <section className={styles.topics}><header className={styles.periodHeading}><span className={styles.eyebrow}>ĐI SÂU HƠN</span><h2>Mệnh bàn kể điều gì?</h2></header><div className={styles.topicGrid}>{BATU_TOPICS.map((t,i)=><button key={t.id} onClick={()=>pickTopic(t.id)}><div><FeatureIcon name={icons[i]} size={27}/><span aria-hidden="true">↗</span></div><h3>{t.title}</h3><p>{t.desc}</p></button>)}</div></section>;
  return <section className={styles.topicReading}>
    <button className={styles.back} onClick={()=>setReading(false)}>← Các chủ đề</button>
    <ReadingQuestion label="GÓC NHÌN BẠN CHỌN">{topic.title}</ReadingQuestion>
    {aiState==="idle"&&<ReadingInvitation label="Đọc luận giải" onRun={run}/>}
    {aiState==="loading"&&<ReadingLoader kind="battu"/>}
    {aiState==="error"&&<div><p role="alert">{errorMsg}</p><Btn onClick={run}>Thử lại</Btn></div>}
    {done&&<PanelReveal open><SavedReading text={text}/><div className={styles.like}><LikeButton label={`Thích bài ${topic.title}`}/></div></PanelReveal>}
  </section>;
}
