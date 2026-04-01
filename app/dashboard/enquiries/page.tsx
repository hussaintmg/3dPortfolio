"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Bell,
  Filter,
  Mail,
  User,
  Calendar,
  ChevronRight,
  ArrowRight,
  Loader2,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { gsap } from "gsap";
import Link from "next/link";
import { notify } from "@/lib/notify";

interface Enquiry {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEnquiries = async () => {
    try {
      const resp = await fetch("/api/enquiry");
      const data = await resp.json();
      if (data.success) {
        setEnquiries(data.enquiries);
      } else {
        notify.error("Failed to fetch enquiries");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      notify.error("Network error fetching enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  useEffect(() => {
    if (!loading) {
      gsap.fromTo(
        ".reveal-item",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power2.out" }
      );
    }
  }, [loading]);

  const filteredEnquiries = enquiries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto custom-scrollbar">
        {/* HEADER */}
        <header className="reveal-item flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              Enquiry <span className="italic text-accent">Vault.</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">
              Strategic Inbounds // Total Nodes: {enquiries.length}
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
                placeholder="Filter decrypts..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-white focus:outline-none focus:border-accent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-accent" size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Synchronizing Encrypted Data...
              </p>
            </div>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="h-[50vh] flex items-center justify-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/1">
            <div className="text-center space-y-4">
              <Inbox className="size-12 text-gray-700 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white tracking-tighter">
                  No Signals Found.
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Awaiting external transmissions.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block reveal-item bg-card border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/2">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Signal Source
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Decrypted Content
                      </th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Timestamp
                      </th>
                      <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredEnquiries.map((enquiry) => (
                      <tr
                        key={enquiry._id}
                        className="hover:bg-white/1 transition-colors group"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-background border border-white/10 flex items-center justify-center text-accent">
                              <User size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-tight">
                                {enquiry.name}
                              </p>
                              <p className="text-[10px] font-medium text-gray-500 tracking-wider">
                                {enquiry.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs text-gray-400 font-medium line-clamp-1 max-w-sm">
                            {enquiry.message}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {new Date(enquiry.createdAt).toLocaleString()}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <Link
                            href={{
                              pathname: "/dashboard/enquiries/send-email",
                              query: {
                                id: enquiry._id,
                                name: enquiry.name,
                                email: enquiry.email,
                                message: enquiry.message
                              }
                            }}
                            className="inline-flex items-center gap-2 bg-accent hover:bg-white text-background hover:text-background px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                          >
                            <Mail size={14} /> Sent Email
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden grid grid-cols-1 gap-4">
              {filteredEnquiries.map((enquiry) => (
                <div
                  key={enquiry._id}
                  className="reveal-item bg-card border border-white/5 rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-background border border-white/10 flex items-center justify-center text-accent">
                        <User size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">
                          {enquiry.name}
                        </h3>
                        <p className="text-[10px] font-medium text-gray-500 font-mono">
                          {enquiry.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-2xl p-4 mb-6 border border-white/5">
                    <p className="text-xs text-gray-400 font-medium leading-relaxed italic">
                      "{enquiry.message}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                      <Calendar size={12} />
                      {new Date(enquiry.createdAt).toLocaleDateString()}
                    </div>
                    <Link
                      href={{
                        pathname: "/dashboard/enquiries/send-email",
                        query: {
                          id: enquiry._id,
                          name: enquiry.name,
                          email: enquiry.email,
                          message: enquiry.message
                        }
                      }}
                      className="inline-flex items-center gap-2 bg-accent hover:bg-white text-background hover:text-background px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      <Mail size={12} /> Sent Email
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
