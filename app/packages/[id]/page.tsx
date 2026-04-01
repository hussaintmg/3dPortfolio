"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MessageCircle,
  ArrowLeft,
  CreditCard,
  Globe,
  Wallet,
  ChevronRight,
  Loader2,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

interface PackageMedia {
  url: string;
  type: "image" | "video";
}

interface Package {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  duration: string;
  features: string[];
  media: PackageMedia[];
  isCustom: boolean;
  createdAt: string;
}

export default function PackageDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { id } = use(params);

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const fetchPackage = async () => {
    try {
      const resp = await axios.get("/api/packages");
      if (resp.data.success) {
        const found = resp.data.packages.find((p: Package) => p._id === id);
        setPkg(found || null);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackage();
  }, [id]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-[#050505] p-6 text-center flex-col gap-6">
        <h2 className="text-3xl font-bold">Package Not Found</h2>
        <p className="text-gray-500 max-w-md">
          The service package you're looking for might have been moved or
          removed.
        </p>
        <Link
          href="/packages"
          className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-8 py-3 font-bold hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={18} /> Back to Packages
        </Link>
      </div>
    );
  }

  const handleContact = () => {
    if (!user) {
      router.push(`/login?redirect=/packages/${id}`);
      return;
    }
    router.push(
      `/dashboard/chat?packageId=${pkg._id}&packageName=${encodeURIComponent(pkg.name)}`,
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] py-32 px-6 sm:px-12 mt-10">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/packages"
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-all mb-12 group font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
          Back to all packages
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Images */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 group"
            >
              {pkg.media.length > 0 ? (
                pkg.media[activeImage].type === "video" ? (
                  <video
                    key={pkg.media[activeImage].url}
                    controls
                    className="w-full h-full object-cover"
                  >
                    <source src={pkg.media[activeImage].url} />
                  </video>
                ) : (
                  <img
                    src={pkg.media[activeImage].url}
                    alt={pkg.name}
                    className="w-full h-full object-cover group-hover:scale-105 duration-700 transition-transform"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-700 italic">
                  No media preview
                </div>
              )}
            </motion.div>

            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {pkg.media.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative min-w-[120px] aspect-video rounded-xl overflow-hidden border-2 transition-all group ${activeImage === idx ? "border-blue-500" : "border-white/5 opacity-50 hover:opacity-100 hover:border-white/20"}`}
                >
                  {m.type === "video" ? (
                    <div className="w-full h-full bg-blue-600/10 flex items-center justify-center text-blue-500">
                      <Sparkles size={16} />
                    </div>
                  ) : (
                    <img
                      src={m.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-10">
            <div>
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] font-bold bg-blue-600/10 text-blue-500 px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-500/20">
                  Official Bundle
                </span>
                {pkg.discountPercent > 0 && (
                  <span className="text-[10px] font-bold bg-red-600/10 text-red-500 px-3 py-1 rounded-full uppercase tracking-tighter border border-red-500/20">
                    {pkg.discountPercent}% Saving
                  </span>
                )}
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-white tracking-tight">
                {pkg.name}
              </h1>
              <p className="mt-6 text-lg text-gray-400 leading-relaxed font-medium">
                {pkg.description}
              </p>

              <div className="mt-8 flex items-baseline gap-4">
                <span className="text-5xl lg:text-7xl font-extrabold text-blue-500">
                  ${Math.round(pkg.discountedPrice)}
                </span>
                {pkg.discountPercent > 0 && (
                  <span className="text-2xl text-gray-600 line-through decoration-red-500/50">
                    ${pkg.price}
                  </span>
                )}
              </div>
              <p className="mt-4 text-gray-500 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-blue-500" />
                Typical turnaround:{" "}
                <span className="text-gray-300 ml-1">{pkg.duration}</span>
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-600">
                Core Inclusions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pkg.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 border border-white/5 px-6 py-4 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <CheckCircle2
                      className="text-blue-500 shrink-0"
                      size={18}
                    />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-3xl border border-white/10 bg-black/20 p-8 lg:p-10 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 size-36 rounded-full bg-blue-600/5 blur-3xl pointer-events-none group-hover:bg-blue-600/10 transition-all" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-8 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-500" />
                Payment & Billing
              </h3>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 shrink-0">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">Local (Pakistan)</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      EasyPaisa, JazzCash, or Direct Bank Transfer settlement.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pt-8 border-t border-white/5">
                  <div className="size-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shrink-0">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">
                      International Clients
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Pricing and payment channel discussed on per-project
                      basis.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {pkg.isCustom ? (
              <Link
                href="/dashboard/chat"
                className="group relative flex w-full items-center justify-center gap-4 rounded-3xl bg-purple-600 py-6 text-xl font-bold text-white transition-all hover:bg-purple-700 active:scale-95 shadow-2xl shadow-purple-500/25"
              >
                <MessageCircle
                  size={28}
                  className="transition-transform group-hover:rotate-12"
                />
                Request Custom Quote
                <ChevronRight
                  size={24}
                  className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1"
                />
              </Link>
            ) : (
              <button
                onClick={handleContact}
                className="group relative flex w-full items-center justify-center gap-4 rounded-3xl bg-blue-600 py-6 text-xl font-bold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-2xl shadow-blue-500/25"
              >
                <MessageCircle
                  size={28}
                  className="transition-transform group-hover:rotate-12"
                />
                Contact Designer
                <ChevronRight
                  size={24}
                  className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1"
                />
              </button>
            )}

            <p className="text-center text-[10px] text-gray-700 font-bold uppercase tracking-widest">
              Secure Discussion Guaranteed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
