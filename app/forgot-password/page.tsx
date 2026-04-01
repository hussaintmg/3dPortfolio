"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [codePopup, setCodePopup] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const router = useRouter();
  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { scale: 0.95, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
    );
  }, []);
  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (token) {
          const res = await axios.post(`/api/auth/verify-token`, {
            token,
            type: "forgot",
          });
          if (!res.data.success) {
            router.push(`/forgot-password`);
          }
          setCodePopup(true);
        }
      } catch (error: any) {
        router.push(`/forgot-password`);
      }
    };
    fetchToken();
  }, [token]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/api/auth/forgot-password", {
        identifier: email,
      });
      if (res.data.success) {
        notify.success(res.data.message || "Code Sent Successfully", {
          description:
            res.data.desc || "Check your email for the verification code.",
        });
        router.push(`/forgot-password?token=${res.data.token}`);
      } else {
        notify.error(res.data.message || "Failed to send verification code", {
          description: res.data.desc || "Please try again later.",
        });
      }
    } catch (error: any) {
      notify.error(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
        {
          description: error.response?.data?.desc || "Please try again later.",
        },
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.length === 6 && codePopup && !loading) {
      verifyCode();
    }
  }, [code, codePopup]);

  const verifyCode = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/verify-code", {
        token,
        code,
      });
      if (res.data.success) {
        if (res.data.desc) {
          notify.success(res.data.message, res.data.desc);
        } else {
          notify.success(res.data.message);
        }
        router.push(`/reset-password?token=${res.data.token}`);
      } else {
        if (res.data.desc) {
          notify.error(res.data.message, res.data.desc);
        } else {
          notify.error(res.data.message);
        }
      }
    } catch (error: any) {
      notify.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10 opacity-0">
        <div className="bg-card/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-accent/5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeft size={14} /> Back to Identity Verification
          </Link>

          <div className="text-center space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent">
              <KeyRound size={12} /> Recovery Protocol
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Forgot{" "}
              <span className="italic text-transparent bg-clip-text bg-linear-to-r from-accent to-purple-400">
                Access Key.
              </span>
            </h1>
          </div>

          <form onSubmit={handleResetRequest} className="space-y-8">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-background hover:bg-accent hover:text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Initializing...
                </>
              ) : (
                <>
                  Send Recovery Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-10 text-[10px] text-gray-600 font-black uppercase tracking-tighter leading-relaxed">
            SYSTEM REMINDER: Recovery links are valid for 15 cycles only. Keep
            your node metadata secure.
          </p>
        </div>
      </div>

      {codePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with animation */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
            onClick={() => !loading && setCodePopup(false)}
          />

          {/* Modal Container */}
          <div className="relative z-50 w-full max-w-md animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header Section */}
              <div className="relative p-6 pb-0">
                {/* Decorative Element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -z-10" />

                {/* Icon & Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Enter Code
                  </h2>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mt-2">
                  Please enter the 6-digit verification code sent to your email
                </p>
              </div>

              {/* Content Section */}
              <div className="p-6 space-y-6">
                {/* Code Input with Auto-focus */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Verification Code
                  </label>

                  {/* OTP Input Style */}
                  <div className="flex gap-2 justify-between">
                    {[...Array(6)].map((_, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength={1}
                        className="w-full aspect-square text-center bg-background/50 border border-white/10 rounded-xl text-white text-2xl font-bold focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all placeholder:text-gray-600"
                        value={code[index] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !/^\d$/.test(val)) return;

                          const newCode = code.split("");
                          newCode[index] = val;
                          const updatedCode = newCode.join("").slice(0, 6);
                          setCode(updatedCode);

                          // Auto-focus next input
                          if (val && index < 5) {
                            const nextInput = document.querySelector(
                              `input[name="code-${index + 1}"]`,
                            );
                            if (nextInput)
                              (nextInput as HTMLInputElement).focus();
                          }
                        }}
                        onPaste={(e) => {
                          const pasteData = e.clipboardData
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          if (pasteData) {
                            setCode(pasteData);
                            // Focus appropriate input
                            const nextIndex = Math.min(pasteData.length, 5);
                            const nextInput = document.querySelector(
                              `input[name="code-${nextIndex}"]`,
                            );
                            if (nextInput)
                              (nextInput as HTMLInputElement).focus();
                          }
                          e.preventDefault();
                        }}
                        onKeyDown={(e) => {
                          // Handle backspace to go to previous input
                          if (
                            e.key === "Backspace" &&
                            !code[index] &&
                            index > 0
                          ) {
                            const prevInput = document.querySelector(
                              `input[name="code-${index - 1}"]`,
                            );
                            if (prevInput)
                              (prevInput as HTMLInputElement).focus();
                          }
                        }}
                        name={`code-${index}`}
                        autoFocus={index === 0}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    onClick={verifyCode}
                    className="w-full bg-white text-background hover:bg-accent hover:text-white rounded-xl py-3.5 font-bold text-sm uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Code
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodePopup(false)}
                    disabled={loading}
                    className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl py-3 font-medium text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>

                {/* Help Text */}
                <p className="text-center text-xs text-gray-500">
                  Didn't receive the code? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() =>
                      (window.location.href = "mailto:support@example.com")
                    }
                    className="text-accent hover:underline"
                  >
                    contact support
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="animate-spin text-accent" size={48} />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
