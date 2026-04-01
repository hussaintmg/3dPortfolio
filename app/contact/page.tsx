"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Send, User, MessageSquare, Loader2, Sparkles, MapPin, Phone } from "lucide-react";
import { gsap } from "gsap";
import { notify } from "@/lib/notify";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftSideRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Split layout entrance animations
      gsap.fromTo(
        leftSideRef.current?.children || [],
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );

      gsap.fromTo(
        ".form-element",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, delay: 0.2, ease: "power2.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fetchPromise = async () => {
      const resp = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await resp.json();
      if (!data.success) throw new Error(data.message || "Something went wrong.");

      setFormData({ name: "", email: "", message: "" });
      return data;
    };

    try {
        await notify.promise(fetchPromise(), {
        loading: "Transmitting protocol...",
        success: "Connection established. Message sent successfully.",
        error: (err: any) => err.message || "Failed to establish connection.",
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen pt-32 pb-24 px-4 md:px-8 flex items-center justify-center bg-background text-foreground selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Cinematic Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-linear-to-tr from-indigo-900/20 to-purple-900/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 relative z-10">
        
        {/* LEFT: TEXT */}
        <div ref={leftSideRef} className="flex flex-col justify-center space-y-10">
          <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-black uppercase text-indigo-400 backdrop-blur-md tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <Sparkles size={12} /> Secure Channel
              </div>
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white leading-[1.05]">
                Initiate <br/>
                <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400 italic pr-2">Connection.</span>
              </h1>
          </div>
          
          <p className="text-xl text-gray-400 font-medium leading-relaxed max-w-md">
            Deploying a new architecture, or need to optimize an existing stack? Drop a transmission into my terminal and I'll route back to you.
          </p>

          <div className="space-y-4 pt-8 border-t border-white/5">
              <div className="flex items-center gap-4 text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer group w-max">
                  <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-colors">
                      <Mail size={18} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Comms Link</p>
                      <p className="text-sm font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">hello@genesis-portal.dev</p>
                  </div>
              </div>
              <div className="flex items-center gap-4 text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer group w-max">
                  <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-colors">
                      <MapPin size={18} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Location Array</p>
                      <p className="text-sm font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors">San Francisco, CA</p>
                  </div>
              </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className="flex flex-col justify-center">
            <div className="bg-card rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden group/card shadow-[0_0_50px_rgba(99,102,241,0.05)] hover:shadow-[0_0_50px_rgba(99,102,241,0.1)] hover:border-white/10 transition-all duration-700">
                <div className="absolute inset-0 bg-linear-to-b from-white/[0.02] to-transparent pointer-events-none" />
                
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 relative z-10 w-full">
                {/* NAME INPUT */}
                <div className="relative form-element pt-3">
                    <input
                        type="text"
                        id="name"
                        required
                        className="peer w-full border-b border-white/10 bg-transparent py-4 pl-12 pr-4 text-white placeholder-transparent focus:border-indigo-500 focus:outline-none transition-colors font-bold text-sm"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <label 
                        htmlFor="name" 
                        className="absolute left-12 top-0 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-600 peer-placeholder-shown:font-medium peer-focus:top-0 peer-focus:text-[10px] peer-focus:font-black peer-focus:text-indigo-400"
                    >
                        Identity Name
                    </label>
                    <div className="absolute left-0 top-5 text-gray-600 peer-focus:text-indigo-400 transition-colors peer-focus:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
                        <User size={20} />
                    </div>
                    {/* Animated Glow underline */}
                    <div className="absolute bottom-0 left-0 h-[2px] bg-linear-to-r from-indigo-500 to-purple-500 w-0 peer-focus:w-full transition-all duration-500 ease-out" />
                </div>

                {/* EMAIL INPUT */}
                <div className="relative form-element pt-3">
                    <input
                        type="email"
                        id="email"
                        required
                        className="peer w-full border-b border-white/10 bg-transparent py-4 pl-12 pr-4 text-white placeholder-transparent focus:border-indigo-500 focus:outline-none transition-colors font-bold text-sm"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <label 
                        htmlFor="email" 
                        className="absolute left-12 top-0 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-600 peer-placeholder-shown:font-medium peer-focus:top-0 peer-focus:text-[10px] peer-focus:font-black peer-focus:text-indigo-400"
                    >
                        Comms Address
                    </label>
                    <div className="absolute left-0 top-5 text-gray-600 peer-focus:text-indigo-400 transition-colors peer-focus:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
                        <Mail size={20} />
                    </div>
                    {/* Animated Glow underline */}
                    <div className="absolute bottom-0 left-0 h-[2px] bg-linear-to-r from-indigo-500 to-purple-500 w-0 peer-focus:w-full transition-all duration-500 ease-out" />
                </div>

                {/* MESSAGE INPUT */}
                <div className="relative form-element pt-3">
                    <textarea
                        id="message"
                        required
                        rows={4}
                        className="peer w-full border-b border-white/10 bg-transparent py-4 pl-12 pr-4 text-white placeholder-transparent focus:border-indigo-500 focus:outline-none transition-colors font-bold text-sm resize-none custom-scrollbar"
                        placeholder="Transmission body..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                    <label 
                        htmlFor="message" 
                        className="absolute left-12 top-0 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-600 peer-placeholder-shown:font-medium peer-focus:top-0 peer-focus:text-[10px] peer-focus:font-black peer-focus:text-indigo-400"
                    >
                        Transmission Payload
                    </label>
                    <div className="absolute left-0 top-5 text-gray-600 peer-focus:text-indigo-400 transition-colors peer-focus:drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
                        <MessageSquare size={20} />
                    </div>
                    {/* Animated Glow underline */}
                    <div className="absolute bottom-1 left-0 h-[2px] bg-linear-to-r from-indigo-500 to-purple-500 w-0 peer-focus:w-full transition-all duration-500 ease-out" />
                </div>

                {/* SUBMIT BUTTON */}
                <button
                    type="submit"
                    disabled={loading}
                    className="form-element group relative flex w-full items-center justify-center space-x-3 rounded-2xl bg-white/10 hover:bg-white border border-white/20 hover:border-white py-5 text-xs font-black text-white hover:text-black hover:scale-[1.02] active:scale-95 shadow-xl transition-all uppercase tracking-widest overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Transmitting...</span>
                        </>
                    ) : (
                        <>
                            <span className="relative z-10">Send Data Packet</span>
                            <Send size={16} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-in-out" />
                        </>
                    )}
                </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}
