"use client";

import { useEffect, useRef } from "react";
import { Check, ArrowRight, Zap, Target, Globe, Shield } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const packages = [
  {
    name: "Architect",
    price: "999",
    description: "Perfect for establishing a cinematic presence.",
    features: [
      "Custom 5-Page React/Next.js Architecture",
      "GSAP Motion Design & Interactivity",
      "Core SEO Optimization",
      "Standard Encryption (SSL)",
      "Global Deployment (Vercel/AWS)",
      "Source Code Ownership"
    ],
    icon: Target,
    accent: "indigo"
  },
  {
    name: "Enterprise",
    price: "2499",
    description: "Full-scale digital dominance for high-tier brands.",
    features: [
      "Unlimited Cinematic Sub-pages",
      "Advanced 3D/Three.js Integration",
      "Serverless Backend & API Infrastructure",
      "Elite CMS Integration",
      "DDoS Protection Layer",
      "24/7 Priority Ops Support"
    ],
    icon: Zap,
    accent: "accent",
    popular: true
  },
  {
    name: "Nexus Core",
    price: "4999",
    description: "The complete infrastructure for multi-node networks.",
    features: [
      "Modular Full-Stack Ecosystem",
      "Custom Dashboard & Admin Arrays",
      "Scalable Global Load Balancing",
      "Automated CI/CD Pipelines",
      "Multi-region Redundancy",
      "Lifetime Security Patches"
    ],
    icon: Shield,
    accent: "purple"
  }
];

export default function PackagesPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
        gsap.fromTo(".package-card", 
            { y: 50, opacity: 0 },
            { 
              y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: "power3.out",
              scrollTrigger: {
                trigger: ".packages-grid",
                start: "top 80%",
              }
            }
        );

        gsap.fromTo(".header-reveal",
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 1, ease: "power3.out", stagger: 0.2 }
        );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen pt-32 pb-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_70%)] -z-10" />

        {/* HEADER */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="header-reveal inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
            <Globe size={12} /> Global Rate Cards
          </div>
          <h1 className="header-reveal text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
            Select Your <br/>
            <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">Architecture.</span>
          </h1>
          <p className="header-reveal text-lg text-gray-400 font-medium leading-relaxed">
            Scalable blueprints tailored for your next digital expansion. Transparent pricing with performance-locked guarantees.
          </p>
        </div>

        {/* PRICING GRID */}
        <div className="packages-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
          {packages.map((pkg, idx) => {
            const Icon = pkg.icon;
            return (
              <div 
                key={idx} 
                className={`package-card opacity-0 relative group bg-card border border-white/5 rounded-[2.5rem] p-10 hover:border-accent/40 transition-all duration-700 hover:shadow-[0_0_50px_rgba(99,102,241,0.1)] hover:-translate-y-2 ${pkg.popular ? 'border-accent/30 ring-1 ring-accent/20' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                    Highest Demand
                  </div>
                )}
                
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500">
                      <Icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-white uppercase">{pkg.name}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pricing Model 0{idx+1}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-500">$</span>
                    <span className="text-6xl font-black text-white tracking-tighter">{pkg.price}</span>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-2">/ Deployment</span>
                  </div>

                  <p className="text-sm text-gray-400 font-medium leading-relaxed italic">
                    {pkg.description}
                  </p>

                  <div className="h-px bg-white/5 w-full" />

                  <ul className="space-y-4">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1 size-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                          <Check size={10} className="text-accent" />
                        </div>
                        <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors uppercase tracking-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="w-full mt-6 bg-white/5 hover:bg-white text-white hover:text-background border border-white/10 hover:border-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 group-hover:shadow-xl">
                    Initialize Protocol <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
