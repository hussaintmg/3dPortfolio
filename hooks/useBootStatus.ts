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
  /**
   * True once the curtain has actually gone.
   *
   * The hero's entrance tween hangs off this. It used to fire on mount, which
   * meant it had finished playing behind an opaque overlay — the curtain then
   * lifted onto a hero that had already arrived, and the animation was, from
   * the visitor's side, simply missing.
   */
  curtainLifted: boolean;
}

let state: BootState = {
  sceneReady: false,
  dataReady: false,
  curtainLifted: false,
};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const set = (patch: Partial<BootState>) => {
  const next = { ...state, ...patch };
  if (
    next.sceneReady === state.sceneReady &&
    next.dataReady === state.dataReady &&
    next.curtainLifted === state.curtainLifted
  ) {
    return;
  }
  state = next;
  emit();
};

export const markSceneReady = () => set({ sceneReady: true });
export const markDataReady = () => set({ dataReady: true });
export const markCurtainLifted = () => set({ curtainLifted: true });

/** Reset on navigation away, so returning to the home page loads cleanly. */
export const resetBootStatus = () => {
  state = { sceneReady: false, dataReady: false, curtainLifted: false };
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const serverSnapshot: BootState = {
  sceneReady: false,
  dataReady: false,
  curtainLifted: false,
};

export function useBootStatus(): BootState {
  return useSyncExternalStore(subscribe, () => state, () => serverSnapshot);
}
