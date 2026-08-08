"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FloatingInput from "@/Components/ui/FloatingInput";
import EditableText from "@/Components/editable/EditableText";
import PasskeyButton from "@/Components/auth/PasskeyButton";
import { useSite } from "@/context/SiteContext";
import { Construction } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSite();
  const underMaintenance = searchParams?.get("maintenance") === "1";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/login", formData);

      if (res.data.success) {
        notify.success(res.data.message || "Access Granted", {
          description: res.data.desc || "Session initialized successfully.",
        });
        // Clients land in their portal, staff in the dashboard
        router.push(res.data.user?.role === "user" ? "/portal" : "/dashboard");
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
          {underMaintenance && (
            <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
              <Construction size={17} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                  Site under maintenance
                </p>
                <p className="text-xs text-gray-300 font-medium mt-1 leading-relaxed">
                  {settings.maintenanceMessage ||
                    "We're putting the finishing touches on something great."}
                </p>
              </div>
            </div>
          )}

          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
              <ShieldCheck size={12} />
              <EditableText k="login.badge">Secure Protocol</EditableText>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              <EditableText k="login.heading.pre">Verify</EditableText>{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                <EditableText k="login.heading.highlight">Identity.</EditableText>
              </span>
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <FloatingInput
              label="Username / Email"
              type="text"
              required
              icon={<Mail size={18} />}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            <FloatingInput
              label="Password"
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
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
              className="w-full mt-5 bg-white text-background hover:bg-accent hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
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

          <div className="mt-7">
            <PasskeyButton />
          </div>

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin text-accent" size={48} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
