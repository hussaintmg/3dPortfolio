"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, MessageSquare, User, Calendar, Bell, ExternalLink, Inbox } from "lucide-react";
import { getSocket } from "@/lib/socket-client";

interface Enquiry {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
}

export default function EnquiriesDashboard() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [permission, setPermission] = useState("default");

  const fetchEnquiries = async () => {
    try {
      const resp = await fetch("/api/enquiry");
      const data = await resp.json();
      if (data.success) {
        setEnquiries(data.enquiries);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
    
    // Request Notification permission
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Wake up Socket Server
    fetch("/api/socket").catch(() => {});

    // Socket listeners
    const socket = getSocket();
    
    socket.on("new_enquiry", (data: any) => {
        setEnquiries((prev) => [data, ...prev]);
        setNewCount((prev) => prev + 1);
        
        // Browser Push Notification
        if (Notification.permission === "granted") {
            new Notification("New Enquiry Received", {
                body: `${data.name} just sent a message from your portfolio.`,
                icon: "/favicon.ico"
            });
        }
    });

    return () => {
        socket.off("new_enquiry");
    };
  }, []);

  const requestPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((res) => {
        setPermission(res);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent border border-indigo-100">
                  <Inbox size={26} />
              </div>
              Briefings
              {newCount > 0 && (
                <span className="ml-2 rounded-full bg-accent px-4 py-1.5 text-[10px] font-black text-white animate-bounce shadow-xl shadow-indigo-600/20 uppercase tracking-widest">
                  {newCount} New
                </span>
              )}
            </h1>
            <p className="text-gray-500 font-medium">Coordinate and manage inbound project transmissions.</p>
          </div>

          <div className="flex items-center gap-4">
            {permission !== "granted" && (
              <button
                onClick={requestPermission}
                className="flex items-center gap-2 rounded-2xl bg-gray-50 border border-gray-100 px-5 py-3 text-xs font-black text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all uppercase tracking-widest"
              >
                <Bell size={16} />
                Listen Path
              </button>
            )}
            <button
                onClick={() => { setEnquiries([]); fetchEnquiries(); setNewCount(0); }}
                className="flex items-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-xs font-black text-white hover:bg-black shadow-xl shadow-gray-900/10 transition-all active:scale-95 uppercase tracking-widest"
            >
                Synchronize
            </button>
          </div>
        </div>

        {enquiries.length === 0 ? (
          <div className="rounded-4xl border border-gray-100 bg-white p-24 text-center shadow-sm">
             <Inbox className="mx-auto mb-6 text-gray-200" size={80} />
             <p className="text-2xl text-gray-400 font-black tracking-tight">Deployment queue empty.</p>
             <p className="text-sm text-gray-400 mt-2">No active communications detected in the pipeline.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm lg:block">
              <table className="w-full text-left">
                <thead className="border-b border-gray-50 bg-gray-50/50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Personnel Node</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Mission Parameters</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Temporal Data</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enquiries.map((e) => (
                    <tr key={e._id} className="group hover:bg-indigo-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="shrink-0 size-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100 group-hover:border-indigo-100 group-hover:text-accent transition-colors">
                            <User size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{e.name}</div>
                            <div className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} className="opacity-70" />
                              {e.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 max-w-md">
                        <div className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">{e.message}</div>
                      </td>
                      <td className="px-8 py-6 text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="opacity-50" />
                          {new Date(e.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <a href={`mailto:${e.email}`} className="text-[11px] font-black uppercase tracking-widest text-accent hover:underline underline-offset-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          Initiate Reply
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="grid grid-cols-1 gap-6 lg:hidden">
              {enquiries.map((e) => (
                <div key={e._id} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className="shrink-0 size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 tracking-tight">{e.name}</h3>
                            <p className="text-xs font-medium text-gray-400 mt-0.5">{e.email}</p>
                        </div>
                    </div>
                  </div>
                  <div className="mt-6 rounded-2xl bg-gray-50 p-6 border border-gray-100">
                    <p className="text-sm text-gray-500 font-medium leading-relaxed italic">"{e.message}"</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                           {new Date(e.createdAt).toLocaleDateString()}
                      </span>
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent">
                        <ExternalLink size={14} />
                        Link Response
                      </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
