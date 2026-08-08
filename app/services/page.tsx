"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
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
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import EditableText from "@/Components/editable/EditableText";
import PageSections from "@/Components/sections/PageSections";
import { Skeleton } from "@/Components/ui/Skeleton";

interface Service {
  _id: string;
  name: string;
  description: string;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
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

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/services")
      .then((res) => {
        if (alive && res.data.success) setServices(res.data.services || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const displayServices = services.length > 0 ? services : demoServices;

  return (
    <div className="min-h-screen bg-transparent text-slate-200 pt-36 pb-24 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 size-[500px] bg-indigo-500/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 size-[500px] bg-purple-500/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em]">
            <Briefcase size={12} />
            <EditableText k="services.badge">Capabilities</EditableText>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.05]">
            <EditableText k="services.heading.pre">Services built for</EditableText>{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400 italic">
              <EditableText k="services.heading.highlight">impact.</EditableText>
            </span>
          </h1>
          <EditableText
            k="services.subheading"
            as="p"
            className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed block"
          >
            AI engineering and modern web development under one roof — designed,
            built, deployed and maintained end to end.
          </EditableText>
        </motion.div>

        {/* Services grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-4xl border border-white/5 bg-white/2 p-10 space-y-5"
              >
                <Skeleton className="size-16 rounded-2xl" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayServices.map((service, i) => {
              const Icon = iconMap[service.icon] || Briefcase;
              return (
                <motion.article
                  key={service._id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={fadeUp}
                  className="group relative rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-10 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_25px_50px_-15px_rgba(99,102,241,0.25)]"
                >
                  <div className="absolute inset-0 bg-linear-to-tl from-indigo-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="absolute -top-20 -right-20 size-40 bg-indigo-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10 space-y-6">
                    <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:rotate-3 group-hover:text-indigo-300 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] transition-all duration-500">
                      <Icon size={30} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      {service.name}
                    </h2>
                    <p className="text-slate-400 leading-relaxed font-medium">
                      {service.description}
                    </p>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 text-[11px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300"
                    >
                      Discuss this service
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Process strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-8"
        >
          {[
            { n: "01", t: "Discover", d: "Understand the problem, users and constraints." },
            { n: "02", t: "Design", d: "Architecture, data models and interface direction." },
            { n: "03", t: "Build", d: "Ship in fast iterations with constant feedback." },
            { n: "04", t: "Scale", d: "Deploy, monitor, optimize and grow safely." },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-3xl border border-white/5 bg-white/2 p-7 space-y-3 hover:border-indigo-500/20 transition-colors"
            >
              <div className="text-4xl font-black text-white/20">{step.n}</div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {step.t}
              </h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                {step.d}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Owner-added sections */}
        <PageSections page="services" />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pt-8 space-y-6"
        >
          <EditableText
            k="services.cta.heading"
            as="h3"
            className="text-3xl md:text-5xl font-black text-white tracking-tighter block"
          >
            Need something custom?
          </EditableText>
          <EditableText
            k="services.cta.body"
            as="p"
            className="text-slate-400 font-medium max-w-xl mx-auto block"
          >
            Every serious product starts with a conversation. Tell me what you
            are building and I'll tell you exactly how I can help.
          </EditableText>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
          >
            Get a Quote <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
