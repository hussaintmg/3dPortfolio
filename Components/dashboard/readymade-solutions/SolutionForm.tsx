"use client";

import { useState } from "react";
import { X, Upload, Loader2, Sparkles, Code2, Tag } from "lucide-react";
import ColorPicker from "@/Components/dashboard/ColorPicker";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";

interface SolutionFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export default function SolutionForm({ initialData, onSubmit, onClose, isLoading }: SolutionFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [techInput, setTechInput] = useState("");
  const [techList, setTechList] = useState<string[]>(initialData?.technologies || []);
  const [colorConfig, setColorConfig] = useState(initialData?.colorConfig || { type: "solid", colors: ["#6366F1"], gradientParams: { angle: 45 } });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialData?.media?.url || "");
  const [isUploading, setIsUploading] = useState(false);
  // Commercial fields — optional, and only a price puts it on sale
  const [price, setPrice] = useState(
    initialData?.price == null ? "" : String(initialData.price),
  );
  const [currency, setCurrency] = useState(initialData?.currency || "USD");
  const [deliveryNote, setDeliveryNote] = useState(initialData?.deliveryNote || "");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [featureInput, setFeatureInput] = useState("");
  const [featureList, setFeatureList] = useState<string[]>(
    initialData?.features || [],
  );

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v || featureList.includes(v)) return;
    setFeatureList((l) => [...l, v]);
    setFeatureInput("");
  };
  const removeFeature = (v: string) =>
    setFeatureList((l) => l.filter((f) => f !== v));

  const addTech = () => {
    if (techInput.trim() && !techList.includes(techInput.trim())) {
      setTechList([...techList, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTech = (t: string) => setTechList(techList.filter((item: string) => item !== t));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      let mediaData = initialData?.media || null;

      if (image) {
        // check image size with env variable
        const maxSizeMB = Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_IN_MB) || 5;
        if (image.size > 1024 * 1024 * maxSizeMB) {
          throw new Error(`Image size must be less than ${maxSizeMB}MB`);
        }
        // Upload to Supabase via server API proxy
        const formDataUpload = new FormData();
        formDataUpload.append("file", image);
        formDataUpload.append("folder", "readymade-solutions");

        const uploadResResponse = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });
        const uploadRes = await uploadResResponse.json();

        if (uploadRes.success) {
          mediaData = {
            url: uploadRes.publicUrl || "",
            name: image.name,
            size: image.size,
            type: uploadRes.fileType || "",
            storageKey: uploadRes.filePath || ""
          };
        } else {
          throw new Error("Image upload failed: " + (uploadRes.error || "Unknown error"));
        }
      }

      if (!mediaData && !initialData) {
         throw new Error("Please upload a representative image.");
      }

      const finalData = {
        title,
        technologies: techList,
        colorConfig,
        media: mediaData,
        // Left blank = portfolio-only; the packages page skips it
        price: price.trim() === "" ? null : Number(price),
        currency,
        deliveryNote,
        summary,
        features: featureList,
      };

      await onSubmit(finalData);
    } catch (error: any) {
      notify.error("Save failed", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 h-screen z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl h-[90%] bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] my-auto overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Floating Close button for mobile/desktop corner */}
        <button 
          type="button"
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all active:scale-90 border border-white/10 cursor-pointer md:hidden"
        >
          <X size={20} />
        </button>

        {/* Header Section */}
        <div className="relative border-b border-white/5 bg-zinc-900/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          <div className="p-6 md:p-8 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl hidden sm:block">
                  <Sparkles className="text-indigo-500" size={24} />
                </div>
                {initialData ? "Update Solution" : "New Solution"}
              </h2>
              <p className="text-gray-400 text-[10px] md:text-xs font-medium uppercase tracking-wider">Define your solution ecosystem and visual identity.</p>
            </div>
            
            <button 
              type="button"
              onClick={onClose} 
              className="hidden md:flex p-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-90 border border-white/10 cursor-pointer items-center gap-2 text-[10px] font-black tracking-widest uppercase"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <form data-lenis-prevent onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Tag size={12} /> Solution Title
                </label>
                <FloatingInput
                  label="Title (e.g. Enterprise Neural Dashboard)"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Code2 size={12} /> Tech Ecosystem
                </label>
                <div className="flex gap-2">
                  <FloatingInput
                    label="Add tech (React, Three.js...)"
                    containerClassName="flex-1"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTech())}
                  />
                  <button type="button" onClick={addTech} className="px-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-widest transition-all shadow-lg active:scale-95 uppercase">
                    ADD
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {techList.map((t: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-[10px] font-bold border border-white/10 flex items-center gap-2 group hover:border-indigo-500/30 hover:text-indigo-400 transition-colors">
                      {t}
                      <X size={10} className="cursor-pointer opacity-50 group-hover:opacity-100" onClick={() => removeTech(t)} />
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Pricing (optional) ─────────────────────────────────── */}
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/2 p-4">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Tag size={12} /> Pricing (optional)
                </label>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Leave the price empty to keep this portfolio-only. Set one
                  and it appears on the packages page for sale.
                </p>

                <div className="flex gap-2">
                  <FloatingInput
                    label="Price"
                    type="number"
                    min={0}
                    step="1"
                    containerClassName="flex-1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {["USD", "PKR", "EUR", "GBP", "AED"].map((c) => (
                      <option key={c} value={c} className="bg-[#0a0a0a]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <FloatingInput
                  label="Delivery note (e.g. Ready in 3 days)"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                />
                <FloatingInput
                  label="One-line summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />

                <div className="flex gap-2">
                  <FloatingInput
                    label="What's included"
                    containerClassName="flex-1"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addFeature())
                    }
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl font-black text-[10px] tracking-widest transition-all active:scale-95 uppercase cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {featureList.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-[10px] font-bold border border-white/10 flex items-center gap-2 group"
                    >
                      {f}
                      <X
                        size={10}
                        className="cursor-pointer opacity-50 group-hover:opacity-100"
                        onClick={() => removeFeature(f)}
                      />
                    </span>
                  ))}
                  {techList.length === 0 && <p className="text-gray-600 text-[10px] italic">No technologies defined.</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Upload size={12} /> Solution Artifact (Image)
                </label>
                <div className="group relative w-full aspect-video bg-white/3 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all">
                  {preview ? (
                    <>
                      <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                         <label className="px-6 py-3 bg-white text-black font-black rounded-xl text-[10px] cursor-pointer active:scale-95 transition-all uppercase tracking-widest shadow-2xl">
                           Change Visual
                           <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                         </label>
                      </div>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Load Visual Artifact</span>
                      <span className="text-[9px] text-gray-600 mt-2">WEBP, PNG, JPG recommended</span>
                      <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
               <ColorPicker config={colorConfig} onChange={setColorConfig} />
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4">
             <button 
               type="button" 
               onClick={onClose} 
               className="flex-1 py-4.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black rounded-2xl border border-white/10 transition-all text-[10px] uppercase tracking-[0.2em] active:scale-95 shadow-xl"
             >
               Abort Changes
             </button>
             <button 
               type="submit" 
               disabled={isLoading || isUploading} 
               className="flex-2 py-4.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white font-bold rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all text-[11px] uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3"
             >
               {(isLoading || isUploading) ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
               {initialData ? "Sync Global Artifact" : "Initialize New Solution"}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
