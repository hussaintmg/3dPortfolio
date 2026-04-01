"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, ArrowRight, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { scale: 0.95, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    );
  }, []);

  useEffect(() => {
    if (!token) {
      notify.error("Access key is missing. Re-verify encryption.");
      router.push("/forgot-password");
    }
    const verifyToken = async () => {
      try {
        const res = await axios.post("/api/auth/verify-token", {
          token,
          type: "reset",
        });
        if (!res.data.success) {
          notify.error(res.data.message);
          router.push("/forgot-password");
        }
      } catch (error) {
        notify.error("Failed to verify token");
        router.push("/forgot-password");
      }
    };
    verifyToken();
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      notify.error("Access keys mismatch. Re-verify encryption.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/reset-password", {
        token,
        password: formData.password,
      });
      if (!res.data.success) {
        notify.error(res.data.message || "Failed to reset password", {
          description: res.data.desc || "Please try again",
        });
        router.push("/forgot-password");
      }
      notify.success(
        res.data.message ||
        "Access key updated. Re-initializing identity Verification...",
        {
          description: res.data.desc || "Please login again",
        },
      );
      router.push("/login");
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || "Failed to reset password"
        : "Failed to reset password";
      const errorDesc = axios.isAxiosError(error)
        ? error.response?.data?.desc || "Please try again"
        : "Please try again";

      notify.error(errorMessage, {
        description: errorDesc,
      });
      router.push("/forgot-password");
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10 opacity-0">
        <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-accent/5">
          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
              <ShieldCheck size={12} /> Key Re-initialization
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Reset{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                Access Key.
              </span>
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              Update your node's access metadata with a new alphanumeric key.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                New Access Key
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                Confirm Access Key
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer bg-white text-background hover:bg-accent hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Re-initializing
                  Metadata...
                </>
              ) : (
                <>
                  Update Gateway Access <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-[10px] text-gray-600 font-black uppercase tracking-tighter leading-relaxed">
            SYSTEM REMINDER: Avoid using simple hashes. Use complex alphanumeric
            strings for maximum security.
          </p>
        </div>
      </div>
    </div>
  );
}
