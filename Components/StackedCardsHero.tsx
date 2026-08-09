"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import EditableText from "@/Components/editable/EditableText";
import EditableBox from "@/Components/editable/EditableBox";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

export default function StackedCardsHero() {
  return (
    <section className="relative w-full bg-transparent text-white overflow-visible pt-16">
      {/* Subtle Background Effects */}
      <div
        className="absolute inset-0 z-[-2] opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'url(\'data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E\')',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[600px] bg-linear-to-b from-blue-900/10 via-purple-900/5 to-transparent pointer-events-none -z-10 blur-3xl opacity-50" />
      <div className="absolute top-1/4 left-1/4 size-[500px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 size-[500px] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none -z-10 mix-blend-screen" />

      <div className="min-h-[90vh] flex items-center justify-center py-12 lg:py-0">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center z-10 px-6 md:px-12 h-full">
          {/* LEFT: TEXT */}
          <div className="flex flex-col items-start text-left space-y-6 lg:space-y-8 order-1 relative z-20 pointer-events-auto shrink-0">
            <div
              style={{ "--hero-i": 0 } as React.CSSProperties}
              className="hero-anim hero-fallback inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[10px] font-bold text-blue-300 backdrop-blur-md uppercase tracking-[0.2em]"
            >
              <Sparkles size={12} className="text-blue-400" />
              <EditableText k="home.hero.badge">
                AI Engineer · Full-Stack Web Developer
              </EditableText>
            </div>

            {/*
              The page's one H1, and the strongest on-page ranking signal there
              is. It used to read "Designing and building high-performance web
              systems." — no name, no job title, nothing anybody searches for.
              A search engine had no way to connect this page to "Hussain" or
              to "web developer", and it duly connected it to neither.
            */}
            <h1
              style={{ "--hero-i": 1 } as React.CSSProperties}
              className={`hero-anim hero-fallback text-4xl sm:text-5xl md:text-6xl lg:text-[3.6rem] font-bold tracking-tight leading-[1.1] text-white/95 ${spaceGrotesk.className}`}
            >
              <EditableText k="home.hero.heading.pre">
                Hussain —
              </EditableText>{" "}
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
                <EditableText k="home.hero.heading.highlight">
                  AI Engineer
                </EditableText>
              </span>{" "}
              <EditableText k="home.hero.heading.tail">
                &amp; Full-Stack Web Developer
              </EditableText>
            </h1>

            <p
              style={{ "--hero-i": 2 } as React.CSSProperties}
              className="hero-anim hero-fallback text-base md:text-lg lg:text-xl text-slate-400 max-w-xl font-normal leading-relaxed"
            >
              <EditableText k="home.hero.subheading">
                I build fast, scalable web applications with Next.js, React and
                Node.js, and wire real AI — assistants, retrieval, automation —
                into products people actually use. Available worldwide for
                freelance and contract work.
              </EditableText>
            </p>

            <div
              style={{ "--hero-i": 3 } as React.CSSProperties}
              className="hero-anim hero-fallback flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto"
            >
              <EditableBox
                k="home.hero.cta1.button"
                label="Primary CTA button"
                as="a"
                href="#projects"
                className="group relative w-full sm:w-auto px-8 py-4 rounded-md bg-white text-black font-bold text-sm tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 flex justify-center items-center shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <EditableText k="home.hero.cta1">View Work</EditableText>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </EditableBox>

              <EditableBox
                k="home.hero.cta2.button"
                label="Secondary CTA button"
                as="a"
                href="/contact"
                className="group relative w-full sm:w-auto px-8 py-4 rounded-md border border-white/10 bg-transparent text-white font-medium text-sm tracking-wide transition-all duration-300 hover:bg-white/5 hover:border-white/20 hover:scale-105 active:scale-95 flex justify-center items-center"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <EditableText k="home.hero.cta2">Get in Touch</EditableText>
                </span>
              </EditableBox>
            </div>
          </div>

          {/* RIGHT: 3D Scene lives in the global background */}
          <div className="relative w-full h-[300px] lg:h-[600px] order-2 z-10 pointer-events-none mt-8 lg:mt-0" />
        </div>
      </div>
    </section>
  );
}
