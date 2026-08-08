"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks what the home page is still waiting for.
 *
 * The 3D layer and the page content mount independently — the scene lives in
 * the root layout, the data fetches live in the page — so the loading overlay
 * needs somewhere neutral to read both from. A module-level store is enough;
 * there is only ever one home page on screen.
 */
interface BootState {
  sceneReady: boolean;
  dataReady: boolean;
}

let state: BootState = { sceneReady: false, dataReady: false };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const set = (patch: Partial<BootState>) => {
  const next = { ...state, ...patch };
  if (next.sceneReady === state.sceneReady && next.dataReady === state.dataReady) {
    return;
  }
  state = next;
  emit();
};

export const markSceneReady = () => set({ sceneReady: true });
export const markDataReady = () => set({ dataReady: true });

/** Reset on navigation away, so returning to the home page loads cleanly. */
export const resetBootStatus = () => {
  state = { sceneReady: false, dataReady: false };
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const serverSnapshot: BootState = { sceneReady: false, dataReady: false };

export function useBootStatus(): BootState {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}
