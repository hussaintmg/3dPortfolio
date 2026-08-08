"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Globe, Package as PackageIcon, Sparkles, MessageSquare } from "lucide-react";
import axios from "axios";
import EditableText from "@/Components/editable/EditableText";
import PageSections from "@/Components/sections/PageSections";
import { Skeleton } from "@/Components/ui/Skeleton";

export interface Pkg {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  duration: string;
  features: string[];
  media?: { url: string; type: string }[];
  badge?: string;
  featured?: boolean;
  order?: number;
  isCustom?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/** A ready-made solution the owner has put a price on. */
interface PricedSolution {
  _id: string;
  title: string;
  technologies?: string[];
  media?: { url: string };
  price: number | null;
  currency?: string;
  deliveryNote?: string;
  summary?: string;
  features?: string[];
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricedSolutions, setPricedSolutions] = useState<PricedSolution[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    axios
      .get("/api/packages")
      .then((res) => {
        if (alive && res.data.success) {
          setPackages(
            (res.data.packages || []).filter((p: Pkg) => !p.isCustom),
          );
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));

    // Only solutions with a price belong here — the rest stay portfolio-only
    axios
      .get("/api/readymade-solutions")
      .then((res) => {
        if (!alive || !res.data.success) return;
        setPricedSolutions(
          (res.data.solutions || []).filter(
            (s: PricedSolution) => typeof s.price === "number" && s.price > 0,
          ),
        );
      })
      .catch(() => {})
      .finally(() => alive && setSolutionsLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto space-y-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.05),transparent_70%)] -z-10" />

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-6 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
            <Globe size={12} />
            <EditableText k="packages.badge">Global Rate Cards</EditableText>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
            <EditableText k="packages.heading.pre">Select Your</EditableText>{" "}
            <br />
            <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
              <EditableText k="packages.heading.highlight">Architecture.</EditableText>
            </span>
          </h1>
          <EditableText
            k="packages.subheading"
            as="p"
            className="text-lg text-gray-400 font-medium leading-relaxed block"
          >
            Scalable blueprints tailored for your next digital expansion.
            Transparent pricing with performance-locked guarantees.
          </EditableText>
        </motion.div>

