"use client";

/**
 * TarotHistory — nhật ký các lượt trải đã luận giải: danh sách lượt trải gần
 * đây (mỗi lượt hiện bộ bài mini, câu hỏi, kiểu trải, ngày dd/mm/yyyy), nhấn
 * xem lại toàn bộ các lá + luận giải; xoá từng lượt. Đọc localStorage sau
 * mount để không lệch hydration với HTML tĩnh.
 */
import { trackFeature } from "@/lib/feature-telemetry";
import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/kit";
import { useToast } from "@/components/motion/toast";
import { removeTarotHistory, type TarotHistoryEntry } from "@/lib/tarot-history";
import { TAROT_DECKS, tarotCardImage, tarotDeckById } from "@/lib/tarot";
import { TarotReading } from "./TarotReading";
import { useTarotHistory } from "@/lib/use-tarot-history";
import { cacheFingerprint } from "@/lib/state";
import styles from "./Tarot.module.css";

const two = (n: number) => String(n).padStart(2, "0");
const day = (ts: number) => {
  const d = new Date(ts);
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const dayTime = (ts: number) => {
  const d = new Date(ts);
  return `${day(ts)} · ${two(d.getHours())}:${two(d.getMinutes())}`;
};
const deckFor = (deckId: string) => tarotDeckById(deckId) ?? TAROT_DECKS[0];

export function TarotHistory({ onClose }: { onClose: () => void }) {
  const entries = useTarotHistory();
  const [selection, setSelection] = useState<{id: string; fingerprint: string} | null>(null);
  const selected = selection?.fingerprint === cacheFingerprint() ? entries.find(entry => entry.id === selection.id) : undefined;
  const lastReported = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) { lastReported.current = null; return; }
    if (lastReported.current === selected.id) return;
    lastReported.current = selected.id;
    trackFeature("result_view", "tarot", "saved");
  }, [selected]);
  const setSelected = (entry: TarotHistoryEntry | null) => setSelection(entry ? {id: entry.id, fingerprint: cacheFingerprint()} : null);
  const { show } = useToast();
  const remove = (entry: TarotHistoryEntry) => {
    if (!confirm("Xoá lượt trải này khỏi nhật ký?")) return;
    try {
      removeTarotHistory(entry.id);
      if (selected?.id === entry.id) setSelected(null);
      show("Đã xoá lượt trải khỏi nhật ký.", "success");
    } catch { show("Chưa xoá được nhật ký. Vui lòng kiểm tra bộ nhớ trình duyệt.", "error"); }
  };

  /* ------------------------------ Xem 1 lượt ------------------------------ */
  if (selected) {
    const deck = deckFor(selected.deckId);
    return <article className={`${styles.history} ${styles.ritual}`}>
      <header className={styles.ritualHeader}>
        <button onClick={() => setSelected(null)} aria-label="Quay lại danh sách lượt trải">←</button>
        <div>
          <span>{(selected.spreadName + (selected.frameLabel ? ` · ${selected.frameLabel}` : "")).toUpperCase()}</span>
          <h2>{selected.savedAt > 0 ? `Lượt trải ngày ${day(selected.savedAt)}` : "Luận giải đã lưu"}</h2>
        </div>
        {selected.cards.length > 0 && <span className={styles.ritualCount}>{selected.cards.length}<i> lá</i></span>}
      </header>
      {selected.question && <p className={styles.ritualQuestion}>{selected.question}</p>}
      {selected.cards.length > 0 ? <div className={styles.historyTable}>
        <p className={styles.historyTableNote}>NHỮNG LÁ BÀI CỦA LƯỢT TRẢI NÀY</p>
        <div className={styles.historyStrip}>
          {selected.cards.map((card, i) => (
            <figure key={`${card.id}-${i}`} className={styles.historyCard} style={{ ["--i" as string]: String(Math.min(i, 10)) }}>
              <img
                src={tarotCardImage(deck, card.id)}
                alt={`${card.nameEn}${card.reversed ? " — ngược" : ""}`}
                width={220}
                height={385}
                loading="lazy"
                className={card.reversed ? styles.historyCardReversed : undefined}
              />
              <figcaption>
                <b>{card.nameEn}</b>
                <span>{card.position || `Lá ${i + 1}`}</span>
                {card.reversed && <i>Ngược</i>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      : <p className={styles.recoveredNote}>Nội dung luận giải cũ vẫn được giữ lại. Bản lưu này không còn thông tin các lá bài.</p>}
      <GlassCard className={`${styles.readingEnter} mt-4 p-5 sm:p-6`}>
        <TarotReading text={selected.text} />
      </GlassCard>
    </article>;
  }

  /* ----------------------------- Danh sách lượt ---------------------------- */
  return <div className={`${styles.history} ${styles.ritual}`}>
    <header className={styles.ritualHeader}>
      <button onClick={onClose} aria-label="Quay lại trải bài">←</button>
      <div><span>NHẬT KÝ TRẢI BÀI</span><h2>Các lượt trải đã luận giải</h2></div>
      <span className={styles.ritualCount}>{entries?.length ?? 0}<i> lượt</i></span>
    </header>

    <p className={styles.recoveredNote}>Tối đa 24 lượt gần đây trong hồ sơ này, lưu trên thiết bị của bạn.</p>
    {entries.length === 0 ? (
      <div className={styles.historyEmpty}>
        <img src={TAROT_DECKS[0].back} alt="" width={220} height={385} aria-hidden="true" />
        <h3>Chưa có lượt trải nào được lưu</h3>
        <p>Khi bạn hoàn tất một lượt luận giải, AstroX tự lưu vào đây để bạn đọc lại bất cứ lúc nào.</p>
        <button onClick={onClose}>Trải bài ngay <span aria-hidden="true">↗</span></button>
      </div>
    ) : (
      <ul className={styles.historyRows}>
        {entries.map((entry, i) => {
          const deck = deckFor(entry.deckId);
          return <li key={entry.id} className={styles.historyRow} style={{ ["--i" as string]: String(Math.min(i, 8)) }}>
            <button type="button" className={styles.historyOpen} onClick={() => setSelected(entry)}>
              <span className={styles.historyFan} aria-hidden="true">
                {entry.cards.slice(0, 3).map((card, ci) => (
                  <img
                    key={ci}
                    src={tarotCardImage(deck, card.id)}
                    alt=""
                    width={88}
                    height={154}
                    loading="lazy"
                    className={card.reversed ? styles.historyFanReversed : undefined}
                  />
                ))}
                {entry.cards.length > 3 && <b>+{entry.cards.length - 3}</b>}
              </span>
              <span className={styles.historyInfo}>
                <strong>{entry.question || "Trải tổng quát"}</strong>
                <small>{entry.spreadName}{entry.frameLabel ? ` · ${entry.frameLabel}` : ""}</small>
                {entry.savedAt > 0 && <time dateTime={new Date(entry.savedAt).toISOString()}>{dayTime(entry.savedAt)}</time>}
              </span>
              <span className={styles.historyChevron} aria-hidden="true">↗</span>
            </button>
            <button type="button" className={styles.historyRemove} onClick={() => remove(entry)} aria-label={`Xoá lượt trải ngày ${dayTime(entry.savedAt)} khỏi nhật ký`}>×</button>
          </li>;
        })}
      </ul>
    )}
  </div>;
}
