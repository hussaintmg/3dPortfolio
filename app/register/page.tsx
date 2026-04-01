"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { scale: 0.95, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    );
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (
      formData.password !== formData.confirmPassword &&
      formData.password.slice(6) !== formData.confirmPassword
    ) {
      notify.error("Validation Error", {
        description: "Passwords do not match.",
      });
      setLoading(false);
      return;
    }
    try {
      const res = await axios.post("/api/auth/register", formData);

      if (res.data.success) {
        notify.success(res.data.message || "Node Initialized", {
          description: res.data.desc || "Your account has been created.",
        });
        router.push("/dashboard");
      } else {
        notify.error("Registration Failed", { description: res.data.message });
      }
    } catch (error: any) {
      console.log(error);
      notify.error(error.response?.data?.message || "System Error", {
        description: error.response?.data?.desc || "Deployment failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10 opacity-0">
        <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-accent/5">
          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
              <ShieldCheck size={12} /> Registration Portal
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter leading-tight">
              Initialize{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                Node.
              </span>
            </h1>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1"
              >
                Username
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  id="username"
                  placeholder="John Doe"
                  className="w-full bg-background/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1"
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  id="email"
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
              <label
                htmlFor="password"
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  id="password"
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
              <p className="text-[9px] text-gray-600 ml-1 uppercase font-bold tracking-widest">
                MIN: 8 CHARS // ALPHANUMERIC REQUIRED
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1"
              >
                Confirm Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  id="confirmPassword"
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
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors"
                >
                  {showConfirmPassword ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-background hover:bg-accent hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Deploying...
                </>
              ) : (
                <>
                  Register <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-xs text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white font-bold hover:text-accent transition-colors"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
