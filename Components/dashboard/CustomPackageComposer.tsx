"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  Plus,
  Loader2,
  Send,
  UserRound,
  Sparkles,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";

interface Client {
  _id: string;
  username: string;
  email: string;
}

/**
 * Composes a one-off package for a single client and sends it.
 *
 * Kept separate from the normal package editor because the intent is
 * different: this never joins the public catalogue, it is always tied to one
 * person, and it lands in their portal and their chat the moment it's saved.
 */
export default function CustomPackageComposer({
  open,
  onClose,
  onSent,
  presetUserId,
}: {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
  presetUserId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState(presetUserId || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discounted, setDiscounted] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [duration, setDuration] = useState("One-off");
  const [notes, setNotes] = useState("");
  const [featureInput, setFeatureInput] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [alsoMessage, setAlsoMessage] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setLoadingClients(true);
    axios
      .get("/api/dashboard/clients")
      .then((res) => {
        const list = res.data.clients || res.data.data || [];
        setClients(
          list.map((c: any) => ({
            _id: String(c._id),
            username: c.username || "",
            email: c.email || "",
          })),
        );
      })
      .catch(() => notify.error("Could not load clients"))
      .finally(() => setLoadingClients(false));
  }, [open]);

  const addFeature = () => {
    const v = featureInput.trim();
    if (!v || features.includes(v)) return;
    setFeatures((f) => [...f, v]);
    setFeatureInput("");
  };

  const reset = () => {
    setName("");
    setDescription("");
    setPrice("");
    setDiscounted("");
    setNotes("");
    setFeatures([]);
    setFeatureInput("");
  };

  const send = async () => {
    if (!userId) {
      notify.error("Pick a client", "A custom package belongs to one person");
      return;
    }
    if (!name.trim() || !price.trim()) {
      notify.error("Missing details", "A name and a price are required");
      return;
    }
    try {
      setSaving(true);
      const { data } = await axios.post("/api/packages/custom", {
        userId,
        name,
        description,
        price: Number(price),
        discountedPrice: discounted.trim() ? Number(discounted) : undefined,
        currency,
        duration,
        features,
        notes,
        sendChatMessage: alsoMessage,
      });
      if (!data.success) throw new Error(data.message);
      notify.success("Package sent", data.message);
      reset();
      onSent?.();
      onClose();
    } catch (err: any) {
      notify.error("Could not send", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !open) return null;

  const net = discounted.trim() || price || "0";

  return createPortal(
    <div
      className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl my-auto rounded-3xl border border-white/10 bg-[#0a0a0f] overflow-hidden flex flex-col max-h-[92vh]"
      >
        <header className="shrink-0 flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-white/8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-white tracking-tight">
                Custom package
              </h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Built for one client · stays off the public page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-accent flex items-center gap-1.5">
              <UserRound size={11} /> Client
            </span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loadingClients}
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent cursor-pointer disabled:opacity-50"
            >
              <option value="" className="bg-[#0a0a0f]">
                {loadingClients ? "Loading clients…" : "Choose a client"}
              </option>
              {clients.map((c) => (
                <option key={c._id} value={c._id} className="bg-[#0a0a0f]">
                  {c.username || c.email} {c.username ? `· ${c.email}` : ""}
                </option>
              ))}
            </select>
          </label>

          <FloatingInput
            label="Package name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <FloatingTextarea
            label="What it covers"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid sm:grid-cols-4 gap-3">
            <FloatingInput
              label="Price"
              type="number"
              min={0}
              containerClassName="sm:col-span-1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <FloatingInput
              label="After discount"
              type="number"
              min={0}
              containerClassName="sm:col-span-1"
              value={discounted}
              onChange={(e) => setDiscounted(e.target.value)}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent cursor-pointer"
            >
              {["USD", "PKR", "EUR", "GBP", "AED"].map((c) => (
                <option key={c} value={c} className="bg-[#0a0a0f]">
                  {c}
                </option>
              ))}
            </select>
            <FloatingInput
              label="Duration"
              containerClassName="sm:col-span-1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div className="space-y-2">
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
                className="px-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <span
                    key={f}
                    className="px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-[10px] font-bold border border-white/10 flex items-center gap-2 group"
                  >
                    {f}
                    <Trash2
                      size={10}
                      className="cursor-pointer opacity-50 group-hover:opacity-100 hover:text-red-400"
                      onClick={() =>
                        setFeatures((list) => list.filter((x) => x !== f))
                      }
                    />
                  </span>
                ))}
              </div>
            )}
          </div>

          <FloatingTextarea
            label="Private note for this client (optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoMessage}
              onChange={(e) => setAlsoMessage(e.target.checked)}
              className="size-4 accent-[#0083fe] cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-300">
              Also send them a chat message about it
            </span>
          </label>
        </div>

        <footer className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 p-5 sm:p-6 border-t border-white/8">
          <div className="text-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
              They'll be charged
            </span>
            <span className="text-xl font-black text-white tabular-nums">
              {currency} {net}
            </span>
          </div>
          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={send}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              Send to client
            </button>
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body,
  );
}
