"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ExternalLink,
  Github,
  MonitorSmartphone,
  Server,
  Terminal,
  Sparkles,
  Brain,
  Bot,
  Code2,
  Globe,
  Database,
  Workflow,
  Cpu,
  Palette,
  ShieldCheck,
  LineChart,
  Briefcase,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { notify } from "@/lib/notify";
import { markDataReady, useBootStatus } from "@/hooks/useBootStatus";
import StackedCardsHero from "@/Components/StackedCardsHero";
import ProjectsStack from "@/Components/ProjectsStack";
import EditableText from "@/Components/editable/EditableText";
import EditableBox from "@/Components/editable/EditableBox";
import PageSections from "@/Components/sections/PageSections";
import {
  Skeleton,
  SkeletonCard,
  SkeletonFeatureCard,
  SkeletonPriceCard,
} from "@/Components/ui/Skeleton";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Project {
  _id: string;
  title: string;
  description: string;
  technologies: string[];
  liveLink?: string;
  githubLink?: string;
  media?: { url: string; type?: string };
}

interface Service {
  _id: string;
  name: string;
  description: string;
  icon: string;
}

interface Pkg {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  duration: string;
  features: string[];
  badge?: string;
  featured?: boolean;
  isCustom?: boolean;
}

// Fallback demo data shown until real projects are added from the dashboard
const demoProjects: Project[] = [
  {
    _id: "p1",
    title: "Quantum Trading Interface",
    description:
      "A high-frequency trading dashboard with real-time websocket data streams, WebGL charting, and sub-millisecond execution latency.",
    media: {
      url: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?q=80&w=2000&auto=format&fit=crop",
    },
    technologies: ["Next.js", "WebGL", "Rust", "WebSockets"],
  },
  {
    _id: "p2",
    title: "Nexus Core Infrastructure",
    description:
      "Global load balancing and container orchestration platform for edge-computing networks, complete with interactive topology maps.",
    media: {
      url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2000&auto=format&fit=crop",
    },
    technologies: ["React", "Go", "Kubernetes", "AWS"],
  },
  {
    _id: "p3",
    title: "Synergy AI Engine",
    description:
      "Neural network interface for generative design protocols. Features fluid WebGL canvas interactions and real-time model inference.",
    media: {
      url: "https://images.unsplash.com/photo-1620825937374-87fc7d62828e?q=80&w=2000&auto=format&fit=crop",
    },
    technologies: ["TypeScript", "Three.js", "Python", "TensorFlow"],
  },
  {
    _id: "p4",
    title: "Cipher Cloud Vault",
    description:
      "End-to-end encrypted distributed storage system with biometric authentication and zero-knowledge proof verification protocols.",
    media: {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2000&auto=format&fit=crop",
    },
    technologies: ["Vue.js", "Cryptography", "Node.js", "PostgreSQL"],
  },
];

// Fallback services (AI engineering + web development) until DB has entries
const demoServices: Service[] = [
  {
    _id: "s1",
    name: "AI & Machine Learning",
    description:
      "Custom AI agents, LLM integrations, computer vision and ML pipelines that turn raw data into real product features.",
    icon: "Brain",
  },
  {
    _id: "s2",
    name: "Full-Stack Web Development",
    description:
      "Scalable Next.js/Node applications with clean architecture — from database design to pixel-perfect, animated frontends.",
    icon: "Code2",
  },
  {
    _id: "s3",
    name: "Immersive 3D Experiences",
    description:
      "Three.js/WebGL product showcases, interactive landing pages and cinematic scroll experiences that make brands unforgettable.",
    icon: "Cpu",
  },
  {
    _id: "s4",
    name: "Automation & Integrations",
    description:
      "Workflow automation, third-party API integrations, chatbots and background pipelines that save hours of manual work.",
    icon: "Workflow",
  },
];

const serviceIconMap: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  Brain,
  Bot,
  Code2,
  Globe,
  Database,
  Workflow,
  Cpu,
  Palette,
  ShieldCheck,
  LineChart,
  Briefcase,
  Smartphone,
  Server,
  Terminal,
  MonitorSmartphone,
  Sparkles,
};

