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

export default function ProjectsStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
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

          // 1. Initial state
          cardsRef.current.forEach((card, i) => {
            if (!card || !projects[i]) return;
            gsap.set(card, restingAt(i, projects[i].rot));
          });

          const steps = projects.length - 1;

          // 2. ScrollTrigger timeline.
          //    `snap` is the important part: when scrolling stops, the deck
          //    settles on a WHOLE card instead of resting mid-transition with
          //    two cards half-faded over each other.
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: `+=${Math.max(1, steps) * 100}%`,
              pin: pinRef.current,
              scrub: 0.8,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              fastScrollEnd: true,
              snap:
                steps > 0
                  ? {
                      snapTo: 1 / steps,
                      duration: { min: 0.25, max: 0.55 },
                      delay: 0.05,
                      ease: "power2.inOut",
                    }
                  : undefined,
              // Pins are created when data loads (order varies) — priority
              // keeps refresh math in DOCUMENT order so the section below
              // gets offset by this pin's spacing correctly.
              refreshPriority: 2,
            },
          });

          // 3. One step per card. Every card moves at the same moment and
          //    over the same duration, so the deck advances as a single unit.
          for (let i = 0; i < steps; i++) {
            const label = `step-${i}`;
            tl.addLabel(label);

            // The card you've finished with leaves upward, out of the way
            tl.to(
              cardsRef.current[i],
              {
                y: isMobile ? -70 : -110,
                scale: 1.04,
                opacity: 0,
                rotation: projects[i].rot * 0.4,
                duration: 1,
                ease: "power2.in",
              },
              label,
            );

            // …while everything behind it advances exactly one slot
            for (let j = i + 1; j < projects.length; j++) {
              tl.to(
                cardsRef.current[j],
                {
                  ...restingAt(j - i - 1, projects[j].rot),
                  duration: 1,
                  ease: "power2.inOut",
                },
                label,
              );
            }
          }

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
      className="relative w-full bg-transparent text-white overflow-visible"
    >
      <div
        ref={pinRef}
        className="h-screen w-full relative flex flex-col justify-center overflow-visible"
      >
        <div className="absolute top-0 left-0 w-full px-6 pt-24 md:pt-32 text-center z-50 pointer-events-none">
          <h2
            className={`text-4xl lg:text-5xl font-black tracking-tighter ${spaceGrotesk.className}`}
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
            className="text-slate-400 mt-4 max-w-2xl mx-auto drop-shadow-md block"
          >
            Systems I've already built that solve problems without needing
            hand-holding.
          </EditableText>
        </div>

        <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 flex-1 items-center h-full pt-20">
          <div className="hidden lg:block w-full h-full pointer-events-none" />

          <div className="w-full h-full flex justify-center lg:justify-end items-center pb-8 lg:pb-12 overflow-visible">
            <div className="relative h-[45vh] min-[400px]:h-[50vh] sm:h-[60vh] lg:h-[65vh] aspect-3/4 perspective-[1000px] lg:mr-8 xl:mr-16">
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
                    className="absolute inset-0 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-3xl p-5 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col justify-end overflow-hidden origin-center will-change-transform"
                    style={{ zIndex: projects.length - i }}
                  >
                    <div className="absolute inset-0 w-full h-full -z-10 bg-slate-900">
                      <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/50 to-black/90 z-10" />
                      <img
                        src={proj.image}
                        alt={proj.title}
                        loading="lazy"
                        className="w-full h-full object-cover opacity-60 mix-blend-luminosity brightness-110"
                      />
                    </div>
                    <div
                      className="absolute -inset-1 z-0 opacity-25"
                      style={proj.gradientStyle}
                    />
                    <div className="relative z-20 space-y-3 pb-2 transform translate-z-0">
                      <h3
                        className={`text-2xl font-black text-white leading-tight ${spaceGrotesk.className}`}
                      >
                        {proj.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {proj.tech.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-blue-200 backdrop-blur-md"
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
          </div>
        </div>
      </div>
    </section>
  );
}
