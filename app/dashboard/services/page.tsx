"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Briefcase, X, Loader2, Search, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as LucideIcons from "lucide-react";

interface Service {
  _id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
}

export default function DashboardServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Briefcase",
  });

  const fetchServices = async () => {
    try {
      const resp = await axios.get("/api/services");
      if (resp.data.success) {
        setServices(resp.data.services);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await axios.put(`/api/services/${editingService._id}`, formData);
      } else {
        await axios.post("/api/services", formData);
      }
      setIsModalOpen(false);
      fetchServices();
      setFormData({ name: "", description: "", icon: "Briefcase" });
      setEditingService(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await axios.delete(`/api/services/${id}`);
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center p-4">
       <Loader2 className="animate-spin text-accent" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-2">
             <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent border border-indigo-100">
                    <Settings name="Settings" size={26} />
                </div>
                Core Capabilities
             </h1>
             <p className="text-gray-500 font-medium">Architect and refine your specialized service ecosystem.</p>
          </div>
          <button 
             onClick={() => { setEditingService(null); setFormData({ name: "", description: "", icon: "Briefcase" }); setIsModalOpen(true); }}
             className="bg-gray-900 hover:bg-black text-white font-black text-xs py-4 px-10 rounded-2xl transition-all shadow-xl shadow-gray-900/10 active:scale-95 uppercase tracking-widest"
          >
             + Deploy Service
          </button>
        </header>

        {/* List View */}
        <div className="hidden lg:block overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm">
           <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-50">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Strategic Module</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Mission Description</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Operations</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {services.map((s) => {
                    const IconComp = (LucideIcons as any)[s.icon] || LucideIcons.HelpCircle;
                    return (
                       <tr key={s._id} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100 group-hover:border-indigo-100 group-hover:text-accent transition-colors shadow-sm">
                                   <IconComp size={24} />
                                </div>
                                <span className="font-bold text-gray-900 text-lg tracking-tight">{s.name}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-gray-500 font-medium max-w-md truncate text-sm">{s.description}</td>
                          <td className="px-8 py-6 text-right">
                             <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingService(s); setFormData({ name: s.name, description: s.description, icon: s.icon }); setIsModalOpen(true); }} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-accent border border-gray-100 transition-all">
                                   <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(s._id)} className="size-10 rounded-xl bg-red-50 flex items-center justify-center text-red-300 hover:text-red-500 border border-red-50/50 transition-all">
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden grid grid-cols-1 gap-6">
           {services.map((s) => {
              const IconComp = (LucideIcons as any)[s.icon] || LucideIcons.HelpCircle;
              return (
                 <div key={s._id} className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-100">
                          <IconComp size={22} />
                       </div>
                       <h3 className="font-black text-gray-900 tracking-tight text-xl">{s.name}</h3>
                    </div>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed line-clamp-3 mb-8 italic">"{s.description}"</p>
                    <div className="flex gap-3">
                       <button onClick={() => { setEditingService(s); setFormData({ name: s.name, description: s.description, icon: s.icon }); setIsModalOpen(true); }} className="flex-1 rounded-2xl bg-gray-900 text-white py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-900/10">Modify</button>
                       <button onClick={() => handleDelete(s._id)} className="size-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                          <Trash2 size={20} />
                       </button>
                    </div>
                 </div>
              );
           })}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-2xl overflow-hidden shadow-indigo-600/5">
                <div className="flex items-center justify-between mb-10">
                   <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{editingService ? "Update Strategic" : "Deploy Strategic"}</h2>
                   <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocol Designation</label>
                      <input type="text" required className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4.5 outline-none focus:border-accent focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-sm text-gray-900" placeholder="Service Identifier" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mission Objective</label>
                      <textarea required rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4.5 outline-none focus:border-accent focus:ring-4 focus:ring-indigo-50 transition-all resize-none font-medium text-sm text-gray-900" placeholder="Parameter Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Iconography Node</label>
                      <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4.5 outline-none focus:border-accent focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-sm text-gray-900" value={formData.icon} onChange={(e) => setFormData({...formData, icon: e.target.value})} placeholder="Lucide Identifier (e.g. Code, Palette)" />
                      <p className="text-[10px] text-gray-400 italic">Reference Lucide documentation for valid identifiers.</p>
                   </div>
                   <div className="pt-4">
                        <button type="submit" className="w-full bg-accent py-5 rounded-2xl font-black text-xs text-white hover:bg-accent-hover transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-widest">
                        {editingService ? "Override Configuration" : "Finalize Deployment"}
                        </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
