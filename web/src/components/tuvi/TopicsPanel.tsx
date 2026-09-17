"use client";

/**
 * TopicsPanel — khối 2: chủ đề luận giải Tử Vi (TUVI_TOPICS port từ app cũ,
 * giữ nguyên id + label VN). Mỗi mục: đọc cache "tuviTopics" key "topic::sub";
 * chưa có → nút chạy runAiPrompt với prompt đính kèm JSON lá số.
 */
import { useMemo, useState } from "react";
import { TopicTabs, type TabItem } from "@/components/kit";
import { TUVI_TOPICS, tuviPromptBody, type ZiweiChart } from "@/lib/tuvi";
import type { Profile } from "@/lib/types";
import { AiPanel } from "./AiPanel";
import { useAiText } from "./useAiText";

const TOPIC_TABS: TabItem[] = TUVI_TOPICS.map((t) => ({ id: t.id, label: t.title }));

interface TopicsPanelProps {
  profile: Profile;
  chart: ZiweiChart | null;
}

export function TopicsPanel({ profile, chart }: TopicsPanelProps) {
  const [topicId, setTopicId] = useState(TUVI_TOPICS[0].id);
  const topic = TUVI_TOPICS.find((t) => t.id === topicId) ?? TUVI_TOPICS[0];
  const [subId, setSubId] = useState(topic.subs[0].id);
  const sub = topic.subs.find((s) => s.id === subId) ?? topic.subs[0];

  const selectTopic = (id: string) => {
    setTopicId(id);
    const t = TUVI_TOPICS.find((x) => x.id === id);
    if (t) setSubId(t.subs[0].id); // đổi chủ đề → quay về mục nhỏ đầu tiên
  };

  const subTabs: TabItem[] = useMemo(() => topic.subs.map((s) => ({ id: s.id, label: s.label })), [topic]);

  // Prompt ghép hồ sơ + JSON lá số — memo để không rebuild chuỗi nặng mỗi render.
  const prompt = useMemo(() => tuviPromptBody(profile, chart, sub.prompt), [profile, chart, sub]);
  const ai = useAiText({ group: "tuviTopics", cacheKey: `${topic.id}::${sub.id}`, prompt, topic: topic.id });

  return (
    <div className="space-y-4">
      <div className="max-w-full overflow-x-auto pb-1">
        <TopicTabs items={TOPIC_TABS} value={topic.id} onChange={selectTopic} ariaLabel="Chọn chủ đề luận giải Tử Vi" />
      </div>

      <p className="text-sm leading-relaxed text-muc-2">{topic.desc}</p>

      {topic.subs.length > 1 ? (
        <div className="max-w-full overflow-x-auto pb-1">
          <TopicTabs
            items={subTabs}
            value={sub.id}
            onChange={setSubId}
            ariaLabel={`Mục nhỏ của chủ đề ${topic.title}`}
            className="text-[13px]"
          />
        </div>
      ) : null}

      <AiPanel cached={ai.text} loading={ai.loading} error={ai.error} runLabel="Luận giải" onRun={ai.run} />
    </div>
  );
}
