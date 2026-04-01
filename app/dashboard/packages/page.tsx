"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Tag,
  Percent,
  MoreVertical,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

interface PackageMedia {
  url: string;
  type: "image" | "video";
}

interface Package {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  discountPercent: number;
  duration: string;
  features: string[];
  media: PackageMedia[];
  isCustom: boolean;
  createdAt: string;
}

export default function DashboardPackages() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDiscount, setBulkDiscount] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    discountedPrice: 0,
    discountPercent: 0,
    duration: "",
    features: [""] as string[],
    media: [] as PackageMedia[],
    isCustom: false,
  });

  const fetchPackages = async () => {
    try {
      const resp = await axios.get("/api/packages");
      if (resp.data.success) {
        setPackages(resp.data.packages);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      discountedPrice: 0,
      discountPercent: 0,
      duration: "",
      features: [""],
      media: [],
      isCustom: false,
    });
    setEditingPkg(null);
  };

  const openEditModal = (pkg: Package) => {
    setEditingPkg(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      discountedPrice: pkg.discountedPrice,
      discountPercent: pkg.discountPercent,
      duration: pkg.duration,
      features: [...pkg.features],
      media: [...pkg.media],
      isCustom: pkg.isCustom,
    });
    setIsModalOpen(true);
  };

  const handlePriceChange = (
    val: number,
    type: "base" | "discount" | "percent",
  ) => {
    let newPrice = formData.price;
    let newDiscounted = formData.discountedPrice;
    let newPercent = formData.discountPercent;

    if (type === "base") {
      newPrice = val;
      if (newPercent > 0)
        newDiscounted = newPrice - (newPrice * newPercent) / 100;
    } else if (type === "discount") {
      newDiscounted = val;
      newPercent = Math.round(((newPrice - newDiscounted) / newPrice) * 100);
    } else if (type === "percent") {
      newPercent = val;
      newDiscounted = newPrice - (newPrice * newPercent) / 100;
    }

    setFormData({
      ...formData,
      price: newPrice,
      discountedPrice: newDiscounted,
      discountPercent: newPercent,
    });
  };

  // Features logic
  const addFeature = () =>
    setFormData({ ...formData, features: [...formData.features, ""] });
  const updateFeature = (idx: number, val: string) => {
    const f = [...formData.features];
    f[idx] = val;
    setFormData({ ...formData, features: f });
  };
  const removeFeature = (idx: number) => {
    const f = formData.features.filter((_, i) => i !== idx);
    setFormData({ ...formData, features: f });
  };

  // Mock Cloudinary Upload (Since we can't interact with external widget easily in this environment without API key config)
  // In a real app, use next-cloudinary or direct fetch to Cloudinary
  const handleMediaUpload = () => {
    // For demo/system integration, we'll prompt for a URL or simulate
    const url = prompt("Enter Image/Video URL for Cloudinary Simulation:");
    if (url) {
      const type = url.includes("mp4") ? "video" : "image";
      setFormData({
        ...formData,
        media: [...formData.media, { url, type } as PackageMedia],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPkg) {
        await axios.put(`/api/packages/${editingPkg._id}`, formData);
      } else {
        await axios.post("/api/packages", formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchPackages();
    } catch (err) {
      console.error("Save error", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      await axios.delete(`/api/packages/${id}`);
      fetchPackages();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const applyBulkDiscount = async () => {
    if (selectedIds.length === 0 || bulkDiscount <= 0) return;
    if (
      !confirm(
        `Apply ${bulkDiscount}% discount to ${selectedIds.length} packages?`,
      )
    )
      return;

    try {
      // In a real app, I'd create a bulk API route, but for now I'll just map
      await Promise.all(
        selectedIds.map(async (id) => {
          const pkg = packages.find((p) => p._id === id);
          if (pkg) {
            const newDiscounted = pkg.price - (pkg.price * bulkDiscount) / 100;
            await axios.put(`/api/packages/${id}`, {
              ...pkg,
              discountPercent: bulkDiscount,
              discountedPrice: newDiscounted,
            });
          }
        }),
      );
      setSelectedIds([]);
      fetchPackages();
      alert("Bulk discount applied successfully!");
    } catch (err) {
      console.error("Bulk update error", err);
    }
  };

  if (loading)
    return (
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
                  <Package size={26} />
              </div>
              Product Lineup
            </h1>
            <p className="text-gray-500 font-medium">Control pricing strategy and structural service delivery.</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white font-black text-xs py-4.5 px-10 rounded-2xl transition-all shadow-xl shadow-gray-900/10 active:scale-95 uppercase tracking-widest"
          >
            <Plus size={20} />
            Initialize Package
          </button>
        </header>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-10 p-6 rounded-3xl bg-indigo-50 border border-indigo-100 flex flex-wrap items-center justify-between gap-6 shadow-sm shadow-indigo-600/5 ring-1 ring-indigo-50/50"
            >
              <div className="flex items-center gap-6">
                <span className="text-gray-900 font-black text-xs uppercase tracking-widest">
                  {selectedIds.length} Selections Active
                </span>
                <div className="h-8 w-px bg-indigo-200" />
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-white flex items-center justify-center text-accent border border-indigo-100 shadow-sm">
                      <Percent size={14} className="font-black" />
                  </div>
                  <input
                    type="number"
                    placeholder="Batch Discount %"
                    className="bg-white border border-indigo-100 rounded-xl px-4 py-2 text-xs font-bold w-40 focus:ring-4 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400"
                    value={bulkDiscount}
                    onChange={(e) => setBulkDiscount(Number(e.target.value))}
                  />
                  <button
                    onClick={applyBulkDiscount}
                    className="bg-accent hover:bg-accent-hover text-white text-[10px] font-black px-6 py-2.5 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/10"
                  >
                    Apply Override
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                Clear Selection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List View */}
        <div className="hidden lg:block overflow-hidden rounded-4xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-50">
              <tr>
                <th className="px-8 py-5">
                  <input
                    type="checkbox"
                    className="size-5 rounded-lg border-gray-200 bg-white text-accent focus:ring-accent"
                    checked={selectedIds.length === packages.length}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? packages.map((p) => p._id) : [],
                      )
                    }
                  />
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Strategic Module
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Pricing Matrix
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Temporal Scope
                </th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {packages.map((pkg) => (
                <tr
                  key={pkg._id}
                  className="group hover:bg-indigo-50/30 transition-all transition-colors"
                >
                  <td className="px-8 py-6">
                    <input
                      type="checkbox"
                      className="size-5 rounded-lg border-gray-200 bg-white text-accent focus:ring-accent"
                      checked={selectedIds.includes(pkg._id)}
                      onChange={(e) => {
                        if (e.target.checked)
                          setSelectedIds([...selectedIds, pkg._id]);
                        else
                          setSelectedIds(
                            selectedIds.filter((id) => id !== pkg._id),
                          );
                      }}
                    />
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:border-indigo-100 group-hover:text-accent transition-colors shadow-sm text-gray-400">
                        {pkg.media[0]?.type === "video" ? (
                          <VideoIcon size={22} />
                        ) : (
                          <ImageIcon size={22} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-accent transition-colors tracking-tight text-lg">
                          {pkg.name}
                        </h3>
                        {pkg.isCustom && (
                          <span className="text-[9px] bg-indigo-50 text-accent px-2 py-0.5 rounded-lg border border-indigo-100 uppercase font-black tracking-widest mt-1 inline-block shadow-sm">
                            Bespoke
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-gray-900 text-xl tracking-tighter">
                        ${pkg.discountedPrice}
                      </span>
                      {pkg.discountPercent > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-300 line-through">
                            ${pkg.price}
                          </span>
                          <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">
                            {pkg.discountPercent}% SLICE
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {pkg.duration}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(pkg)}
                        className="size-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-accent border border-gray-100 transition-all font-bold"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg._id)}
                        className="size-10 rounded-xl bg-red-50 flex items-center justify-center text-red-300 hover:text-red-500 border border-red-50/50 transition-all font-bold"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden grid grid-cols-1 gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg._id}
              className="rounded-4xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-400">
                    {pkg.media[0]?.type === "video" ? (
                      <VideoIcon size={22} />
                    ) : (
                      <ImageIcon size={22} />
                    )}
                  </div>
                  <h3 className="font-black text-gray-900 tracking-tight text-xl">{pkg.name}</h3>
                </div>
                <input
                  type="checkbox"
                  className="size-6 rounded-lg border-gray-200 bg-white text-accent focus:ring-accent"
                />
              </div>
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-4xl font-black text-gray-900 tracking-tighter">
                  ${pkg.discountedPrice}
                </span>
                {pkg.discountPercent > 0 && (
                  <span className="text-gray-300 line-through decoration-red-200/50 text-lg">
                    ${pkg.price}
                  </span>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => openEditModal(pkg)}
                  className="flex-1 flex items-center justify-center gap-3 rounded-2xl bg-gray-900 text-white py-4.5 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-900/10"
                >
                  <Edit size={18} /> Modify
                </button>
                <button
                  onClick={() => handleDelete(pkg._id)}
                  className="size-15 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-xl"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] border border-gray-100 bg-white p-10 lg:p-14 shadow-2xl shadow-indigo-600/5"
            >
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent border border-indigo-100 shadow-sm">
                    {editingPkg ? <Edit size={26} /> : <Plus size={26} />}
                  </div>
                  {editingPkg ? "Override Configuration" : "Deploy New Module"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="size-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all font-bold"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-14">
                  <div className="space-y-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Module Identifier
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-gray-900 focus:border-accent focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-sm"
                        placeholder="e.g. Enterprise Foundation"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Specification Brief
                      </label>
                      <textarea
                        required
                        rows={4}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-gray-900 focus:border-accent focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none font-medium text-sm leading-relaxed"
                        placeholder="Define integrated service parameters..."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-10">
                      <div className="space-y-3 flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Temporal Cycle
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-5 text-gray-900 focus:border-accent focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-sm"
                          placeholder="e.g. 14 Deployment Days"
                          value={formData.duration}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              duration: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-4 pt-10">
                        <label className="flex items-center gap-4 group cursor-pointer">
                          <input
                            type="checkbox"
                            className="size-7 rounded-xl bg-gray-50 border-gray-100 text-accent focus:ring-0 checked:bg-accent"
                            checked={formData.isCustom}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                isCustom: e.target.checked,
                              })
                            }
                          />
                          <span className="text-xs font-black text-gray-400 group-hover:text-gray-900 transition-colors uppercase tracking-widest">
                            Bespoke Logic
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="rounded-4xl border border-gray-100 bg-gray-50/50 p-10 relative shadow-sm overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                          <Tag size={40} className="text-gray-100 -rotate-12" />
                      </div>
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest mb-8 block">
                        Capital Configuration
                      </label>
                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                            Baseline Valuation ($)
                          </label>
                          <input
                            type="number"
                            required
                            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-gray-900 focus:border-accent outline-none transition-all text-2xl font-black tracking-tighter shadow-sm"
                            value={formData.price}
                            onChange={(e) =>
                              handlePriceChange(Number(e.target.value), "base")
                            }
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                              Slice %
                            </label>
                            <input
                              type="number"
                              className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-accent focus:border-accent outline-none transition-all font-black text-lg shadow-sm"
                              value={formData.discountPercent}
                              min={0}
                              max={100}
                              onChange={(e) =>
                                handlePriceChange(
                                  Number(e.target.value),
                                  "percent",
                                )
                              }
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                              Settlement ($)
                            </label>
                            <input
                              type="number"
                              className="w-full bg-white border border-indigo-200 rounded-2xl px-5 py-4 text-green-600 focus:border-accent outline-none transition-all font-black text-lg shadow-sm"
                              value={Math.round(formData.discountedPrice)}
                              onChange={(e) =>
                                handlePriceChange(
                                  Number(e.target.value),
                                  "discount",
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Integrated Modules
                        </label>
                        <button
                          type="button"
                          onClick={addFeature}
                          className="text-accent underline decoration-indigo-200 underline-offset-4 font-black text-[10px] uppercase tracking-widest transition-colors"
                        >
                          + Append Module
                        </button>
                      </div>
                      <div className="space-y-4 max-h-[250px] overflow-y-auto pr-3 custom-scrollbar">
                        {formData.features.map((feat, idx) => (
                          <div key={idx} className="flex gap-3">
                            <input
                              type="text"
                              required
                              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm font-medium focus:border-accent outline-none transition-all"
                              value={feat}
                              onChange={(e) =>
                                updateFeature(idx, e.target.value)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => removeFeature(idx)}
                              className="size-11 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all border border-gray-100"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media Section */}
                <div className="space-y-8 pt-6">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Visual Pipeline (Renders/Demonstrations)
                    </label>
                    <button
                      type="button"
                      onClick={handleMediaUpload}
                      className="flex items-center gap-3 rounded-2xl bg-indigo-50 border border-indigo-100 px-8 py-3.5 text-[10px] font-black text-accent hover:bg-accent hover:text-white transition-all uppercase tracking-widest shadow-sm"
                    >
                      <ImageIcon size={18} />
                      Inject Asset
                    </button>
                  </div>

                  {formData.media.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                      {formData.media.map((m, idx) => (
                        <div
                          key={idx}
                          className="relative group aspect-square rounded-3xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm"
                        >
                          {m.type === "video" ? (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                              <VideoIcon size={32} className="text-gray-300 group-hover:text-accent transition-colors" />
                            </div>
                          ) : (
                            <img
                              src={m.url}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                media: formData.media.filter(
                                  (_, i) => i !== idx,
                                ),
                              })
                            }
                            className="absolute top-3 right-3 size-9 rounded-xl bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[2.5rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-16 text-center">
                      <ImageIcon
                        className="mx-auto mb-6 text-gray-200"
                        size={64}
                      />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                        Pipeline clean. No visual assets staged.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-6 pt-12 border-t border-gray-100 mt-12">
                  <button
                    type="submit"
                    className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-black py-5.5 rounded-3xl shadow-xl shadow-gray-900/10 active:scale-[0.98] transition-all uppercase tracking-widest"
                  >
                    {editingPkg ? "Override Specification" : "Finalize Deployment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-14 rounded-3xl bg-gray-50 border border-gray-100 font-black text-xs text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all uppercase tracking-widest"
                  >
                    Abort
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
