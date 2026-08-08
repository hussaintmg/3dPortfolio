"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useRouter } from "next/navigation";
import FloatingInput from "@/Components/ui/FloatingInput";
import EditableText from "@/Components/editable/EditableText";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
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
              <ShieldCheck size={12} />
              <EditableText k="register.badge">Registration Portal</EditableText>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter leading-tight">
              <EditableText k="register.heading.pre">Initialize</EditableText>{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                <EditableText k="register.heading.highlight">Node.</EditableText>
              </span>
            </h1>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <FloatingInput
              label="Username"
              type="text"
              required
              id="username"
              icon={<User size={18} />}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />

            <FloatingInput
              label="Email Address"
              type="email"
              required
              id="email"
              icon={<Mail size={18} />}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            <div className="space-y-2">
              <FloatingInput
                label="Password"
                type="password"
                required
                id="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <p className="text-[9px] text-gray-600 ml-1 uppercase font-bold tracking-widest">
                MIN: 8 CHARS // ALPHANUMERIC REQUIRED
              </p>
            </div>

            <FloatingInput
              label="Confirm Password"
              type="password"
              required
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmPassword: e.target.value,
                })
              }
            />

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
