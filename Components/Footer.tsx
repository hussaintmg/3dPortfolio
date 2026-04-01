"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, Loader2 } from "lucide-react";
import { FaGithub, FaLinkedin, FaFacebook, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { webData } from "../constants/webData";
import { homeLinks } from "../constants/navigation";
import React, { useState } from "react";
import axios from "axios";
import { useToast } from "../Components/toast";

const iconMap: Record<string, { Icon: any; color: string }> = {
  Github: { Icon: FaGithub, color: "hover:text-white" },
  Linkedin: { Icon: FaLinkedin, color: "hover:text-[#0077b5]" },
  Twitter: { Icon: FaXTwitter, color: "hover:text-white" },
  Instagram: {
    Icon: (props: any) => (
      <FaInstagram
        {...props}
        className={`${props.className} hover:fill-[url(#ig-gradient)]!`}
      />
    ),
    color: "",
  },
  Facebook: { Icon: FaFacebook, color: "hover:text-[#1877f2]" },
};

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  if (pathname && pathname.startsWith("/dashboard")) return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const resp = await axios.post("/api/subscribe", { email });
      if (resp.data.success) {
        if (resp.data.existed) {
          toast.info("You're already on the list! We'll stay in touch.");
        } else {
          toast.success("Welcome aboard! Digital transformation starting now.");
          setEmail("");
        }
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Transmission failed. Try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-card border-t border-white/5 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px] pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-t from-indigo-500/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-10 relative z-10">
        {/* Hidden SVG Gradient Definitions */}
        <svg width="0" height="0" className="absolute invisible">
          <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop stopColor="#FCAF45" offset="0%" />
            <stop stopColor="#F56040" offset="20%" />
            <stop stopColor="#FD1D1D" offset="40%" />
            <stop stopColor="#E1306C" offset="60%" />
            <stop stopColor="#C13584" offset="80%" />
            <stop stopColor="#833AB4" offset="100%" />
          </linearGradient>
        </svg>

        {/* Main footer grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand Section */}
          <div className="space-y-6 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block group">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white italic">
                Genesis{" "}
                <span className="text-indigo-400 underline decoration-indigo-500/30 underline-offset-4 group-hover:decoration-indigo-400 transition-all">
                  Lab
                </span>
              </h2>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed font-medium max-w-sm">
              Architecting modern web solutions with precision engineering and
              world-class design aesthetics at global scale.
            </p>
            <div className="flex gap-6 pt-2">
              {webData.footer.socials.map((social) => {
                const iconData = iconMap[social.icon] || iconMap.Github;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-gray-400 transition-all duration-300 hover:scale-120 ${iconData.color}`}
                    aria-label={social.name}
                  >
                    <iconData.Icon size={22} className="transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
              Navigation
            </h3>
            <nav className="flex flex-col gap-3">
              {homeLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.url}
                  className="text-sm font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <span className="max-w-1 h-1 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-all group-hover:w-2" />
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Quick Info */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
              Connect
            </h3>
            <div className="space-y-4">
              <a
                href={`mailto:${webData.email}`}
                target="_blank"
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <Mail
                  size={16}
                  className="text-indigo-400 group-hover:scale-110 transition-transform"
                />
                <span className="font-medium">{webData.email}</span>
              </a>
              <a
                href={`https://wa.me/${webData.phone.replace(/\s/g, "")}`}
                target="_blank"
                className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group"
              >
                <Phone
                  size={16}
                  className="text-indigo-400 group-hover:scale-110 transition-transform"
                />
                <span className="">{webData.phone}</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                <span className="font-medium">{webData.footer.address}</span>
              </div>
            </div>
          </div>

          {/* Newsletter / CTA */}
          <form
            onSubmit={handleSubscribe}
            className="space-y-6 sm:col-span-2 lg:col-span-1"
          >
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
              Stay Updated
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Get the latest insights on web architecture and digital
              transformation.
            </p>
            <div className="flex flex-col flex-wrap sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Subscribe"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 sm:mt-20 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">
            {webData.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