        {/* PRICING GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-white/5 rounded-[2.5rem] p-10 space-y-8"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-14 w-40" />
                <Skeleton className="h-4 w-full" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-3.5 w-full" />
                  ))}
                </div>
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : packages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 rounded-4xl border border-dashed border-white/10 bg-white/2 space-y-6"
          >
            <div className="size-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <PackageIcon size={28} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">
                Packages coming soon
              </h3>
              <p className="text-gray-400 font-medium max-w-md mx-auto">
                Custom pricing is being prepared. Tell me what you need and
                I'll build a package around it.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent text-white font-black text-[11px] uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
            >
              Get a Custom Quote <ArrowRight size={14} />
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
            {packages.map((pkg, idx) => {
              const hasDiscount =
                pkg.discountPercent > 0 && pkg.discountedPrice < pkg.price;
              return (
                <motion.div
                  key={pkg._id}
                  custom={idx}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={fadeUp}
                  className={`relative group bg-card border rounded-[2.5rem] p-10 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(99,102,241,0.12)] flex flex-col ${
                    pkg.badge
                      ? "border-accent/30 ring-1 ring-accent/20"
                      : "border-white/5 hover:border-accent/40"
                  }`}
                >
                  {pkg.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      {pkg.badge}
                    </div>
                  )}

                  <div className="space-y-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500">
                        <Sparkles size={26} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black tracking-tight text-white uppercase">
                          {pkg.name}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {pkg.duration}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {hasDiscount && (
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-600 line-through">
                            ${pkg.price}
                          </span>
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 uppercase tracking-widest">
                            Save {pkg.discountPercent}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-gray-500">$</span>
                        <span className="text-6xl font-black text-white tracking-tighter">
                          {hasDiscount ? pkg.discountedPrice : pkg.price}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 font-medium leading-relaxed line-clamp-3">
                      {pkg.description}
                    </p>

                    <div className="h-px bg-white/5 w-full" />

                    <ul className="space-y-4 flex-1">
                      {pkg.features?.slice(0, 6).map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-1 size-4 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                            <Check size={10} className="text-accent" />
                          </div>
                          <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200 transition-colors tracking-tight">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {pkg.features?.length > 6 && (
                        <li className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-7">
                          +{pkg.features.length - 6} more included
                        </li>
                      )}
                    </ul>

                    <div className="flex flex-col gap-3">
                      <Link
                        href={`/packages/${pkg._id}`}
                        className="w-full bg-white/5 hover:bg-white text-white hover:text-background border border-white/10 hover:border-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center justify-center gap-2 group-hover:shadow-xl"
                      >
                        View Details <ArrowRight size={14} />
                      </Link>
                      <Link
                        href="/portal/chat"
                        className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-accent transition-colors py-2"
                      >
                        Discuss This Package
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Ready-made solutions that carry a price */}
        {(solutionsLoading || pricedSolutions.length > 0) && (
          <section className="space-y-8 pt-6">
            <div className="text-center space-y-3">
              <EditableText
                k="packages.solutions.label"
                as="p"
                className="text-[10px] font-black text-accent uppercase tracking-[0.35em] block"
              >
                Off the shelf
              </EditableText>
              <EditableText
                k="packages.solutions.heading"
                as="h2"
                className="text-3xl md:text-4xl font-black text-white tracking-tighter block"
              >
                Ready-made solutions
              </EditableText>
              <EditableText
                k="packages.solutions.body"
                as="p"
                className="text-sm text-gray-400 font-medium max-w-xl mx-auto block"
              >
                Already built, already tested. Buy one as-is and skip the build
                time entirely.
              </EditableText>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {solutionsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[26rem] rounded-[2rem]" />
                  ))
                : pricedSolutions.map((s, idx) => (
                    <motion.div
                      key={s._id}
                      custom={idx}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: "-60px" }}
                      variants={fadeUp}
                      className="group relative flex flex-col rounded-[2rem] border border-white/8 bg-card overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40"
                    >
                      <div className="relative h-44 overflow-hidden bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.media?.url}
                          alt={s.title}
                          loading="lazy"
                          className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-75 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-card via-card/40 to-transparent" />
                        {s.deliveryNote && (
                          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-200">
                            {s.deliveryNote}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col p-6 space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">
                            {s.title}
                          </h3>
                          {s.summary && (
                            <p className="text-xs text-gray-400 font-medium mt-1.5 leading-relaxed line-clamp-2">
                              {s.summary}
                            </p>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[11px] font-black text-gray-500 uppercase">
                            {s.currency || "USD"}
                          </span>
                          <span className="text-4xl font-black text-white tracking-tighter">
                            {s.price?.toLocaleString()}
                          </span>
                        </div>

                        {!!s.features?.length && (
                          <ul className="space-y-2 flex-1">
                            {s.features.slice(0, 4).map((f) => (
                              <li key={f} className="flex items-start gap-2.5">
                                <div className="mt-0.5 size-3.5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                                  <Check size={8} className="text-accent" />
                                </div>
                                <span className="text-[11px] font-medium text-gray-400">
                                  {f}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {!!s.technologies?.length && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.technologies.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-gray-500"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <Link
                          href="/portal/chat"
                          className="mt-auto w-full bg-white/5 hover:bg-accent border border-white/10 hover:border-accent text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                        >
                          Buy this <ArrowRight size={13} />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
            </div>
          </section>
        )}

        {/* Custom quote strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-10 md:p-14 text-center space-y-5"
        >
          <EditableText
            k="packages.custom.heading"
            as="h3"
            className="text-3xl md:text-4xl font-black text-white tracking-tighter block"
          >
            Need something that doesn't fit a box?
          </EditableText>
          <EditableText
            k="packages.custom.body"
            as="p"
            className="text-gray-400 font-medium max-w-xl mx-auto block"
          >
            Every serious project is different. No fixed pricing here — chat
            with me directly and I'll design a custom package just for you.
          </EditableText>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/portal/chat"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
            >
              <MessageSquare size={15} /> Chat With Me
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl border border-white/10 bg-white/5 text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-white/10 active:scale-95"
            >
              Send an Enquiry <ArrowRight size={15} />
            </Link>
          </div>
        </motion.div>

        {/* Owner-added sections */}
        <PageSections page="packages" />
      </div>
    </div>
  );
}
