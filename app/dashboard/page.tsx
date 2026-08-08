"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  Inbox,
  Compass,
  Briefcase,
  ChevronRight,
  Activity,
  ExternalLink,
} from "lucide-react";
import { gsap } from "gsap";
import axios from "axios";
import { Skeleton, SkeletonStat, SkeletonRow } from "@/Components/ui/Skeleton";

interface Stats {
  projects: number;
  solutions: number;
  services: number;
  enquiries: number;
  users: number;
}

interface RecentProject {
  _id: string;
  title: string;
  technologies: string[];
  liveLink?: string;
  createdAt: string;
  media?: { url: string; type?: string };
}

interface MonthPoint {
  label: string;
  count: number;
}

interface ActivityItem {
  type: "enquiry" | "project" | "solution";
  title: string;
  detail: string;
  at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [months, setMonths] = useState<MonthPoint[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    axios
      .get("/api/dashboard/stats")
      .then((res) => {
        if (res.data.success) {
          setStats(res.data.stats);
          setMonths(res.data.months || []);
          setActivity(res.data.activity || []);
        }
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    axios
      .get("/api/projects")
      .then(
        (res) =>
          res.data.success && setRecent((res.data.projects || []).slice(0, 5)),
      )
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    if (statsLoading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dash-reveal",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" },
      );
    });
    return () => ctx.revert();
  }, [statsLoading]);

  const statCards = [
    {
      label: "Total Projects",
      value: stats?.projects ?? 0,
      icon: FolderKanban,
      color: "text-indigo-400",
      href: "/dashboard/projects",
    },
    {
      label: "Readymade Solutions",
      value: stats?.solutions ?? 0,
      icon: Compass,
      color: "text-purple-400",
      href: "/dashboard/readymade-solutions",
    },
    {
      label: "Services",
      value: stats?.services ?? 0,
      icon: Briefcase,
      color: "text-emerald-400",
      href: "/dashboard/services",
    },
    {
      label: "Enquiries",
      value: stats?.enquiries ?? 0,
      icon: Inbox,
      color: "text-amber-400",
      href: "/dashboard/enquiries",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              System Status:{" "}
              <span className="text-emerald-400 font-bold uppercase">
                Operational
              </span>
            </p>
          </div>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonStat key={i} className="rounded-[2.5rem] p-8" />
              ))
            : statCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <Link
                    href={stat.href}
                    key={idx}
                    className="dash-reveal bg-card border border-white/5 rounded-[2.5rem] p-8 hover:border-accent/30 transition-all duration-500 group shadow-2xl shadow-black/20 block"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`size-12 rounded-2xl bg-background border border-white/10 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-500`}
                      >
                        <Icon size={24} />
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-gray-600 group-hover:text-accent group-hover:translate-x-1 transition-all"
                      />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">
                      {stat.label}
                    </h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">
                        {stat.value}
                      </span>
                      <Activity className="size-4 text-accent/30" />
                    </div>
                  </Link>
                );
              })}
        </div>

        {/* CHART + ACTIVITY */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-12">
          {/* Enquiries chart (pure CSS/SVG — no chart lib) */}
          <div className="dash-reveal xl:col-span-3 bg-card border border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-white tracking-tighter">
                  Enquiries — Last 6 Months
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Lead flow overview
                </p>
              </div>
              <div className="size-10 rounded-xl bg-background border border-white/10 flex items-center justify-center text-accent">
                <Activity size={18} />
              </div>
            </div>

            {statsLoading ? (
              <div className="flex items-end gap-4 h-44">
                {["h-1/3", "h-2/3", "h-1/2", "h-full", "h-2/5", "h-3/5"].map(
                  (h, i) => (
                    <div key={i} className="flex-1 flex items-end h-full">
                      <Skeleton className={`w-full rounded-xl ${h}`} />
                    </div>
                  ),
                )}
              </div>
            ) : (
              (() => {
                const max = Math.max(1, ...months.map((m) => m.count));
                return (
                  <div className="flex items-end gap-3 sm:gap-4 h-44">
                    {months.map((m, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-2 group"
                      >
                        <span className="text-[10px] font-black text-gray-500 group-hover:text-accent transition-colors">
                          {m.count}
                        </span>
                        <div
                          className="w-full rounded-xl bg-linear-to-t from-accent/80 to-purple-500/60 group-hover:from-accent group-hover:to-purple-400 transition-all duration-500 min-h-[6px]"
                          style={{
                            height: `${Math.max(4, (m.count / max) * 100)}%`,
                          }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>

          {/* Recent activity feed */}
          <div className="dash-reveal xl:col-span-2 bg-card border border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-black/20">
            <h3 className="text-lg font-black text-white tracking-tighter mb-6">
              Recent Activity
            </h3>
            {statsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <Skeleton className="size-9 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-gray-500 font-medium py-8 text-center">
                No activity yet.
              </p>
            ) : (
              <div className="space-y-1 -mx-3">
                {activity.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3.5 px-3 py-3 rounded-2xl hover:bg-white/3 transition-colors"
                  >
                    <div
                      className={`size-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        a.type === "enquiry"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : a.type === "project"
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}
                    >
                      {a.type === "enquiry" ? (
                        <Inbox size={15} />
                      ) : a.type === "project" ? (
                        <FolderKanban size={15} />
                      ) : (
                        <Compass size={15} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-white leading-snug truncate">
                        {a.title}
                      </p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">
                        {new Date(a.at).toLocaleDateString()} ·{" "}
                        {new Date(a.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RECENT PROJECTS */}
        <div className="dash-reveal bg-card border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/1">
            <div>
              <h3 className="text-xl font-black text-white tracking-tighter">
                Recent Projects
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Latest portfolio deployments
              </p>
            </div>
            <Link
              href="/dashboard/projects"
              className="text-xs font-black text-accent uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
            >
              Manage All <ChevronRight size={14} />
            </Link>
          </div>

          {recentLoading ? (
            <div>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonRow key={i} cols={4} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <FolderKanban size={40} className="mx-auto text-gray-700" />
              <p className="text-sm font-medium text-gray-500">
                No projects yet — deploy your first one.
              </p>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-colors"
              >
                Add Project <ChevronRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/2">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Project
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Tech Stack
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Added
                    </th>
                    <th className="px-8 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recent.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-white/1 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-xl bg-background border border-white/10 overflow-hidden flex items-center justify-center text-accent shrink-0">
                            {p.media?.url && !p.media?.type?.startsWith("video") ? (
                              <img
                                src={p.media.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FolderKanban size={18} />
                            )}
                          </div>
                          <p className="text-sm font-black text-white tracking-tight">
                            {p.title}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                          {p.technologies?.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] bg-white/5 text-gray-400 border border-white/5 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {p.liveLink && (
                          <a
                            href={p.liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-accent inline-block"
                          >
                            <ExternalLink size={17} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
