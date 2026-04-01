"use client";

import { useState } from "react";
import { useOwner } from "@/context/OwnerContext";
import { useNotify } from "@/hooks/useNotify";
import { 
  UserCheck, 
  UserRoundX, 
  Loader2, 
  Mail, 
  Calendar, 
  User as UserIcon, 
  Search, 
  ArrowUpDown,
  Filter
} from "lucide-react";

interface Admin {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  status: "pending" | "approved" | "suspended";
  createdAt: string;
}

interface AdminTableProps {
  admins: Admin[];
  loading: boolean;
  filter: "pending" | "approved" | "suspended";
}

export default function AdminTable({ admins, loading, filter }: AdminTableProps) {
  const { approveAdmin, rejectAdmin } = useOwner();
  const { notify } = useNotify();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");

  // Filtering and Sorting Logic
  const processedAdmins = admins
    .filter(admin => {
      const searchLower = searchQuery.toLowerCase();
      return (
        admin.username.toLowerCase().includes(searchLower) ||
        admin.email.toLowerCase().includes(searchLower) ||
        (admin.displayName && admin.displayName.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name") return (a.displayName || a.username).localeCompare(b.displayName || b.username);
      return 0;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-[#6366F1]" size={40} />
        <p className="text-gray-400 font-medium animate-pulse">Retrieving admin records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtering Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between py-6 border-b border-white/5">
        <div className="relative w-full sm:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#6366F1] transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search by name, email or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-hidden focus:border-[#6366F1]/50 focus:bg-white/10 transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-gray-400 text-sm font-medium whitespace-nowrap bg-white/5 px-4 py-3 rounded-xl border border-white/10">
            <ArrowUpDown size={16} className="text-[#6366F1]" />
            <span>Sort by:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white focus:outline-hidden cursor-pointer"
            >
              <option className="text-black" value="newest">Newest First</option>
              <option className="text-black" value="oldest">Oldest First</option>
              <option className="text-black" value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {processedAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-card/40 border border-white/10 rounded-2xl backdrop-blur-md">
          <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-gray-500">
             <Filter size={32} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Match Found</h3>
          <p className="text-gray-400 max-w-sm">We couldn't find any administrators matching your current filter criteria.</p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-4 text-[#6366F1] font-bold text-sm hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Administrator</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Contact Details</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-center whitespace-nowrap">Join Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {processedAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-linear-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-xs font-black shadow-lg shadow-[#6366F1]/10">
                          {admin.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white truncate">{admin.displayName || admin.username}</span>
                          <span className="text-[10px] text-gray-500 font-medium">@{admin.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Mail size={12} className="text-[#6366F1]" />
                        <span>{admin.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                          admin.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                          admin.status === "suspended" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                          "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          {admin.status}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1 text-[11px] text-gray-500">
                        <Calendar size={12} className="text-[#6366F1]" />
                        <span>{new Date(admin.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 transition-all">
                        {admin.status !== "approved" && (
                          <button
                            onClick={() => approveAdmin(admin.id).then(res => {
                              if (res.success) notify.success(res.message);
                              else notify.error(res.message);
                            })}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg border border-emerald-500/20 transition-all active:scale-95"
                            title="Approve Admin"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        {admin.status !== "suspended" && (
                          <button
                            onClick={() => rejectAdmin(admin.id).then(res => {
                              if (res.success) notify.success(res.message);
                              else notify.error(res.message);
                            })}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg border border-rose-500/20 transition-all active:scale-95"
                            title="Reject/Suspend Admin"
                          >
                            <UserRoundX size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden grid grid-cols-1 gap-6">
            {processedAdmins.map((admin) => (
              <div 
                key={admin.id} 
                className="group relative overflow-hidden bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl hover:border-[#6366F1]/30 transition-all duration-300 p-6 flex flex-col h-full"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between mb-5">
                  <div className="size-12 rounded-xl bg-linear-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-[#6366F1]/10">
                    {admin.username.charAt(0).toUpperCase()}
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    admin.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                    admin.status === "suspended" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                    "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}>
                    {admin.status}
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-lg font-bold text-white tracking-tight leading-tight mb-1 truncate">
                      {admin.displayName || admin.username}
                    </h4>
                    <p className="text-sm text-gray-500 font-medium truncate">@{admin.username}</p>
                  </div>

                  <div className="grid gap-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 text-gray-400 text-xs">
                      <Mail size={14} className="text-[#6366F1]" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-xs">
                      <Calendar size={14} className="text-[#6366F1]" />
                      <span>Joined {new Date(admin.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-white/5 flex gap-3">
                  {admin.status !== "approved" && (
                    <button
                      onClick={() => approveAdmin(admin.id).then(res => {
                        if (res.success) notify.success(res.message);
                        else notify.error(res.message);
                      })}
                      className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl font-bold text-sm transition-all active:scale-95 border border-emerald-500/20"
                    >
                      <UserCheck size={16} />
                      Approve
                    </button>
                  )}
                  {admin.status !== "suspended" && (
                    <button
                      onClick={() => rejectAdmin(admin.id).then(res => {
                        if (res.success) notify.success(res.message);
                        else notify.error(res.message);
                      })}
                      className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold text-sm transition-all active:scale-95 border border-rose-500/20"
                    >
                      <UserRoundX size={16} />
                      Reject
                    </button>
                  )}
                </div>

                {/* Decorative Glow */}
                <div className="absolute -bottom-10 -right-10 size-32 bg-[#6366F1] rounded-full blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
