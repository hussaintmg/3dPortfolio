"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Code2,
  MonitorSmartphone,
  Server,
  Terminal,
  Sparkles,
  Filter,
} from "lucide-react";
import Link from "next/link";
import StackedCardsHero from "@/Components/StackedCardsHero";
import ProjectsStack from "@/Components/ProjectsStack";
import Scene3DBackground from "@/Components/3D/Scene3DBackground";
// Register GSAP Plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// HARDCODED DEMO DATA
const demoProjects = [
  {
    id: "p1",
    title: "Quantum Trading Interface",
    description:
      "A high-frequency trading dashboard with real-time websocket data streams, WebGL charting, and sub-millisecond execution latency.",
    image:
      "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?q=80&w=2000&auto=format&fit=crop",
    tech: ["Next.js", "WebGL", "Rust", "WebSockets"],
  },
  {
    id: "p2",
    title: "Nexus Core Infrastructure",
    description:
      "Global load balancing and container orchestration platform for edge-computing networks, complete with interactive topology maps.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2000&auto=format&fit=crop",
    tech: ["React", "Go", "Kubernetes", "AWS"],
  },
  {
    id: "p3",
    title: "Synergy AI Engine",
    description:
      "Neural network interface for generative design protocols. Features fluid WebGL canvas interactions and real-time model inference.",
    image:
      "https://images.unsplash.com/photo-1620825937374-87fc7d62828e?q=80&w=2000&auto=format&fit=crop",
    tech: ["TypeScript", "Three.js", "Python", "TensorFlow"],
  },
  {
    id: "p4",
    title: "Cipher Cloud Vault",
    description:
      "End-to-end encrypted distributed storage system with biometric authentication and zero-knowledge proof verification protocols.",
    image:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2000&auto=format&fit=crop",
    tech: ["Vue.js", "Cryptography", "Node.js", "PostgreSQL"],
  },
];

