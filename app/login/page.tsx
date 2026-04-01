"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { scale: 0.95, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    );
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/login", formData);

      if (res.data.success) {
        notify.success(res.data.message || "Access Granted", {
          description: res.data.desc || "Session initialized successfully.",
        });
        router.push("/dashboard");
      } else {
        notify.error(res.data.message || "Access Denied", {
          description: res.data.desc || "Session terminated.",
        });
      }
    } catch (error: any) {
      console.log(error);
      notify.error(error.response?.data?.message || "Protocol Breach", {
        description:
          error.response?.data?.desc || "Connection refused by host.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10 opacity-0">
        <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-accent/5">
          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
              <ShieldCheck size={12} /> Secure Protocol
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Verify{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                Identity.
              </span>
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                Username / Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="name@nexus.sh"
                  className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
            <Link
              href="/forgot-password"
              title="Initialize recovery protocol"
              className="text-[10px] font-bold text-accent hover:text-white transition-colors uppercase tracking-widest"
            >
              Forgot Key?
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 bg-white cursor-pointer text-background hover:bg-accent hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Verifying...
                </>
              ) : (
                <>
                  Login <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-xs text-gray-500">
            Don't have an Account?{" "}
            <Link
              href="/register"
              className="text-white font-bold hover:text-accent transition-colors"
            >
              Initialize Node
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
