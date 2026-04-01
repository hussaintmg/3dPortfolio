"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  MessageSquare,
  Package,
  Settings,
  LogOut,
  Search,
  Bell,
  Sparkles,
  Filter,
  ChevronRight,
  Activity,
  Globe,
  Shield,
} from "lucide-react";
import { gsap } from "gsap";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const stats = [
    {
      label: "Total Projects",
      value: "148",
      icon: FolderKanban,
      color: "text-indigo-400",
      change: "+12.5%",
    },
    {
      label: "Active Users",
      value: "2.4K",
      icon: Users,
      color: "text-accent",
      change: "+18.2%",
    },
    {
      label: "Pending Requests",
      value: "24",
      icon: MessageSquare,
      color: "text-purple-400",
      change: "-5%",
    },
    {
      label: "Uptime Network",
      value: "99.9%",
      icon: Globe,
      color: "text-emerald-400",
      change: "SECURE",
    },
  ];

  useEffect(() => {
    gsap.fromTo(
      ".dash-reveal",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" },
    );
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        <header className="dash-reveal flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-tight">
              System Status:{" "}
              <span className="text-emerald-400 font-bold uppercase">
                Operational
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group flex-1 md:w-64">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search entries..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white focus:outline-none focus:border-accent transition-all"
              />
            </div>
            <button className="relative size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent animate-ping" />
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent" />
            </button>
          </div>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="dash-reveal bg-card border border-white/5 rounded-[2.5rem] p-8 hover:border-accent/30 transition-all duration-500 group shadow-2xl shadow-black/20"
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`size-12 rounded-2xl bg-background border border-white/10 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-500`}
                  >
                    <Icon size={24} />
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${stat.change.startsWith("+") ? "text-emerald-400" : stat.change === "SECURE" ? "text-accent" : "text-red-400"}`}
                  >
                    {stat.change}
                  </span>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">
                  {stat.label}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tracking-tighter">
                    {stat.value}
                  </span>
                  <Activity className="size-4 text-accent/30" />
                </div>
              </div>
            );
          })}
        </div>

        {/* PROJECTS TABLE */}
        <div className="dash-reveal bg-card border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20">
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/1">
            <div>
              <h3 className="text-xl font-black text-white tracking-tighter">
                Recent Architecture Logs
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Live Infrastructure Feed
              </p>
            </div>
            <button className="text-xs font-black text-accent uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2">
              Export Logs <Filter size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/2">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Project / Hash
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Client Node
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Expansion Rate
                  </th>
                  <th className="px-8 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[1, 2, 3, 4, 5].map((item) => (
                  <tr
                    key={item}
                    className="hover:bg-white/1 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-background border border-white/10 flex items-center justify-center text-accent">
                          <FolderKanban size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight">
                            Project Delta-0{item}
                          </p>
                          <p className="text-[10px] font-medium text-gray-600 tracking-widest uppercase">
                            ID: NEX-88{item}0X
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-gray-400">
                        Quantum Corp.
                      </p>
                      <p className="text-[10px] font-medium text-gray-600 uppercase tracking-tighter">
                        Verified Client
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                        <div
                          className={`absolute left-0 top-0 h-full bg-accent rounded-full`}
                          style={{ width: `${60 + item * 8}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-white">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
