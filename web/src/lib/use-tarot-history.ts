"use client";
import { useMemo, useSyncExternalStore } from "react";
import { readTarotHistory, subscribeTarotHistory } from "./tarot-history";
const count = () => readTarotHistory().length;
const serverCount = () => 0;
export function useTarotHistoryCount() {
  return useSyncExternalStore(subscribeTarotHistory, count, serverCount);
}

const snapshot = () => JSON.stringify(readTarotHistory());
const serverSnapshot = () => "[]";
export function useTarotHistory() {
  const raw = useSyncExternalStore(subscribeTarotHistory, snapshot, serverSnapshot);
  return useMemo(() => JSON.parse(raw) as ReturnType<typeof readTarotHistory>, [raw]);
}