const skills = [
  {
    name: "AI Engineering",
    icon: Brain,
    items: ["LLMs & Agents", "Python", "TensorFlow / PyTorch", "Computer Vision", "RAG Pipelines"],
  },
  {
    name: "Frontend Mastery",
    icon: MonitorSmartphone,
    items: ["React / Next.js", "TypeScript", "Tailwind CSS", "GSAP / Framer", "Three.js"],
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
  const horizontalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /** The hero's entrance waits on this so it plays in front of the visitor. */
  const { curtainLifted } = useBootStatus();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const errorMsg = query.get("error");
    if (errorMsg) {
      notify.error("Access Denied", { description: errorMsg });
      router.replace("/");
    }
  }, [router]);

  // ── Data ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const projectsCall = axios
      .get("/api/projects")
      .then((res) => {
        if (alive && res.data.success) setProjects(res.data.projects || []);
      })
      .catch(() => {})
      .finally(() => alive && setProjectsLoading(false));

    const servicesCall = axios
      .get("/api/services")
      .then((res) => {
        if (alive && res.data.success) setServices(res.data.services || []);
      })
      .catch(() => {})
      .finally(() => alive && setServicesLoading(false));

    const packagesCall = axios
      .get("/api/packages")
      .then((res) => {
        if (alive && res.data.success) setPackages(res.data.packages || []);
      })
      .catch(() => {})
      .finally(() => alive && setPackagesLoading(false));

    // The loading curtain waits on this, so it must settle even on failure
    Promise.allSettled([projectsCall, servicesCall, packagesCall]).then(() => {
      if (alive) markDataReady();
    });

    return () => {
      alive = false;
    };
  }, []);

  const displayProjects = projects.length > 0 ? projects : demoProjects;
  const displayServices = services.length > 0 ? services : demoServices;

  // Top 3 for the home page: explicitly featured ones first, otherwise the
  // first three by order. Custom (per-client) packages never show here.
  const publicPackages = packages.filter((p) => !p.isCustom);
  const featuredPackages = (
    publicPackages.some((p) => p.featured)
      ? publicPackages.filter((p) => p.featured)
      : publicPackages
  ).slice(0, 3);

  /**
   * ── Hero entrance ─────────────────────────────────────────────────────────
   *
   * Held until the loading curtain is gone. Firing it on mount meant it
   * played out behind an opaque overlay, so the hero was already in place by
   * the time anyone could see it and the animation read as missing.
   */
  useEffect(() => {
    if (!curtainLifted) return;

    // Watchdog: if the GSAP tween is ever prevented from finishing (throttled
    // tab, ticker stall, third-party breakage), force the hero visible. This
    // is what guarantees the "opacity stuck at 0" bug can never come back.
    const watchdog = setTimeout(() => {
      document.querySelectorAll<HTMLElement>(".hero-anim").forEach((el) => {
        if (parseFloat(getComputedStyle(el).opacity) < 1) {
          el.classList.remove("hero-fallback");
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
    }, 3000);

    const ctx = gsap.context(() => {
      const heroEls = gsap.utils.toArray<HTMLElement>(".hero-anim");
      // GSAP is alive — take over from the pure-CSS fallback animation
      heroEls.forEach((el) => el.classList.remove("hero-fallback"));
      gsap.fromTo(
        heroEls,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "power4.out",
          delay: 0.15,
          // leave no inline styles behind — text stays visible no matter what
          clearProps: "all",
        },
      );
    }, containerRef);

    return () => {
      clearTimeout(watchdog);
      ctx.revert();
    };
  }, [curtainLifted]);

  // ── Section reveals (scroll-driven, safe to bind immediately) ────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal-item").forEach((item) => {
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

      const skillCards = gsap.utils.toArray<HTMLElement>(".skill-card");
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
          },
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Featured packages reveal (waits for data) ─────────────────────────────
  useEffect(() => {
    if (packagesLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pkg-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "#pricing",
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, containerRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [packagesLoading]);

  // ── Service cards reveal (waits for data) ─────────────────────────────────
  useEffect(() => {
    if (servicesLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".service-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "#services",
            start: "top 75%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, containerRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [servicesLoading]);

  // ── Horizontal projects scroll (waits for data) ───────────────────────────
  useEffect(() => {
    if (projectsLoading) return;
    if (!horizontalRef.current || !triggerRef.current) return;

    const rail = horizontalRef.current;
    const trigger = triggerRef.current;

    /**
     * Measured lazily and re-measured on every refresh, so changing the
     * window width re-lays the rail out instead of leaving it scrolled to a
     * distance that no longer exists.
     */
    const travel = () =>
      Math.max(0, rail.scrollWidth - trigger.clientWidth);

    /**
     * Progress values that put a card flush against the left edge. Snapping
     * to these is what makes the rail settle on a WHOLE card rather than
     * stopping wherever the wheel happened to stop.
     */
    const cardStops = () => {
      const distance = travel();
      if (distance <= 0) return [0];
      // Undo the rail's current translation so offsets are measured from its
      // untransformed origin, whatever the scroll position happens to be.
      const shift = Number(gsap.getProperty(rail, "x")) || 0;
      const railLeft = rail.getBoundingClientRect().left - shift;
      const stops = Array.from(rail.children).map((card) => {
        const offset = (card as HTMLElement).getBoundingClientRect().left
          - railLeft
          - 32; // the rail's own px-8 gutter
        return Math.min(1, Math.max(0, offset / distance));
      });
      // Always allow resting at the very end, and drop near-duplicates
      return [...new Set([...stops, 1].map((v) => Math.round(v * 1000) / 1000))].sort(
        (a, b) => a - b,
      );
    };

    const ctx = gsap.context(() => {
      if (travel() <= 0) return;

      // (the 3D scroll-away tween lives inside Scene3DBackground so the
      // #scene3d-container target is guaranteed to exist when it binds)
      const hzAnim = gsap.to(rail, {
        x: () => -travel(),
        ease: "none",
      });

      ScrollTrigger.create({
        trigger,
        pin: true,
        scrub: 0.6,
        start: "top top",
        end: () => `+=${travel()}`,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        // Lower priority than the solutions stack pin above (see
        // ProjectsStack) so refresh offsets this pin by that one's spacing.
        refreshPriority: 1,
        animation: hzAnim,
        snap: {
          snapTo: (value) => {
            const stops = cardStops();
            return stops.reduce(
              (best, s) =>
                Math.abs(s - value) < Math.abs(best - value) ? s : best,
              stops[0],
            );
          },
          duration: { min: 0.2, max: 0.6 },
          delay: 0.06,
          ease: "power2.inOut",
        },
      });
    }, containerRef);

    /**
     * A trackpad swipe or shift+wheel over the rail should move it sideways.
     * The section is pinned, so "sideways" really means driving the page
     * scroll — that keeps ScrollTrigger, the snap and the pin all in sync
     * instead of fighting a second source of truth.
     */
    const onWheel = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal || e.deltaX === 0) return;
      const rect = trigger.getBoundingClientRect();
      // Only while the section is actually the one pinned on screen
      if (rect.top > 1 || rect.bottom < window.innerHeight - 1) return;
      e.preventDefault();
      window.scrollBy({ top: e.deltaX, behavior: "instant" as ScrollBehavior });
    };
    trigger.addEventListener("wheel", onWheel, { passive: false });

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    return () => {
      trigger.removeEventListener("wheel", onWheel);
      ctx.revert();
    };
  }, [projectsLoading, projects.length]);

  /** Re-measure the rails once a resize settles. */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastWidth = typeof window === "undefined" ? 0 : window.innerWidth;
    const onResize = () => {
      const widthChanged = window.innerWidth !== lastWidth;
      lastWidth = window.innerWidth;
      clearTimeout(timer);
      timer = setTimeout(() => ScrollTrigger.refresh(), widthChanged ? 150 : 400);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return (
    <main
      ref={containerRef}
      className="bg-transparent text-slate-200 selection:bg-indigo-500/30 font-sans min-h-screen"
    >
      {/* The fixed 3D background lives in the layout so it keeps loading
          while this page's skeleton is on screen. */}

      {/* ================= HERO ================= */}
      <StackedCardsHero />

      {/* ================= ABOUT ================= */}
      <section id="about" className="py-32 px-4 md:px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6 reveal-item">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-8 h-px bg-indigo-400/50" />
              <EditableText k="home.about.label">The Core // About</EditableText>
            </h2>
            <EditableText
              k="home.about.heading"
              as="h3"
              className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tighter block"
            >
              Engineering logic into art.
            </EditableText>
            <EditableText
              k="home.about.body"
              as="p"
              className="text-lg text-slate-400 leading-relaxed font-medium block"
            >
              In a world of static templates, I build living, breathing digital
              architectures. My focus is on merging robust backend scalability
              with fluid, immersive frontend interactions — and wiring real AI
              into products people actually use. I don't just write code; I
              design experiences.
            </EditableText>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section
        id="services"
        className="py-32 px-4 md:px-8 bg-transparent border-t border-white/5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.06),transparent_60%)] -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-2xl space-y-5 reveal-item">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
              <span className="w-8 h-px bg-indigo-400/50" />
              <EditableText k="home.services.label">What I Do // Services</EditableText>
            </h2>
            <EditableText
              k="home.services.heading"
              as="h3"
              className="text-4xl md:text-6xl font-black text-white tracking-tighter block"
            >
              Intelligence, engineered.
            </EditableText>
            <EditableText
              k="home.services.body"
              as="p"
              className="text-lg text-slate-400 font-medium leading-relaxed block"
            >
              From AI systems that think to web platforms that scale — a full
              spectrum of engineering, delivered end to end.
            </EditableText>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {servicesLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonFeatureCard key={i} />
                ))
              : displayServices.map((service) => {
                  const Icon = serviceIconMap[service.icon] || Briefcase;
                  return (
                    <EditableBox
                      key={service._id}
                      k="home.services.card"
                      label="Service card"
                      className="service-card group relative rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-8 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.25)]"
                    >
                      <div className="absolute inset-0 bg-linear-to-tl from-indigo-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                      <div className="relative z-10 space-y-5">
                        <div className="size-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:rotate-3 group-hover:text-indigo-300 transition-all duration-500">
                          <Icon size={26} />
                        </div>
                        <h4 className="text-xl font-black text-white tracking-tight">
                          {service.name}
                        </h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">
                          {service.description}
                        </p>
                      </div>
                    </EditableBox>
                  );
                })}
          </div>

          <div className="flex justify-center reveal-item">
            <EditableBox
              k="home.services.cta.button"
              label="Explore services button"
              as="a"
              href="/services"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-white/10 bg-white/2 text-white font-bold text-xs uppercase tracking-widest transition-all hover:bg-white/5 hover:border-indigo-500/30 hover:scale-105 active:scale-95"
            >
              <EditableText k="home.services.cta.label">
                Explore All Services
              </EditableText>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </EditableBox>
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
            <EditableText
              k="home.method.1.title"
              as="h4"
              className="text-2xl font-black text-white tracking-tighter block"
            >
              Strategic Vision
            </EditableText>
            <EditableText
              k="home.method.1.body"
              as="p"
              className="text-slate-400 text-sm leading-relaxed font-medium block"
            >
              Blueprinting the architecture before a single line of code is
              written. Aligning technical decisions with core business
              objectives.
            </EditableText>
          </div>
          <div className="reveal-item space-y-4">
            <div className="text-5xl font-black text-white/80">02</div>
            <EditableText
              k="home.method.2.title"
              as="h4"
              className="text-2xl font-black text-white tracking-tighter block"
            >
              Precision Engineering
            </EditableText>
            <EditableText
              k="home.method.2.body"
              as="p"
              className="text-slate-400 text-sm leading-relaxed font-medium block"
            >
              Clean code, optimized algorithms, and modern stacks. Ensuring
              every component operates at peak performance.
            </EditableText>
          </div>
          <div className="reveal-item space-y-4">
            <div className="text-5xl font-black text-white/80">03</div>
            <EditableText
              k="home.method.3.title"
              as="h4"
              className="text-2xl font-black text-white tracking-tighter block"
            >
              Infinite Scale
            </EditableText>
            <EditableText
              k="home.method.3.body"
              as="p"
              className="text-slate-400 text-sm leading-relaxed font-medium block"
            >
              Deploying distributed systems built to grow securely with the
              business, utilizing robust containerization and CI/CD protocols.
            </EditableText>
          </div>
        </div>
      </section>

      {/* ================= SKILLS ================= */}
      <section
        id="skills"
        className="relative py-24 px-4 md:px-8 bg-transparent overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 relative">
          <div className="lg:col-span-5 h-auto relative z-10">
            <div className="lg:sticky lg:top-40 space-y-6 reveal-item">
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-px bg-indigo-400/50" />
                <EditableText k="home.skills.label">System Specs //</EditableText>
              </h2>
              <h3 className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mix-blend-screen">
                The <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-purple-400 to-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                  Arsenal.
                </span>
              </h3>
              <EditableText
                k="home.skills.body"
                as="p"
                className="text-lg text-slate-400 leading-relaxed font-medium mt-6 max-w-sm block"
              >
                Tools I use to build fast, scalable, and visually striking
                products. Not just languages, but fully integrated ecosystems.
              </EditableText>
            </div>
          </div>

          <div
            id="skills-cards-container"
            className="lg:col-span-7 flex flex-col gap-6 lg:gap-8 z-10 pb-20"
          >
            {skills.map((skill, idx) => {
              const Icon = skill.icon;
              return (
                <div
                  key={idx}
                  className="skill-card group relative bg-white/2 backdrop-blur-xl border border-white/8 p-8 md:p-10 rounded-4xl transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] overflow-hidden"
                  style={{
                    marginLeft: idx % 2 !== 0 ? "auto" : "0",
                    marginRight: idx % 2 === 0 ? "auto" : "0",
                    width: "100%",
                    maxWidth: "500px",
                  }}
                >
                  <div className="absolute inset-0 bg-linear-to-tl from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center gap-5">
                      <div className="size-16 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center text-indigo-400 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] group-hover:scale-110 group-hover:rotate-3 group-hover:text-indigo-300 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all duration-500">
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
                          className="px-4 py-2 rounded-xl bg-white/3 border border-white/5 text-[11px] font-bold text-slate-300 tracking-wider uppercase backdrop-blur-md group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 group-hover:text-white transition-all duration-300"
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

      {/* ================= READYMADE SOLUTIONS (stacked cards) ================= */}
      <ProjectsStack />

      {/* ================= PROJECTS (HORIZONTAL SCROLL) ================= */}
      <section
        id="projects"
        ref={triggerRef}
        className="h-screen pt-30 bg-transparent border-t border-white/5 relative z-10 flex items-center"
      >
        <div className="absolute top-14 left-0 w-full px-8 md:px-16 flex flex-col items-start z-30 pointer-events-none">
          <h2 className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] mb-2">
            <EditableText k="home.projects.label">Featured Work</EditableText>
          </h2>
          <EditableText
            k="home.projects.heading"
            as="h3"
            className="text-3xl md:text-5xl font-black text-white tracking-tighter block"
          >
            Projects That Actually Shipped.
          </EditableText>
        </div>

        {projectsLoading ? (
          <div className="flex gap-8 px-8 w-full overflow-hidden items-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard
                key={i}
                className="w-[86vw] sm:w-[68vw] md:w-[560px] lg:w-[600px] h-[56vh] sm:h-[52vh] md:h-[400px] shrink-0"
              />
            ))}
          </div>
        ) : (
          <div
            ref={horizontalRef}
            className="flex gap-8 px-8 min-w-max items-center"
          >
            {displayProjects.map((project) => (
              <div
                key={project._id}
                className="project-card w-[86vw] sm:w-[68vw] md:w-[560px] lg:w-[600px] h-[56vh] sm:h-[52vh] md:h-[400px] rounded-3xl border border-white/10 overflow-hidden bg-slate-900 relative group shadow-2xl shrink-0"
              >
                {project.media?.url && (
                  <img
                    src={project.media.url}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                    alt={project.title}
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {project.technologies?.slice(0, 5).map((t) => (
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

                    {(project.liveLink || project.githubLink) && (
                      <div className="flex items-center gap-3 pt-1">
                        {project.liveLink && (
                          <a
                            href={project.liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
                          >
                            <ExternalLink size={13} /> Live Demo
                          </a>
                        )}
                        {project.githubLink && (
                          <a
                            href={project.githubLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/20 bg-white/5 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                          >
                            <Github size={13} /> Source
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="w-[85vw] md:w-[400px] h-[50vh] md:h-[400px] rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center p-10 text-center space-y-6 shrink-0">
              <div className="size-16 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 ring-1 ring-white/10">
                <ArrowRight size={24} />
              </div>
              <h4 className="text-2xl font-black text-white uppercase tracking-tighter">
                See Everything
              </h4>
              <Link
                href="/projects"
                className="px-6 py-3 rounded-xl bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                All Projects
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ================= FEATURED PACKAGES ================= */}
      {(packagesLoading || featuredPackages.length > 0) && (
        <section
          id="pricing"
          className="py-32 px-4 md:px-8 bg-transparent border-t border-white/5 relative z-10"
        >
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-5">
              <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                <span className="w-8 h-px bg-indigo-400/50" />
                <EditableText k="home.pricing.label">Pricing // Packages</EditableText>
                <span className="w-8 h-px bg-indigo-400/50" />
              </h2>
              <EditableText
                k="home.pricing.heading"
                as="h3"
                className="text-4xl md:text-6xl font-black text-white tracking-tighter block"
              >
                Pick your launchpad.
              </EditableText>
              <EditableText
                k="home.pricing.body"
                as="p"
                className="text-lg text-slate-400 font-medium leading-relaxed block"
              >
                Three battle-tested packages — or ask for something fully
                custom.
              </EditableText>
            </div>

            {packagesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonPriceCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredPackages.map((pkg) => {
                  const hasDiscount =
                    pkg.discountPercent > 0 && pkg.discountedPrice < pkg.price;
                  return (
                    <EditableBox
                      key={pkg._id}
                      k="home.pricing.card"
                      label="Pricing card"
                      className={`pkg-card group relative rounded-4xl border bg-white/2 backdrop-blur-xl p-8 flex flex-col gap-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-15px_rgba(99,102,241,0.25)] ${
                        pkg.badge
                          ? "border-indigo-500/30 ring-1 ring-indigo-500/20"
                          : "border-white/8 hover:border-indigo-500/30"
                      }`}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                          {pkg.badge}
                        </div>
                      )}
                      <div>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">
                          {pkg.name}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {pkg.duration}
                        </p>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white tracking-tighter">
                          ${hasDiscount ? pkg.discountedPrice : pkg.price}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm font-bold text-slate-600 line-through">
                            ${pkg.price}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed line-clamp-2">
                        {pkg.description}
                      </p>
                      <ul className="space-y-2.5 flex-1">
                        {pkg.features?.slice(0, 4).map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs font-medium text-slate-400"
                          >
                            <span className="mt-0.5 size-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 text-[8px]">
                              ✓
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/packages/${pkg._id}`}
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] text-center transition-all duration-300 group-hover:bg-white group-hover:text-black"
                      >
                        View Details
                      </Link>
                    </EditableBox>
                  );
                })}
              </div>
            )}

            <div className="flex justify-center">
              <Link
                href="/packages"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-white/10 bg-white/2 text-white font-bold text-xs uppercase tracking-widest transition-all hover:bg-white/5 hover:border-indigo-500/30 hover:scale-105 active:scale-95"
              >
                Compare All Packages
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== Owner-added sections (template library) ===== */}
      <PageSections page="home" />

      {/* ================= CTA ================= */}
      <section
        id="contact"
        className="py-32 px-4 md:px-8 w-full text-center relative z-10 overflow-hidden bg-transparent"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_60%)]" />
        <div className="w-full mx-auto space-y-8 reveal-item pb-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-tight pb-2">
            <EditableText k="home.cta.heading.pre">Ready to</EditableText>{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 to-purple-500 italic pr-3">
              <EditableText k="home.cta.heading.highlight">initiate?</EditableText>
            </span>
          </h2>
          <EditableText
            k="home.cta.body"
            as="p"
            className="text-lg md:text-xl text-slate-400 font-medium max-w-xl mx-auto block"
          >
            Providing high-tier engineering solutions for visionary brands.
            Let's build the future together.
          </EditableText>
          <div className="pt-8">
            <EditableBox
              k="home.cta.button.box"
              label="Contact CTA button"
              as="a"
              href="/contact"
              className="inline-flex items-center justify-center bg-white text-slate-950 px-12 py-5 rounded-xl font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
            >
              <EditableText k="home.cta.button">Construct Connection</EditableText>
              <ArrowRight className="ml-3" size={16} />
            </EditableBox>
          </div>
        </div>
      </section>
    </main>
  );
}
