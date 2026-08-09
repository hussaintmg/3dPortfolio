"use client";

import { useEffect, useRef, useState } from "react";
import { useSite } from "@/context/SiteContext";
import {
  useBootStatus,
  resetBootStatus,
  markCurtainLifted,
} from "@/hooks/useBootStatus";
import LoadingScreen from "./LoadingScreen";

/**
 * Nothing should ever hold the site hostage — bail out after this.
 *
 * The hero's entrance now waits for the curtain rather than playing behind
 * it, so a couple of extra seconds costs a visitor nothing except a couple of
 * extra seconds. Three and a bit keeps it honest on a slow connection.
 */
const MAX_WAIT = 3200;
/** A beat of stillness once everything is in, so the exit doesn't snap. */
const SETTLE = 180;

/**
 * The scene is nice to have, not worth waiting for.
 *
 * WebGL can take seconds on a weak GPU, and holding the whole page for it is
 * what made this feel slow. Once the content is in, the curtain lifts on a
 * short grace period whether or not the sphere has drawn — it fades in
 * behind the page perfectly well on its own.
 */
const SCENE_GRACE = 900;

/**
 * The home page's loading curtain.
 *
 * It sits ABOVE the 3D layer, which keeps rendering behind it, so the sphere
 * is already alive and settled by the time the curtain lifts. When it goes it
 * announces itself through the boot store, and that is the cue the hero's
 * animation waits on.
 */
export default function HomeLoader() {
  const { sceneReady, dataReady } = useBootStatus();
  const { settings } = useSite();
  const [visible, setVisible] = useState(true);
  /**
   * Kept separate from `visible` so the curtain is guaranteed to leave.
   *
   * AnimatePresence only unmounts once the exit animation finishes, and that
   * animation is driven by requestAnimationFrame — which a browser pauses
   * outright in a background tab. Open the site in a tab you don't switch to
   * and the curtain simply never goes. This timer removes it either way.
   */
  const [mounted, setMounted] = useState(true);
  const [progress, setProgress] = useState(8);
  const timedOut = useRef(false);

  // Reset when the home page unmounts, so a return visit loads properly
  useEffect(() => resetBootStatus, []);

  // Creep forward on a curve so it never looks stuck, but never claim 100%
  // until the real work is actually finished.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const target = sceneReady && dataReady ? 100 : sceneReady || dataReady ? 82 : 62;
        if (p >= target) return p;
        return p + Math.max(2.5, (target - p) * 0.22);
      });
    }, 45);
    return () => clearInterval(id);
  }, [visible, sceneReady, dataReady]);

  useEffect(() => {
    if (!visible || !dataReady) return;

    // Both in? Go straight away. Content only? Give the scene a moment.
    const wait = sceneReady ? 0 : SCENE_GRACE;
    const id = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setVisible(false), SETTLE);
    }, wait);
    return () => clearTimeout(id);
  }, [sceneReady, dataReady, visible]);

  /**
   * Hard deadline, measured from mount.
   *
   * Deliberately its own effect with no dependencies: hanging it off the
   * readiness flags would restart the clock every time one of them changed,
   * so a slow scene could push the deadline well past the intended wait.
   */
  useEffect(() => {
    const bail = setTimeout(() => {
      timedOut.current = true;
      setProgress(100);
      setTimeout(() => setVisible(false), SETTLE);
    }, MAX_WAIT);
    return () => clearTimeout(bail);
  }, []);

  /**
   * The page underneath must not scroll while the curtain is up, and its
   * CSS entrance animations must not burn through either — `body.booting`
   * pauses them (see globals.css).
   */
  useEffect(() => {
    if (!visible) {
      // Tell the hero it may play now
      markCurtainLifted();
      document.body.classList.remove("booting");
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("booting");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("booting");
    };
  }, [visible]);

  /** Backstop for the exit animation — see `mounted` above. */
  useEffect(() => {
    if (visible) return;
    const id = setTimeout(() => setMounted(false), 1200);
    return () => clearTimeout(id);
  }, [visible]);

  const name = settings.websiteName || "Portfolio";

  if (!mounted) return null;

  return (
    <LoadingScreen
      isVisible={visible}
      progress={progress}
      title={name}
      status={
        timedOut.current
          ? "Almost there"
          : !sceneReady
            ? "Preparing the scene"
            : !dataReady
              ? "Fetching your work"
              : "Ready"
      }
    />
  );
}
