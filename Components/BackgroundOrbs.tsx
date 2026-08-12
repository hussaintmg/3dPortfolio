"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Three soft colour washes behind the whole site.
 *
 * Every property animated here is deliberately transform-only, and only
 * translation at that. The orbs used to loop `scale` as well, and scaling an
 * element carrying `blur(120px)` forces the browser to re-run the blur — a
 * full-viewport blur pass, three times over, on every frame, forever. That was
 * the single largest cost during a scroll. Translation of an already-blurred
 * layer is composited on the GPU and costs effectively nothing.
 */
export default function BackgroundOrbs() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -150]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 100]);

  // Anyone who asked for less motion gets the colour, not the drift
  const drift = (x: number[], duration: number, delay = 0) =>
    reduced
      ? undefined
      : {
          animate: { x },
          transition: { duration, repeat: Infinity, ease: "linear" as const, delay },
        };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[-10] overflow-hidden"
      aria-hidden="true"
    >
      {/* Indigo Orb */}
      <motion.div
        style={{ y: reduced ? 0 : y1 }}
        {...drift([0, 50, 0, -50, 0], 15)}
        className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/[0.12] blur-[120px]"
      />

      {/* Purple Orb */}
      <motion.div
        style={{ y: reduced ? 0 : y2 }}
        {...drift([0, -40, 0, 40, 0], 18, 2)}
        className="absolute top-[40%] right-[10%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-purple-500/[0.12] blur-[120px]"
      />

      {/* Cyan Orb — hidden on phones, where three overlapping full-screen
          blurs are the difference between a smooth scroll and a stuttering
          one, and the third one is barely perceptible anyway. */}
      <motion.div
        style={{ y: reduced ? 0 : y3 }}
        {...drift([0, 30, 0, -30, 0], 20, 5)}
        className="hidden md:block absolute bottom-[10%] left-[40%] w-[30vw] h-[30vw] max-w-[500px] max-h-[500px] rounded-full bg-cyan-500/[0.1] blur-[100px]"
      />
    </div>
  );
}
