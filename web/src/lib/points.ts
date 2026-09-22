"use client";

/**
 * Store số dư Point dùng chung — chip header, menu tài khoản và màn Ví Point
 * cùng đọc một snapshot (useSyncExternalStore), cả app chỉ fetch một lần.
 * refresh() ép tải lại: gọi sau khi đóng panel nạp hoặc quay về từ PayOS.
 * Tài khoản localhost-preview không gọi API (minh họa 1.000 Point).
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { fetchMeWithPoints } from "./api";

export type PointsStatus = "idle" | "loading" | "ready" | "error";

interface PointsState {
  points: number | null;
  status: PointsStatus;
  fetchedAt: number;
}

let state: PointsState = { points: null, status: "idle", fetchedAt: 0 };
const listeners = new Set<() => void>();
const getSnapshot = () => state;

function commit(next: PointsState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const STALE_MS = 60_000;
let inflight: Promise<void> | null = null;

export function refreshPoints(force = false): Promise<void> {
  if (inflight) return inflight;
  if (!force && state.status === "ready" && Date.now() - state.fetchedAt < STALE_MS) return Promise.resolve();
  if (state.points === null) commit({ ...state, status: "loading" });
  inflight = fetchMeWithPoints()
    .then((r) => {
      if (r.user) commit({ points: r.points, status: "ready", fetchedAt: Date.now() });
      else if (state.points === null) commit({ ...state, status: "error" });
      else commit({ ...state, fetchedAt: Date.now() });
    })
    .catch(() => {
      if (state.points === null) commit({ ...state, status: "error" });
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * active=false (tài khoản xem thử localhost) => không bao giờ gọi API,
 * subscriber tự hiển thị số dư minh họa.
 */
export function usePointsBalance(active = true): { points: number | null; status: PointsStatus; refresh: () => Promise<void> } {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    if (active && snap.status === "idle") void refreshPoints();
  }, [active, snap.status]);
  const refresh = useCallback(() => (active ? refreshPoints(true) : Promise.resolve()), [active]);
  return { points: snap.points, status: snap.status, refresh };
}