const skills = [
  {
    name: "Frontend Mastery",
    icon: MonitorSmartphone,
    items: [
      "React / Next.js",
      "TypeScript",
      "Tailwind CSS",
      "GSAP / Framer",
      "Three.js",
    ],
  },
  {
    name: "Backend Architecture",
    icon: Server,
    items: ["Node.js", "Python / Go", "PostgreSQL", "MongoDB", "Redis"],
  },
  {
    name: "Cloud Infrastructure",
    icon: Terminal,
    items: ["AWS", "Docker", "Kubernetes", "CI/CD", "System Design"],
  },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. HERO ANIMATIONS
      const heroEls = gsap.utils.toArray(".hero-anim");
      gsap.fromTo(
        heroEls,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.2,
        },
      );

      // 2. REVEAL ANIMATIONS FOR SECTIONS
      const revealItems = gsap.utils.toArray(".reveal-item");
      revealItems.forEach((item: any) => {
        gsap.fromTo(
          item,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      // 3. SKILLS CARDS (STAGGERED ANIMATION)
      const skillCards = gsap.utils.toArray(".skill-card");
      if (skillCards.length > 0) {
        gsap.fromTo(
          skillCards,
          { y: 50, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: "#skills-cards-container",
              start: "top 80%",
              toggleActions: "play reverse play reverse",
            },
          }
        );
      }

      // 3. HORIZONTAL SCROLL FOR PROJECTS
      if (horizontalRef.current && triggerRef.current) {
        const totalWidth = horizontalRef.current.scrollWidth;
        const containerWidth = triggerRef.current.clientWidth;
        const scrollAmount = totalWidth - containerWidth;

        if (scrollAmount > 0) {
          // Scroll the 3D scene UP exactly as `#projects` enters the viewport!
          // This forces the 3D scene off-screen BEFORE the horizontal scroll section even begins its pin.
          ScrollTrigger.create({
            trigger: triggerRef.current,
            start: "top bottom", // When horizontal projects section first arrives from bottom
            end: "top top", // When it fully reaches the top (and is about to pin)
            scrub: true,
            animation: gsap.fromTo(
              "#scene3d-container",
              { y: 0 },
              { y: -window.innerHeight, ease: "none" },
            ),
          });

          const hzAnim = gsap.to(horizontalRef.current, {
            x: -scrollAmount,
            ease: "none",
          });

          const hzTrigger = ScrollTrigger.create({
            trigger: triggerRef.current,
            pin: true,
            scrub: 0.5, // Smooth scrub but faster reaction
            start: "top top",
            end: () => `+=${scrollAmount}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            animation: hzAnim,
          });


        }
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={containerRef}
      className="bg-transparent text-slate-200 selection:bg-indigo-500/30 font-sans min-h-screen"
    >
      {/* ── Fixed 3D background — mounted ONCE, animated by scroll ── */}
      <Scene3DBackground />

      {/* ================= HERO SECTION ================= */}
      <StackedCardsHero />

      {/* ================= ABOUT / IDENTITY ================= */}
      <section
        id="about"
        className="py-32 px-4 md:px-8 border-t border-white/5"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 reveal-item">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-8 h-px bg-indigo-400/50" />
              The Core // About
            </h2>
            <h3 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter">
              Engineering logic <br /> into art.
            </h3>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              In a world of static templates, I build living, breathing digital
              architectures. My focus is on merging robust backend scalability
              with fluid, immersive frontend interactions. I don't just write
              code; I design experiences.
            </p>
          </div>
        </div>
      </section>

      {/* ================= METHODOLOGY ================= */}
      <section
        id="methodology"
        className="py-32 px-4 md:px-8 bg-transparent border-y border-white/5"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="reveal-item space-y-4">
            <div className="text-5xl font-black text-white/80">01</div>
            <h4 className="text-2xl font-black text-white tracking-tighter">
              Strategic Vision
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Blueprinting the architecture before a single line of code is
              written. Aligning technical decisions with core business
              objectives.
            </p>
          </div>
          <div className="reveal-item space-y-4">
            <div className="text-5xl font-black text-white/80">02</div>
            <h4 className="text-2xl font-black text-white tracking-tighter">
              Precision Engineering
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Clean code, optimized algorithms, and modern stacks. Ensuring
              every component operates at peak performance.
            </p>
          </div>
          <div className="reveal-item space-y-4">
            <div className="text-5xl font-black text-white/80">03</div>
            <h4 className="text-2xl font-black text-white tracking-tighter">
              Infinite Scale
            </h4>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Deploying distributed systems built to grow securely with the
              business, utilizing robust containerization and CI/CD protocols.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SKILLS ================= */}
      <section id="skills" className="relative py-24 px-4 md:px-8 bg-transparent overflow-hidden">
        {/* Subtle Ambient Background Orb */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 relative">
          
          {/* LEFT SIDE: Sticky Typography */}
          <div className="lg:col-span-5 h-auto relative z-10">
            <div className="lg:sticky lg:top-40 space-y-6 reveal-item">
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-px bg-indigo-400/50" />
                System Specs //
              </h2>
              <h3 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mix-blend-screen">
                The <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                  Arsenal.
                </span>
              </h3>
              <p className="text-lg text-slate-400 leading-relaxed font-medium mt-6 max-w-sm">
                Tools I use to build fast, scalable, and visually striking products. Not just languages, but fully integrated ecosystems.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Staggered Skill Cards */}
          <div id="skills-cards-container" className="lg:col-span-7 flex flex-col gap-6 lg:gap-8 z-10 pb-20">
            {skills.map((skill, idx) => {
              const Icon = skill.icon;
              return (
                <div
                  key={idx}
                  className="skill-card group relative bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] p-8 md:p-10 rounded-[2rem] transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] overflow-hidden"
                  style={{
                    marginLeft: idx % 2 !== 0 ? "auto" : "0", 
                    marginRight: idx % 2 === 0 ? "auto" : "0",
                    width: "100%",
                    maxWidth: "500px",
                  }}
                >
                  {/* Subtle Inner Glow */}
                  <div className="absolute inset-0 bg-linear-to-tl from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center gap-5">
                      <div className="size-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-indigo-400 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] group-hover:scale-110 group-hover:rotate-3 group-hover:text-indigo-300 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-500">
                        <Icon size={32} />
                      </div>
                      <h3 className="text-2xl font-black tracking-tight text-white/90 group-hover:text-white transition-colors duration-300">
                        {skill.name}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2.5 pt-2">
                      {skill.items.map((item) => (
                         <span
                          key={item}
                          className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold text-slate-300 tracking-wider uppercase backdrop-blur-md group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:text-white transition-all duration-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ================= PROJECT STACK ================= */}
      <ProjectsStack />

      {/* ================= PROJECTS (HORIZONTAL SCROLL) ================= */}
      <section
        id="projects"
        ref={triggerRef}
        className="h-screen pt-30 bg-transparent border-t border-white/5 relative z-10 flex items-center"
      >
        {/* Fixed Title Overlay */}
        <div className="absolute top-14 left-0 w-full px-8 md:px-16 flex flex-col items-start z-30 pointer-events-none">
          <h2 className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] mb-2">
            Featured Work
          </h2>
          <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
            Projects That Actually Shipped.
          </h3>
        </div>

        {/* Scroll Track — GSAP translates this via x. No h-full so outer flex items-center vertically centers it */}
        <div
          ref={horizontalRef}
          className="flex gap-8 px-8 min-w-max items-center"
        >
          {demoProjects.slice(0,4).map((project) => (
            <div
              key={project.id}
              className="project-card w-[85vw] md:w-[600px] h-[50vh] md:h-[400px] rounded-3xl border border-white/10 overflow-hidden bg-slate-900 relative group shadow-2xl shrink-0"
            >
              <img
                src={project.image}
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                alt={project.title}
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full uppercase tracking-widest"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter group-hover:text-indigo-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-slate-300 font-medium line-clamp-2 max-w-md">
                    {project.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* End of Line Card */}
          <div
            className="w-[85vw] md:w-[400px] h-[50vh] md:h-[400px] rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center p-10 text-center space-y-6 shrink-0"
          >
            <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 ring-1 ring-white/10">
              <ArrowRight size={24} />
            </div>
            <h4 className="text-2xl font-black text-white uppercase tracking-tighter">
              Expand Search
            </h4>
            <Link
              href="#contact"
              className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
            >
              Archive Access
            </Link>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section
        id="contact"
        className="py-32 px-4 md:px-8 w-full text-center relative z-10 overflow-hidden bg-transparent"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="w-full mx-auto space-y-8 reveal-item pb-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight pb-2">
            Ready to{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500 italic pr-3">
              initiate?
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 font-medium max-w-xl mx-auto">
            Providing high-tier engineering solutions for visionary brands.
            Let's build the future together.
          </p>
          <div className="pt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-white text-slate-950 px-12 py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
            >
              Construct Connection <ArrowRight className="ml-3" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
