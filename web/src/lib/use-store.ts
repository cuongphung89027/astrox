"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe } from "./state";
import type { AppState, Profile } from "./types";

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useProfile(): Profile | null {
  return useAppState().profile;
}
