/** Entrance animations offered in the editor's Motion tab. */
export const ANIMATION_PRESETS = [
  { id: "none", label: "None" },
  { id: "fade-in", label: "Fade" },
  { id: "fade-up", label: "Fade Up" },
  { id: "fade-down", label: "Fade Down" },
  { id: "fade-left", label: "From Left" },
  { id: "fade-right", label: "From Right" },
  { id: "zoom-in", label: "Zoom In" },
  { id: "zoom-out", label: "Zoom Out" },
  { id: "flip-up", label: "Flip Up" },
  { id: "blur-in", label: "Blur In" },
  { id: "rise", label: "Rise (long)" },
] as const;

export const EASINGS = [
  { id: "smooth", label: "Smooth", css: "cubic-bezier(0.22, 1, 0.36, 1)" },
  { id: "linear", label: "Linear", css: "linear" },
  { id: "ease-out", label: "Ease out", css: "ease-out" },
  { id: "spring", label: "Springy", css: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { id: "sharp", label: "Sharp", css: "cubic-bezier(0.4, 0, 0.2, 1)" },
] as const;

/**
 * Motion that keeps running after the entrance, for things meant to draw the
 * eye — a call-to-action, a badge, a notification dot.
 */
export const LOOP_PRESETS = [
  { id: "none", label: "None" },
  { id: "pulse", label: "Pulse" },
  { id: "float", label: "Float" },
  { id: "bob", label: "Bob" },
  { id: "sway", label: "Sway" },
  { id: "glow", label: "Glow" },
  { id: "shimmer", label: "Shimmer" },
  { id: "spin-slow", label: "Slow spin" },
  { id: "heartbeat", label: "Heartbeat" },
] as const;

export type AnimationConfig = {
  type: string;
  duration: number;
  delay: number;
  easing: string;
  once: boolean;
  /** Continuous animation applied after the entrance finishes. */
  loop?: string;
  loopDuration?: number;
  /** Pause between each repeat of the loop, in ms. */
  loopDelay?: number;
};

export const DEFAULT_ANIMATION: AnimationConfig = {
  type: "fade-up",
  duration: 700,
  delay: 0,
  easing: "smooth",
  once: true,
  loop: "none",
  loopDuration: 2000,
  loopDelay: 0,
};

export const easingCss = (id: string) =>
  EASINGS.find((e) => e.id === id)?.css || EASINGS[0].css;
