"use client";

import { useOwner } from "@/context/OwnerContext";
import AdminTable from "@/Components/dashboard/AdminTable";
import { UserCheck, RefreshCcw } from "lucide-react";

export default function ApprovedAdminsPage() {
  const { admins, loading, refreshAdmins } = useOwner();
  const approvedAdmins = admins.filter(a => a.status === "approved");

  return (
    <div className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
               <UserCheck size={24} />
             </div>
             <h1 className="text-3xl font-black bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
               Approved <span className="text-emerald-500">Admins</span>
             </h1>
          </div>
          <p className="text-gray-400 text-sm font-medium">Verified and active administrative personnel with system access.</p>
        </div>

        <button 
          onClick={refreshAdmins}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-card/40 hover:bg-white/10 active:scale-95 text-white rounded-xl border border-white/10 transition-all font-bold text-sm disabled:opacity-50"
        >
          <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
          Sync Records
        </button>
      </div>

      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-emerald-500/20 to-transparent mb-8" />
        <AdminTable admins={approvedAdmins} loading={loading} filter="approved" />
      </div>
    </div>
  );
}
