"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const projects = [
  {
    id: 1,
    title: "Quantum Trading Interface",
    tech: ["Next.js", "WebGL", "Rust"],
    image:
      "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?q=80&w=800&auto=format&fit=crop",
    rot: -4,
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: 2,
    title: "Nexus Core Infrastructure",
    tech: ["React", "Go", "AWS"],
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
    rot: 2,
    color: "from-emerald-500 to-cyan-500",
  },
  {
    id: 3,
    title: "Synergy AI Engine",
    tech: ["TypeScript", "Python", "TensorFlow"],
    image:
      "https://images.unsplash.com/photo-1620825937374-87fc7d62828e?q=80&w=800&auto=format&fit=crop",
    rot: -2,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 4,
    title: "Cipher Cloud Vault",
    tech: ["Vue.js", "Node.js", "PostgreSQL"],
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    rot: 4,
    color: "from-orange-500 to-red-500",
  },
];

export default function ProjectsStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
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

          // 1. Initial State for Cards
          cardsRef.current.forEach((card, i) => {
            if (!card) return;
            gsap.set(card, {
              rotation: projects[i].rot,
              x: i * (isMobile ? 8 : 12),
              y: i * (isMobile ? 12 : 20),
              scale: 1 - i * 0.05,
              opacity: 1 - i * 0.15,
            });
          });

          // 2. ScrollTrigger Timeline
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: `+=${projects.length * 100}%`,
              pin: pinRef.current,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              fastScrollEnd: true,
            },
          });

          // 3. Card Animation Sequence
          for (let i = 0; i < projects.length - 1; i++) {
            tl.to(cardsRef.current[i], {
              rotation: 0,
              x: 0,
              y: 0,
              scale: 1.05,
              opacity: 1,
              duration: 0.4,
              ease: "power2.out",
            }).to(
              cardsRef.current[i],
              {
                opacity: 0,
                scale: 1.2,
                y: -30,
                duration: 0.8,
                ease: "power2.inOut",
              },
              "+=0.2",
            );

            for (let j = i + 1; j < projects.length; j++) {
              const newPos = j - i - 1;
              tl.to(
                cardsRef.current[j],
                {
                  rotation: projects[j].rot * (newPos === 0 ? 1 : 0.6),
                  x: newPos * (isMobile ? 8 : 12),
                  y: newPos * (isMobile ? 12 : 20),
                  scale: 1 - newPos * 0.05,
                  opacity: 1 - newPos * 0.15,
                  duration: 0.8,
                  ease: "power2.inOut",
                },
                "<",
              );
            }
          }

          tl.to(cardsRef.current[projects.length - 1], {
            rotation: 0,
            x: 0,
            y: 0,
            scale: 1.05,
            opacity: 1,
            duration: 0.5,
            ease: "power3.out",
          });

          return () => {};
        },
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Force ScrollTrigger refresh on window resize for layout stability
  useEffect(() => {
    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
        {/* Pinned Heading placed at the top of the viewport */}
        <div className="absolute top-0 left-0 w-full px-6 pt-24 md:pt-32 text-center z-50 pointer-events-none">
          <h2
            className={`text-4xl lg:text-5xl font-black tracking-tighter ${spaceGrotesk.className}`}
          >
            Ready Made{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
              Solutions.
            </span>
          </h2>
          <p className="text-slate-400 mt-4 max-w-2xl mx-auto drop-shadow-md">
            Systems I’ve already built that solve problems without needing hand-holding.
          </p>
        </div>

        {/* Adjust height and layout to reserve left side for 3D */}
        <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 flex-1 items-center h-full pt-20">
          {/* Left Column - reserved space for 3D Scene */}
          <div className="hidden lg:block w-full h-full pointer-events-none"></div>

          {/* Right Column - Contains the overlapping cards */}
          <div className="w-full h-full flex justify-center lg:justify-end items-center pb-8 lg:pb-12 overflow-visible">
            <div className="relative h-[45vh] min-[400px]:h-[50vh] sm:h-[60vh] lg:h-[65vh] aspect-3/4 perspective-[1000px] lg:mr-8 xl:mr-16">
              {projects.map((proj, i) => (
                <div
                  key={proj.id}
                  id={i === projects.length - 1 ? "last-project-card" : undefined}
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
                      className="w-full h-full object-cover opacity-60 mix-blend-luminosity brightness-110"
                    />
                  </div>
                  <div
                    className={`absolute -inset-1 z-0 bg-linear-to-tr ${proj.color} opacity-25`}
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
