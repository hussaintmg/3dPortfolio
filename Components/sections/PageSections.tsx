"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
  Settings2,
  X,
  Loader2,
  ImagePlus,
} from "lucide-react";
import axios from "axios";
import { useSite } from "@/context/SiteContext";
import { notify } from "@/lib/notify";
import { uploadFile } from "@/lib/uploadClient";
import { SECTION_TEMPLATES, getTemplate } from "@/lib/sectionTemplates";
import SectionRenderer, { SectionData } from "./SectionRenderer";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { cn } from "@/lib/cn";

/**
 * Renders the owner-managed sections for a page, plus the add/reorder/delete
 * controls when the owner is in edit mode.
 */
export default function PageSections({ page }: { page: string }) {
  const { canEdit, isEditing } = useSite();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerAt, setPickerAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<SectionData | null>(null);
  const [settingsFor, setSettingsFor] = useState<SectionData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/page-sections?page=${page}`);
      if (res.data.success) setSections(res.data.sections || []);
    } catch {
      // a failed fetch just means no custom sections render
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const addSection = async (template: string, index: number) => {
    try {
      setBusy(true);
      const res = await axios.post("/api/page-sections", { page, template });
      if (!res.data.success) {
        notify.error("Could not add section", res.data.message);
        return;
      }
      const created: SectionData = res.data.section;
      const next = [...sections];
      next.splice(index, 0, created);
      setSections(next);
      await axios.put("/api/page-sections", {
        order: next.map((s) => s._id),
      });
      setPickerAt(null);
      notify.success(res.data.message);
      // pull the seeded copy into the editor's content map
      window.location.hash = `section-${created._id}`;
      setTimeout(() => window.location.reload(), 250);
    } catch (err: any) {
      notify.error("Could not add section", err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const i = sections.findIndex((s) => s._id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
    await axios
      .put("/api/page-sections", { order: next.map((s) => s._id) })
      .catch(() => notify.error("Could not save the new order"));
  };

  const toggleVisible = async (s: SectionData) => {
    const next = sections.map((x) =>
      x._id === s._id ? { ...x, visible: !x.visible } : x,
    );
    setSections(next);
    await axios
      .patch(`/api/page-sections/${s._id}`, { visible: !s.visible })
      .catch(() => notify.error("Could not update visibility"));
  };

  const removeSection = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      await axios.delete(`/api/page-sections/${deleting._id}`);
      setSections((prev) => prev.filter((s) => s._id !== deleting._id));
      notify.success("Section removed");
      setDeleting(null);
    } catch (err: any) {
      notify.error("Delete failed", err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveContent = async (s: SectionData, content: Record<string, any>) => {
    setSections((prev) =>
      prev.map((x) => (x._id === s._id ? { ...x, content } : x)),
    );
    await axios
      .patch(`/api/page-sections/${s._id}`, { content })
      .catch(() => notify.error("Could not save section settings"));
  };

  const editing = canEdit && isEditing;
  const visibleSections = editing ? sections : sections.filter((s) => s.visible);

  if (loading || (!editing && visibleSections.length === 0)) return null;

  return (
    <>
      <div className="w-full">
        {editing && (
          <AddSectionSlot
            index={0}
            onOpen={() => setPickerAt(0)}
            label="Add a section here"
          />
        )}

        {visibleSections.map((section, i) => (
          <section
            key={section._id}
            id={`section-${section._id}`}
            className={cn(
              "relative w-full px-4 md:px-8 py-16 md:py-24",
              editing && "group/section",
              !section.visible && "opacity-40",
            )}
          >
            <div className="max-w-7xl mx-auto">
              <SectionRenderer section={section} />
            </div>

            {editing && (
              <SectionToolbar
                section={section}
                first={i === 0}
                last={i === visibleSections.length - 1}
                onMove={move}
                onToggle={() => toggleVisible(section)}
                onDelete={() => setDeleting(section)}
                onSettings={() => setSettingsFor(section)}
              />
            )}

            {editing && (
              <AddSectionSlot
                index={i + 1}
                onOpen={() => setPickerAt(i + 1)}
                label="Add a section here"
              />
            )}
          </section>
        ))}
      </div>

      {/* Template picker */}
      <TemplatePicker
        open={pickerAt !== null}
        busy={busy}
        onClose={() => setPickerAt(null)}
        onPick={(t) => addSection(t, pickerAt ?? sections.length)}
      />

      {/* Per-section settings (images, layout) */}
      <SectionSettings
        section={settingsFor}
        onClose={() => setSettingsFor(null)}
        onSave={saveContent}
      />

      <ConfirmationModal
        isOpen={!!deleting}
        title="Delete this section?"
        message="The section and all of its text, styles and animations will be permanently removed from this page."
        confirmText="Delete section"
        cancelText="Keep it"
        isLoading={busy}
        onConfirm={removeSection}
        onClose={() => setDeleting(null)}
        type="danger"
      />
    </>
  );
}

/** Thin "+" strip shown between sections in edit mode. */
function AddSectionSlot({
  onOpen,
  label,
}: {
  index: number;
  onOpen: () => void;
  label: string;
}) {
  return (
    <div className="relative h-0">
      <div className="absolute inset-x-0 -top-3 flex justify-center z-30">
        <button
          onClick={onOpen}
          className="group flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d0d14]/90 backdrop-blur-xl border border-dashed border-white/15 text-[9px] font-black uppercase tracking-widest text-gray-500 opacity-40 hover:opacity-100 hover:border-accent hover:text-accent transition-all"
        >
          <Plus size={12} />
          {label}
        </button>
      </div>
    </div>
  );
}

function SectionToolbar({
  section,
  first,
  last,
  onMove,
  onToggle,
  onDelete,
  onSettings,
}: {
  section: SectionData;
  first: boolean;
  last: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggle: () => void;
  onDelete: () => void;
  onSettings: () => void;
}) {
  const tpl = getTemplate(section.template);
  const hasSettings = ["imageText", "gallery", "spacer"].includes(
    section.template,
  );

  return (
    <div className="absolute top-3 right-4 z-40 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0d0d14]/92 backdrop-blur-xl border border-white/10 shadow-xl opacity-0 group-hover/section:opacity-100 transition-opacity">
      <span className="px-2.5 text-[9px] font-black uppercase tracking-widest text-gray-500">
        {tpl?.label || section.template}
      </span>
      <button
        onClick={() => onMove(section._id, -1)}
        disabled={first}
        title="Move up"
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors"
      >
        <ChevronUp size={14} />
      </button>
      <button
        onClick={() => onMove(section._id, 1)}
        disabled={last}
        title="Move down"
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors"
      >
        <ChevronDown size={14} />
      </button>
      {hasSettings && (
        <button
          onClick={onSettings}
          title="Section settings"
          className="p-1.5 rounded-lg text-gray-400 hover:text-accent hover:bg-white/10 transition-colors"
        >
          <Settings2 size={14} />
        </button>
      )}
      <button
        onClick={onToggle}
        title={section.visible ? "Hide from visitors" : "Show to visitors"}
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        {section.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        onClick={onDelete}
        title="Delete section"
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function TemplatePicker({
  open,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onPick: (template: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          data-edit-bar
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-3xl bg-[#0d0d14] border border-white/10 p-8 shadow-2xl"
            data-lenis-prevent
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Add a section
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Pick a template — you can edit every word and style afterwards.
                </p>
              </div>
              <button
                onClick={onClose}
                className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SECTION_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  disabled={busy}
                  onClick={() => onPick(t.id)}
                  className="group text-left rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3 hover:border-accent/40 hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  <div className="size-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-lg">
                    {t.glyph}
                  </div>
                  <p className="text-sm font-black text-white tracking-tight">
                    {t.label}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>

            {busy && (
              <div className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={32} />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Image / layout options for the templates that need them. */
function SectionSettings({
  section,
  onClose,
  onSave,
}: {
  section: SectionData | null;
  onClose: () => void;
  onSave: (s: SectionData, content: Record<string, any>) => void;
}) {
  const [content, setContent] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setContent(section?.content || {});
  }, [section]);

  if (!mounted || !section) return null;

  const upload = async (file: File): Promise<string | null> => {
    const res = await uploadFile(file, { folder: "sections" });
    if (!res.success) {
      notify.error("Upload failed", res.error);
      return null;
    }
    return res.publicUrl as string;
  };

  return createPortal(
    <div
      data-edit-bar
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0d0d14] border border-white/10 p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white tracking-tight">
            Section settings
          </h2>
          <button
            onClick={onClose}
            className="size-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {section.template === "imageText" && (
          <>
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                Image
              </span>
              <div className="aspect-video rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center">
                {content.imageUrl ? (
                  <img src={content.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus className="text-gray-700" size={28} />
                )}
              </div>
              <label className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 cursor-pointer transition-colors">
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                {content.imageUrl ? "Replace image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    const url = await upload(f);
                    setUploading(false);
                    if (url) setContent({ ...content, imageUrl: url });
                  }}
                />
              </label>
            </div>
            <button
              onClick={() => setContent({ ...content, flip: !content.flip })}
              className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-accent transition-colors"
            >
              Image on the {content.flip ? "right" : "left"} — click to flip
            </button>
          </>
        )}

        {section.template === "gallery" && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent">
              Images ({(content.images || []).length})
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(content.images || []).map((src: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() =>
                      setContent({
                        ...content,
                        images: (content.images || []).filter((_: string, x: number) => x !== i),
                      })
                    }
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 cursor-pointer transition-colors">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              Add image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(true);
                  const url = await upload(f);
                  setUploading(false);
                  if (url)
                    setContent({
                      ...content,
                      images: [...(content.images || []), url],
                    });
                }}
              />
            </label>
          </div>
        )}

        {section.template === "spacer" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Height
              </span>
              <input
                type="number"
                min={16}
                max={400}
                value={content.height ?? 96}
                onChange={(e) =>
                  setContent({ ...content, height: Number(e.target.value) })
                }
                className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </div>
            <button
              onClick={() => setContent({ ...content, line: content.line === false })}
              className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-accent transition-colors"
            >
              Divider line: {content.line === false ? "off" : "on"}
            </button>
          </div>
        )}

        <button
          onClick={() => {
            onSave(section, content);
            onClose();
          }}
          className="w-full py-4 rounded-2xl bg-accent hover:bg-accent-hover text-white font-black text-[11px] uppercase tracking-widest transition-colors"
        >
          Save settings
        </button>
      </div>
    </div>,
    document.body,
  );
}
