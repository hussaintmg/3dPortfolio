"use client";

import { useState } from "react";
import { Edit2, Trash2, Calendar, HardDrive, Tag, Palette, Search, Filter, LayoutGrid, LayoutList } from "lucide-react";
import { ReadymadeSolution } from "@/context/ReadymadeSolutionsContext";

interface SolutionListProps {
  solutions: ReadymadeSolution[];
  onEdit: (solution: ReadymadeSolution) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export default function SolutionList({ solutions, onEdit, onDelete, isLoading }: SolutionListProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const filtered = solutions.filter(s => 
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.technologies.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const getGradientStyle = (config: any) => {
    if (config.type === "solid") return { backgroundColor: config.colors[0] };
    if (config.type === "linear") return { background: `linear-gradient(${config.gradientParams?.angle || 45}deg, ${config.colors.join(", ")})` };
    if (config.type === "radial") return { background: `radial-gradient(circle at ${config.gradientParams?.position || "center"}, ${config.colors.join(", ")})` };
    if (config.type === "conical") return { background: `conic-gradient(from 0deg, ${config.colors.join(", ")})` };
    return {};
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-zinc-900/50 border border-white/5 rounded-3xl backdrop-blur-3xl shadow-2xl">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search solutions..."
            className="w-full pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-indigo-500/50 outline-none text-xs transition-all"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button onClick={() => setViewMode("table")} className={`p-2.5 rounded-xl transition-all ${viewMode === "table" ? "bg-indigo-500 text-white shadow-lg" : "text-gray-500 hover:text-white"}`}>
              <LayoutList size={20} />
            </button>
            <button onClick={() => setViewMode("card")} className={`p-2.5 rounded-xl transition-all ${viewMode === "card" ? "bg-indigo-500 text-white shadow-lg" : "text-gray-500 hover:text-white"}`}>
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-4">
           <Filter className="mx-auto text-gray-700" size={48} />
           <div className="space-y-1">
             <h3 className="text-lg font-black text-white tracking-tight">No Solutions Found</h3>
             <p className="text-gray-500 text-sm max-w-sm mx-auto font-medium">Try adjusting your search query.</p>
           </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={`hidden md:block overflow-hidden bg-zinc-900/40 border border-white/5 rounded-3xl backdrop-blur-2xl transition-all ${viewMode === "card" ? "md:hidden" : ""}`}>
            <table className="w-full text-left">
               <thead>
                 <tr className="bg-white/2 border-b border-white/5">
                   <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Solution</th>
                   <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Tech Stack</th>
                   <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Aesthetic</th>
                   <th className="px-6 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Metadata</th>
                   <th className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Actions</th>
                 </tr>
               </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((s) => (
                    <tr key={s._id} className="hover:bg-white/5 transition-all group">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative size-12 rounded-xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform">
                            <img src={s.media.url} className="w-full h-full object-cover" alt={s.title} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white truncate max-w-[200px] group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{s.title}</span>
                            <span className="text-[9px] text-gray-500 font-bold flex items-center gap-1.5"><Tag size={9} /> SOLUTION</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center flex-wrap gap-1 max-w-[180px] mx-auto">
                          {s.technologies.slice(0, 3).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[8px] font-black text-gray-400 uppercase tracking-widest">{t}</span>
                          ))}
                          {s.technologies.length > 3 && <span className="text-[8px] text-indigo-500 font-black">+{s.technologies.length-3}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <div className="flex justify-center items-center gap-2">
                            <div className="size-5 rounded-md border border-white/20 shadow-xl" style={getGradientStyle(s.colorConfig)} title={s.colorConfig.type} />
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1 text-[9px] text-gray-500 font-black">
                          <div className="flex items-center gap-1"><Calendar size={10} className="text-indigo-500" /> {new Date(s.createdAt).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1"><HardDrive size={10} className="text-indigo-500" /> {((s.media.size || 0) / 1024 / 1024).toFixed(1)}MB</div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex justify-end gap-2 transition-all">
                          <button onClick={() => onEdit(s)} className="p-2 bg-white/5 hover:bg-indigo-500 hover:text-white text-gray-400 rounded-xl border border-white/10 transition-all active:scale-90 cursor-pointer shadow-xl"><Edit2 size={14} /></button>
                          <button onClick={() => onDelete(s._id)} className="p-2 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 rounded-xl border border-white/10 transition-all active:scale-90 cursor-pointer shadow-xl"><Trash2 size={14} /></button>
                        </div>
                      </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 ${viewMode === "table" ? "md:hidden" : ""}`}>

             {filtered.map((s) => (
               <div key={s._id} className="relative group bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-all duration-500 shadow-2xl">
                 <div className="relative aspect-video overflow-hidden">
                   <img src={s.media.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" alt={s.title} />
                   <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                   <div className="absolute top-4 right-4 p-3 rounded-xl backdrop-blur-3xl border border-white/10 bg-white/5 shadow-2xl">
                      <div className="size-6 rounded-lg" style={getGradientStyle(s.colorConfig)} />
                   </div>
                   <div className="absolute bottom-4 left-6 right-6">
                      <h4 className="text-lg font-black text-white tracking-tight leading-6 uppercase">{s.title}</h4>
                   </div>
                 </div>

                 <div className="p-6 space-y-4">
                   <div className="flex items-center justify-between text-[9px] text-gray-500 font-black tracking-widest uppercase pb-4 border-b border-white/5">
                      <div className="flex items-center gap-1.5"><Calendar size={10} className="text-indigo-500" /> {new Date(s.createdAt).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1.5"><Palette size={10} className="text-indigo-500" /> {s.colorConfig.type}</div>
                   </div>

                   <div className="flex flex-wrap gap-1.5">
                     {s.technologies.slice(0, 4).map((t, i) => (
                       <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-white/5 group-hover:border-indigo-500/20 transition-all">{t}</span>
                     ))}
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-2">
                     <button onClick={() => onEdit(s)} className="cursor-pointer py-3 bg-white/5 hover:bg-indigo-500 hover:text-white text-gray-400 font-black rounded-xl border border-white/10 transition-all active:scale-95 text-[9px] tracking-widest uppercase flex items-center justify-center gap-2"><Edit2 size={12} /> EDIT</button>
                     <button onClick={() => onDelete(s._id)} className="cursor-pointer py-3 bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 font-black rounded-xl border border-white/10 transition-all active:scale-95 text-[9px] tracking-widest uppercase flex items-center justify-center gap-2"><Trash2 size={12} /> DELETE</button>
                   </div>
                 </div>

                 <div className="absolute -bottom-20 -right-20 size-40 bg-indigo-500 blur-[120px] opacity-0 group-hover:opacity-10 transition-opacity" />
               </div>
             ))}
          </div>
        </>
      )}
    </div>
  );
}
