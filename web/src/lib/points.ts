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

let account:string|null=null,epoch=0;
const serverState:PointsState={points:null,status:'idle',fetchedAt:0};
export function setPointsAccount(userId:string|null){
 if(account===userId)return;account=userId;epoch++;inflight=null;commit({...serverState});
}
export function refreshPoints(force=false):Promise<void>{
 if(!account)return Promise.resolve();
 if(inflight)return inflight;
 if(!force&&state.status==='ready'&&Date.now()-state.fetchedAt<STALE_MS)return Promise.resolve();
 const id=epoch,owner=account;
 if(state.points===null)commit({...state,status:'loading'});
 const request=fetchMeWithPoints().then(r=>{
  if(id!==epoch)return;
  if(r.user&&String(r.user.id)===owner)commit({points:r.points,status:'ready',fetchedAt:Date.now()});
  else commit({points:null,status:'error',fetchedAt:0});
 }).catch(()=>{if(id===epoch)commit({...state,status:'error'});}).finally(()=>{if(id===epoch)inflight=null;});
 inflight=request;return request;
}

/**
 * active=false (tài khoản xem thử localhost) => không bao giờ gọi API,
 * subscriber tự hiển thị số dư minh họa.
 */
export function usePointsBalance(active = true): { points: number | null; status: PointsStatus; refresh: () => Promise<void> } {
  const snap = useSyncExternalStore(subscribe, getSnapshot,()=>serverState);
  useEffect(() => {
    if (active && snap.status === "idle") void refreshPoints();
  }, [active, snap.status]);
  const refresh = useCallback(() => (active ? refreshPoints(true) : Promise.resolve()), [active]);
  return { points: snap.points, status: snap.status, refresh };
}
