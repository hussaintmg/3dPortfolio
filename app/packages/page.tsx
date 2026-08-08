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

export default function PackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);

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
