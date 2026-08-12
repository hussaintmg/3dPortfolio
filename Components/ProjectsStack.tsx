"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Space_Grotesk } from "next/font/google";
import { useReadymadeSolutions } from "@/context/ReadymadeSolutionsContext";
import EditableText from "@/Components/editable/EditableText";
import { Skeleton } from "@/Components/ui/Skeleton";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface StackCard {
  id: string | number;
  title: string;
  tech: string[];
  image: string;
  rot: number;
  gradientStyle: React.CSSProperties;
}

const demo: StackCard[] = [
  {
    id: 1,
    title: "Quantum Trading Interface",
    tech: ["Next.js", "WebGL", "Rust"],
    image:
      "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?q=80&w=800&auto=format&fit=crop",
    rot: -4,
    gradientStyle: { background: "linear-gradient(45deg, #3b82f6, #4f46e5)" },
  },
  {
    id: 2,
    title: "Nexus Core Infrastructure",
    tech: ["React", "Go", "AWS"],
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
    rot: 2,
    gradientStyle: { background: "linear-gradient(45deg, #10b981, #06b6d4)" },
  },
  {
    id: 3,
    title: "Synergy AI Engine",
    tech: ["TypeScript", "Python", "TensorFlow"],
    image:
      "https://images.unsplash.com/photo-1620825937374-87fc7d62828e?q=80&w=800&auto=format&fit=crop",
    rot: -2,
    gradientStyle: { background: "linear-gradient(45deg, #a855f7, #ec4899)" },
  },
  {
    id: 4,
    title: "Cipher Cloud Vault",
    tech: ["Vue.js", "Node.js", "PostgreSQL"],
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    rot: 4,
    gradientStyle: { background: "linear-gradient(45deg, #f97316, #ef4444)" },
  },
];

/**
 * Builds a CSS gradient/solid background from a solution's colorConfig.
 * (Runtime Tailwind classes like `from-[${hex}]` never compile — inline
 * styles are the correct way to render user-picked colors.)
 */
function getGradientStyle(config: any): React.CSSProperties {
  const colors: string[] = config?.colors?.length
    ? config.colors
    : ["#6366f1", "#a855f7"];
  if (config?.type === "solid") return { backgroundColor: colors[0] };
  if (config?.type === "radial")
    return {
      background: `radial-gradient(circle at ${config?.gradientParams?.position || "center"}, ${colors.join(", ")})`,
    };
  if (config?.type === "conical")
    return {
      background: `conic-gradient(from 0deg, ${colors.join(", ")})`,
    };
  return {
    background: `linear-gradient(${config?.gradientParams?.angle ?? 45}deg, ${colors.join(", ")})`,
  };
}

/**
 * Fraction of each card's scroll slot spent actually changing cards. The rest
 * is dwell — scroll where nothing moves because the card is fully formed.
 *
 * This is the whole reason the deck no longer shows two half-faded cards on
 * top of each other: previously a transition filled 100% of its slot, so
 * every resting scroll position landed mid-crossfade and only a snap could
 * rescue it. At 0.55 the majority of the section is a settled, readable card.
 */
const TRANSITION = 0.55;

