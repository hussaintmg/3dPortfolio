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

export type AnimationConfig = {
  type: string;
  duration: number;
  delay: number;
  easing: string;
  once: boolean;
};

export const DEFAULT_ANIMATION: AnimationConfig = {
  type: "fade-up",
  duration: 700,
  delay: 0,
  easing: "smooth",
  once: true,
};

export const easingCss = (id: string) =>
  EASINGS.find((e) => e.id === id)?.css || EASINGS[0].css;
