"use client";

import { useState, useEffect } from "react";
import { 
    Users, ShieldCheck, ShieldAlert, ShieldX, 
    CheckCircle2, XCircle, Trash2, Loader2, Sparkles, UserPlus 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function AdminManagement() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const resp = await axios.get("/api/auth/admins");
      if (resp.data.success) {
        setAdmins(resp.data.admins);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAction = async (adminId: string, status: string) => {
    setActionLoading(adminId + status);
    try {
      await axios.put("/api/auth/admins", { adminId, status });
      fetchAdmins();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this admin permanently?")) return;
    setActionLoading(adminId + "remove");
    try {
      await axios.delete("/api/auth/admins", { data: { adminId } });
      fetchAdmins();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
       <Loader2 className="animate-spin text-accent" size={48} />
    </div>
  );

  if (currentUser?.role !== 'owner') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-900 bg-[#F9FAFB] p-10 text-center space-y-4">
         <ShieldX size={80} className="text-red-500 mb-4" />
         <h1 className="text-5xl font-black uppercase tracking-tighter italic">Authority Denied</h1>
         <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Administrative level 10 clearance required.</p>
      </div>
    );
  }

  const pendingAdmins = admins.filter(a => a.status === 'pending');
  const approvedAdmins = admins.filter(a => a.status === 'approved' || a.status === 'rejected');

  return (
    <div className="min-h-screen p-6 sm:p-10 bg-[#F9FAFB] text-gray-900 selection:bg-indigo-100">
      <div className="max-w-7xl mx-auto space-y-20">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 font-black tracking-tight border-b border-gray-100 pb-16">
           <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl flex items-center gap-6 italic tracking-tighter text-gray-900">
                 <ShieldCheck className="text-accent shrink-0" size={56} />
                 System Governance
              </h1>
              <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">Vetting & Verification Control Terminal</p>
           </div>
           <div className="flex items-center gap-6 p-6 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-indigo-600/5 group/count">
              <div className="size-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent group-hover/count:scale-110 transition-transform"><Users size={28} /></div>
              <div>
                 <span className="block text-3xl leading-none font-black text-gray-900">{admins.length}</span>
                 <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Registered</span>
              </div>
           </div>
        </header>

        {/* Section 1: Pending Approvals */}
        <section className="space-y-10">
           <div className="flex items-center gap-4 mb-4">
              <div className="size-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100"><ShieldAlert size={22} /></div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 italic">Vetting Pipeline <span className="text-red-500 ml-4 font-black">[{pendingAdmins.length}]</span></h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AnimatePresence>
                 {pendingAdmins.map((a, idx) => (
                    <motion.div 
                       key={a.id} 
                       initial={{ opacity: 0, y: 30 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9 }}
                       transition={{ delay: idx * 0.1 }}
                       className="rounded-4xl border border-gray-100 bg-white p-10 shadow-xl shadow-indigo-600/5 hover:border-accent transition-all group relative overflow-hidden"
                    >
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                            <UserPlus size={100} className="text-gray-900 -rotate-12" />
                       </div>
                       <div className="relative z-10 space-y-8">
                          <div className="space-y-2">
                             <h3 className="text-3xl font-black text-gray-900 tracking-tighter truncate">{a.username}</h3>
                             <p className="text-gray-400 text-xs font-black uppercase tracking-widest">{a.email}</p>
                          </div>
                          <div className="flex gap-4">
                             <button onClick={() => handleAction(a.id, 'approved')} className="flex-1 rounded-2xl bg-gray-900 py-4.5 font-black text-xs text-white uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-900/10 active:scale-95 disabled:opacity-50">
                                {actionLoading === (a.id + 'approved') ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
                                AUTHORIZE
                             </button>
                             <button onClick={() => handleAction(a.id, 'rejected')} className="flex-1 rounded-2xl bg-gray-50 border border-gray-100 py-4.5 font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-gray-100 hover:text-gray-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                                {actionLoading === (a.id + 'rejected') ? <Loader2 size={16} className="animate-spin" /> : <ShieldX size={18} />}
                                DISMISS
                             </button>
                          </div>
                       </div>
                    </motion.div>
                 ))}
                 {pendingAdmins.length === 0 && (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-gray-200 rounded-4xl text-gray-300 font-black text-3xl uppercase tracking-widest italic opacity-50">
                       Vetting Pipeline Clear
                    </div>
                 )}
              </AnimatePresence>
           </div>
        </section>

        {/* Section 2: Active Operators Pool */}
        <section className="space-y-12">
           <div className="flex items-center gap-4 mb-4">
              <div className="size-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent border border-indigo-100"><Sparkles size={22} /></div>
              <h2 className="text-4xl font-black tracking-tighter text-gray-900 italic">Active Operations Pool</h2>
           </div>

           <div className="overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm hidden lg:block">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50 border-b border-gray-50 text-[10px] text-gray-400 uppercase font-black tracking-widest">
                    <tr>
                       <th className="px-10 py-8">Identity Protocol</th>
                       <th className="px-10 py-8">Status</th>
                       <th className="px-10 py-8">Staged date</th>
                       <th className="px-10 py-8 text-right pr-16">Operations</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {approvedAdmins.map((a) => (
                       <tr key={a.id} className="group hover:bg-indigo-50/30 transition-all">
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-6">
                                <div className={`size-14 rounded-2xl flex items-center justify-center shadow-sm border ${a.status === 'rejected' ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-accent border-indigo-50'}`}>
                                   <Users size={28} />
                                </div>
                                <div className="space-y-1">
                                   <span className="block font-black text-xl text-gray-900 tracking-tighter">{a.username}</span>
                                   <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{a.email}</span>
                                </div>
                             </div>
                          </td>
                          <td className="px-10 py-8">
                             <span className={`inline-flex items-center gap-3 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                                {a.status === 'approved' ? <CheckCircle2 size={14} strokeWidth={3} /> : <XCircle size={14} strokeWidth={3} />}
                                {a.status}
                             </span>
                          </td>
                          <td className="px-10 py-8 text-xs text-gray-400 font-black uppercase tracking-widest">{new Date(a.createdAt).toLocaleDateString()}</td>
                          <td className="px-10 py-8 text-right pr-16">
                             <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                {a.status === 'approved' ? (
                                   <button onClick={() => handleAction(a.id, 'rejected')} className="size-11 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-100 transition-all shadow-sm" title="Revoke Clearance">
                                      {actionLoading === (a.id + 'rejected') ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                                   </button>
                                ) : (
                                   <button onClick={() => handleAction(a.id, 'approved')} className="size-11 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:border-emerald-100 transition-all shadow-sm" title="Authorize Profile">
                                      {actionLoading === (a.id + 'approved') ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                   </button>
                                )}
                                <button onClick={() => handleRemove(a.id)} className="size-11 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-100 transition-all shadow-sm" title="Purge Record">
                                   {actionLoading === (a.id + 'remove') ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* Mobile View */}
           <div className="lg:hidden grid grid-cols-1 gap-8 pb-32">
              {approvedAdmins.map((a) => (
                 <div key={a.id} className="rounded-4xl border border-gray-100 bg-white p-10 shadow-xl shadow-indigo-600/5 space-y-10 group relative overflow-hidden">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-5">
                          <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-accent shadow-sm"><Users size={28} /></div>
                          <div>
                             <h4 className="font-black text-2xl text-gray-900 tracking-tighter">{a.username}</h4>
                             <span className={`block text-[9px] font-black uppercase tracking-widest mt-1 ${a.status === 'approved' ? 'text-emerald-500' : 'text-rose-500'}`}>{a.status} protocol</span>
                          </div>
                       </div>
                       <button onClick={() => handleRemove(a.id)} className="size-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 active:scale-95 transition-all"><Trash2 size={24} /></button>
                    </div>
                    <div className="flex gap-4">
                       {a.status === 'approved' ? (
                          <button onClick={() => handleAction(a.id, 'rejected')} className="flex-1 rounded-2xl bg-gray-50 border border-gray-100 py-6 font-black text-xs text-gray-400 uppercase tracking-widest hover:bg-gray-100 hover:text-gray-900 active:scale-95 transition-all">Revoke System Access</button>
                       ) : (
                          <button onClick={() => handleAction(a.id, 'approved')} className="flex-1 rounded-2xl bg-gray-900 text-white py-6 font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-900/10">Authorize Access</button>
                       )}
                    </div>
                 </div>
              ))}
           </div>
        </section>

      </div>
    </div>
  );
}