export default function ProjectsStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const { solutions, loading } = useReadymadeSolutions();

  const projects: StackCard[] =
    solutions.length > 0
      ? solutions.map((s, i) => ({
          id: s._id,
          title: s.title,
          tech: s.technologies,
          image: s.media.url,
          rot: i % 2 === 0 ? -2 - (i % 3) : 2 + (i % 3),
          gradientStyle: getGradientStyle(s.colorConfig),
        }))
      : demo;

  useEffect(() => {
    if (loading || projects.length === 0) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          isMobile: "(max-width: 1023px)",
        },
        (context) => {
          // @ts-ignore
          const { isMobile } = context.conditions;

          // Read here rather than once per mount, so switching the OS setting
          // takes effect the next time this rebuilds instead of at reload only
          const reduced = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;

          /**
           * Resting position for the card sitting `slot` places back in the
           * deck. Slot 0 is the one being read; everything behind it is a
           * fixed, uniform stack rather than a progressive fade — a card is
           * either the one you're looking at or part of the deck, never
           * half-way between the two.
           */
          const restingAt = (slot: number, rot: number) => {
            const depth = Math.min(slot, 3);
            return {
              rotation: slot === 0 ? 0 : rot * 0.5,
              x: depth * (isMobile ? 7 : 11),
              y: depth * (isMobile ? 10 : 16),
              scale: slot === 0 ? 1 : 1 - depth * 0.045,
              opacity: slot === 0 ? 1 : slot > 3 ? 0 : 0.55,
              zIndex: projects.length - slot,
            };
          };

          /**
           * How far a finished card travels on its way out, as a share of the
           * card's own height — so it clears the frame identically on a small
           * phone and a large monitor. Read lazily so a refresh after a
           * resize re-measures instead of reusing the old pixel value.
           */
          const exitY = () =>
            -Math.round((deckRef.current?.offsetHeight || 400) * 0.22);

          // 1. Initial state
          cardsRef.current.forEach((card, i) => {
            if (!card || !projects[i]) return;
            gsap.set(card, restingAt(i, projects[i].rot));
          });
          dotsRef.current.forEach((dot, i) => {
            if (!dot) return;
            gsap.set(dot, { opacity: i === 0 ? 1 : 0.25, scaleX: i === 0 ? 1 : 0.4 });
          });

          const steps = projects.length - 1;

          /**
           * Progress values that land in the MIDDLE of a card's dwell, not on
           * the edge of it. Resting on the boundary meant a single pixel of
           * further scroll immediately started the next crossfade; from the
           * middle there is slack on both sides, so a settled card stays a
           * settled card.
           */
          const dwellHalf = (1 - TRANSITION) / 2;
          const snapPoints =
            steps > 0
              ? [
                  0,
                  ...Array.from(
                    { length: steps },
                    (_, k) => (k + 1 - dwellHalf) / steps,
                  ),
                ]
              : [0];

          /**
           * ── Arrival ────────────────────────────────────────────────────
           *
           * Without this the deck simply travelled up with the page and then
           * froze the instant the pin engaged, which read as "the cards shoot
           * up and then stick". Easing it down into its resting spot over the
           * approach makes the deck look like it settles into place, and
           * starting it slightly smaller means more of the card is on screen
           * before the pin takes over.
           */
          if (!reduced && deckRef.current) {
            gsap.fromTo(
              deckRef.current,
              { y: -28, scale: 0.9, opacity: 0.4 },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: containerRef.current,
                  start: "top 95%",
                  // Finishes exactly when the pin starts, so the deck is
                  // already at rest the moment it is pinned — no hand-off pop
                  end: "top top",
                  scrub: 0.4,
                  invalidateOnRefresh: true,
                },
              },
            );
          }

          // 2. ScrollTrigger timeline.
          //    `snap` lands on a slot boundary, and each slot now ends in a
          //    stretch of dwell, so the deck rests on a WHOLE card instead of
          //    two half-faded ones stacked over each other.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: () =>
                `+=${Math.max(1, steps) * (isMobile ? 88 : 96)}%`,
              pin: pinRef.current,
              scrub: isMobile ? 0.5 : 0.7,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              /**
               * `fastScrollEnd` used to be on here. It force-completed the
               * timeline on a flick, so the deck emptied itself upward and
               * the snap then dragged it back to centre — exactly the "cards
               * fly up, then stick" complaint. Letting the scrub run normally
               * keeps the deck attached to the scroll.
               */
              snap:
                steps > 0 && !reduced
                  ? {
                      snapTo: (value) =>
                        snapPoints.reduce((best, p) =>
                          Math.abs(p - value) < Math.abs(best - value) ? p : best,
                        ),
                      duration: { min: 0.2, max: 0.5 },
                      // Long enough that easing out of a flick does not get
                      // interrupted by a snap yanking the deck somewhere else
                      delay: 0.14,
                      ease: "power2.inOut",
                      // Nearest card, not "the next one in the direction you
                      // happened to be moving" — a nudge returns you to the
                      // card you are reading instead of skipping ahead
                      directional: false,
                    }
                  : undefined,
              // Pins are created when data loads (order varies) — priority
              // keeps refresh math in DOCUMENT order so the section below
              // gets offset by this pin's spacing correctly.
              refreshPriority: 2,
            },
          });

          // 3. One slot per card: a transition, then dwell. Every card moves
          //    at the same moment and over the same duration, so the deck
          //    advances as a single unit.
          for (let i = 0; i < steps; i++) {
            const at = i; // slot i starts at time i, and each slot lasts 1

            // The card you've finished with leaves upward, out of the way
            tl.to(
              cardsRef.current[i],
              {
                y: exitY,
                scale: 1.04,
                opacity: 0,
                rotation: projects[i].rot * 0.4,
                duration: TRANSITION,
                ease: "power2.in",
              },
              at,
            );

            // …while everything behind it advances exactly one slot
            for (let j = i + 1; j < projects.length; j++) {
              tl.to(
                cardsRef.current[j],
                {
                  ...restingAt(j - i - 1, projects[j].rot),
                  duration: TRANSITION,
                  ease: "power2.inOut",
                },
                at,
              );
            }

            // Progress indicator moves with the deck
            tl.to(
              dotsRef.current[i],
              { opacity: 0.25, scaleX: 0.4, duration: TRANSITION, ease: "power2.inOut" },
              at,
            );
            tl.to(
              dotsRef.current[i + 1],
              { opacity: 1, scaleX: 1, duration: TRANSITION, ease: "power2.inOut" },
              at,
            );
          }

          // Hold the final card for the remainder of its slot so the last
          // one gets the same dwell as the others before the pin releases.
          tl.to({}, { duration: 1 - TRANSITION }, steps - 1 + TRANSITION);

          return () => {};
        },
      );
    }, containerRef);

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutions, loading]);

  /**
   * Re-measure after a resize settles.
   *
   * Debounced on purpose: a drag-resize fires this continuously, and
   * refreshing on every pixel makes the pinned deck jump. Mobile browsers
   * also fire `resize` when the URL bar hides, which is not a real layout
   * change, so width is compared rather than trusted blindly.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastWidth = window.innerWidth;

    const handleResize = () => {
      const width = window.innerWidth;
      const heightOnly = width === lastWidth;
      lastWidth = width;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), heightOnly ? 400 : 150);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return (
    <section
      id="projects-stack"
      ref={containerRef}
      className="relative w-full bg-transparent text-white"
    >
      {/* `.h-screen-safe` is `100svh` with a `100vh` fallback — see globals.css
          for why a pinned section must not use plain `vh` on a phone. */}
      <div
        ref={pinRef}
        className="h-screen-safe w-full relative flex flex-col overflow-hidden"
      >
        <div className="shrink-0 w-full px-6 pt-20 md:pt-28 pb-3 text-center z-30 pointer-events-none">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter ${spaceGrotesk.className}`}
          >
            <EditableText k="home.solutions.heading.pre">Ready Made</EditableText>{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
              <EditableText k="home.solutions.heading.highlight">
                Solutions.
              </EditableText>
            </span>
          </h2>
          <EditableText
            k="home.solutions.subheading"
            as="p"
            className="text-sm sm:text-base text-slate-400 mt-3 max-w-2xl mx-auto drop-shadow-md block"
          >
            Systems I've already built that solve problems without needing
            hand-holding.
          </EditableText>
        </div>

        <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 items-center">
          <div className="hidden lg:block w-full h-full pointer-events-none" />

          <div className="w-full h-full flex flex-col justify-center items-center lg:items-end gap-5 pb-6 lg:pb-10">
            {/* `.solutions-deck` caps the height by BOTH the viewport height
                and its width, so a 3:4 card can never grow wide enough to
                overflow a narrow phone or tall enough to be clipped by a
                short one. See globals.css. */}
            <div
              ref={deckRef}
              className="solutions-deck relative aspect-3/4 perspective-[1000px] lg:mr-8 xl:mr-16 will-change-transform"
            >
              {loading ? (
                <>
                  <Skeleton className="absolute inset-0 rounded-3xl rotate-[-3deg] scale-95 opacity-40" />
                  <Skeleton className="absolute inset-0 rounded-3xl rotate-[2deg] scale-[0.97] opacity-60" />
                  <Skeleton className="absolute inset-0 rounded-3xl" />
                </>
              ) : (
                projects.map((proj, i) => (
                  <div
                    key={proj.id}
                    ref={(el) => {
                      cardsRef.current[i] = el;
                    }}
                    className="absolute inset-0 rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col justify-end overflow-hidden origin-center will-change-transform"
                    style={{ zIndex: projects.length - i }}
                  >
                    {/*
                      No backdrop blur here any more. The layer below is
                      opaque, so there was never anything behind the card to
                      blur — it cost a full-card blur pass on four stacked
                      cards on every scrolled frame and rendered nothing.
                    */}
                    <div className="absolute inset-0 w-full h-full -z-10 bg-slate-900">
                      <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/50 to-black/90 z-10" />
                      <img
                        src={proj.image}
                        alt={proj.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-60 mix-blend-luminosity brightness-110"
                      />
                    </div>
                    <div
                      className="absolute -inset-1 z-0 opacity-25"
                      style={proj.gradientStyle}
                    />
                    <div className="relative z-20 space-y-3 pb-2">
                      <h3
                        className={`text-xl sm:text-2xl font-black text-white leading-tight ${spaceGrotesk.className}`}
                      >
                        {proj.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {proj.tech.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-blue-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Which card of how many — a pinned deck otherwise gives no clue
                that scrolling is going anywhere. */}
            {!loading && projects.length > 1 && (
              <div className="flex items-center gap-2 lg:mr-8 xl:mr-16">
                {projects.map((proj, i) => (
                  <span
                    key={proj.id}
                    ref={(el) => {
                      dotsRef.current[i] = el;
                    }}
                    className="block h-1 w-7 rounded-full bg-white/70 origin-center"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
