"use client";

import { useSyncExternalStore } from "react";
import { getState, getServerState, subscribe } from "./state";
import type { AppState, Profile } from "./types";

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

export function useProfile(): Profile | null {
  return useAppState().profile;
}
