"use client";

import { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  Briefcase,
  X,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import * as LucideIcons from "lucide-react";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import { Skeleton, SkeletonRow } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      notify.error("Could not load services");
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
      setSubmitting(true);
      if (editingService) {
        await axios.put(`/api/services/${editingService._id}`, formData);
        notify.success("Service updated");
      } else {
        await axios.post("/api/services", formData);
        notify.success("Service created");
      }
      setIsModalOpen(false);
      fetchServices();
      setFormData({ name: "", description: "", icon: "Briefcase" });
      setEditingService(null);
    } catch (err: any) {
      notify.error(
        "Save failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      setSubmitting(true);
      await axios.delete(`/api/services/${deletingId}`);
      notify.success("Service deleted");
      setDeletingId(null);
      fetchServices();
    } catch (err: any) {
      notify.error(
        "Delete failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (s: Service) => {
    setEditingService(s);
    setFormData({ name: s.name, description: s.description, icon: s.icon });
    setIsModalOpen(true);
  };

  const IconPreview =
    (LucideIcons as any)[formData.icon] || LucideIcons.HelpCircle;

  if (loading)
    return (
      <div className="min-h-screen p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-3">
              <Skeleton className="h-11 w-80" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-14 w-48 rounded-2xl" />
          </div>
          <div className="rounded-3xl border border-white/10 bg-card overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} cols={3} />
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10 shadow-sm">
                <Briefcase size={24} />
              </div>
              Core Capabilities
            </h1>
            <p className="text-gray-400 font-medium text-sm">
              Architect and refine your specialized service ecosystem.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingService(null);
              setFormData({ name: "", description: "", icon: "Briefcase" });
              setIsModalOpen(true);
            }}
            className="bg-accent hover:bg-accent-hover text-white font-bold text-sm py-4 px-8 rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-95 flex items-center gap-2 w-fit"
          >
            <Plus size={18} /> Deploy Service
          </button>
        </header>

        {/* Desktop table */}
        <div className="hidden lg:block overflow-hidden rounded-3xl border border-white/10 bg-card shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-[#0A0A0A] border-b border-white/5">
              <tr>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Strategic Module
                </th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">
                  Mission Description
                </th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {services.map((s) => {
                const IconComp =
                  (LucideIcons as any)[s.icon] || LucideIcons.HelpCircle;
                return (
                  <tr
                    key={s._id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-accent border border-white/10 group-hover:border-accent/40 transition-colors">
                          <IconComp size={22} />
                        </div>
                        <span className="font-bold text-white text-lg tracking-tight group-hover:text-accent transition-colors">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-gray-400 font-medium max-w-md truncate text-sm">
                      {s.description}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(s)}
                          className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:bg-accent hover:text-white transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(s._id)}
                          className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-8 py-12 text-center text-sm font-medium text-gray-500"
                  >
                    No services yet — deploy your first capability above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden grid grid-cols-1 gap-6">
          {services.map((s) => {
            const IconComp =
              (LucideIcons as any)[s.icon] || LucideIcons.HelpCircle;
            return (
              <div
                key={s._id}
                className="rounded-3xl border border-white/10 bg-card p-7 shadow-xl"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="size-12 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-accent border border-white/10">
                    <IconComp size={22} />
                  </div>
                  <h3 className="font-black text-white tracking-tight text-xl">
                    {s.name}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 mb-7">
                  {s.description}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 text-white py-3.5 font-bold text-xs transition-colors"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => setDeletingId(s._id)}
                    className="size-12 shrink-0 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {services.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm font-medium text-gray-500">
              No services yet — deploy your first capability above.
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative w-full max-w-2xl bg-card rounded-3xl border border-white/10 p-8 sm:p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {editingService ? "Update Service" : "Deploy Service"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <FloatingInput
                  label="Service Name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <FloatingTextarea
                  label="Description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
                <div className="flex items-center gap-4">
                  <FloatingInput
                    label="Lucide Icon Name (e.g. Brain, Code2)"
                    containerClassName="flex-1"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                  />
                  <div className="size-14 shrink-0 rounded-2xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center text-accent">
                    <IconPreview size={24} />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 -mt-3">
                  Live preview on the right — use any icon name from
                  lucide.dev/icons
                </p>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-accent py-4.5 rounded-2xl font-black text-xs text-white hover:bg-accent-hover disabled:opacity-50 transition-all shadow-xl shadow-accent/20 active:scale-[0.98] uppercase tracking-widest"
                  >
                    {submitting
                      ? "Saving..."
                      : editingService
                        ? "Update Service"
                        : "Create Service"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!deletingId}
        title="Delete Service"
        message="This service will be permanently removed from your public site. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={submitting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingId(null)}
        type="danger"
      />
    </div>
  );
}
