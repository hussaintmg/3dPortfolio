"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  KeyRound,
  Languages,
  Save,
} from "lucide-react";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";
import { Skeleton } from "@/Components/ui/Skeleton";
import Toggle from "@/Components/ui/Toggle";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { useAuth } from "@/context/AuthContext";

type Kind = "openrouter" | "gemini" | "groq" | "openai";

interface Preset {
  label: string;
  models: string[];
  needsBaseUrl: boolean;
  keyHint: string;
  docs: string;
}

interface Provider {
  _id: string;
  label: string;
  kind: Kind;
  model: string;
  baseUrl: string;
  enabled: boolean;
  order: number;
  keyPreview: string;
  lastTest: { ok: boolean | null; at: string | null; message: string; latencyMs: number | null } | null;
  successCount: number;
  failureCount: number;
  coolingDown: boolean;
}

interface AiSettings {
  enabled: boolean;
  chatAutoReply: boolean;
  awayAfterMinutes: number;
  minGapSeconds: number;
  maxRepliesPerThread: number;
  translationEnabled: boolean;
  defaultTranslateTarget: "english" | "urdu" | "roman-urdu";
}

const BLANK = {
  label: "",
  kind: "openrouter" as Kind,
  apiKey: "",
  model: "",
  baseUrl: "",
};

export default function AiProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [presets, setPresets] = useState<Record<Kind, Preset> | null>(null);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Provider | null>(null);
  const [rekeying, setRekeying] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        axios.get("/api/ai/providers"),
        axios.get("/api/ai/settings"),
      ]);
      if (p.data.success) {
        setProviders(p.data.providers);
        setPresets(p.data.presets);
      }
      if (s.data.success) setSettings(s.data.settings);
    } catch {
      notify.error("Could not load AI settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Choosing a provider should pre-fill a model that actually exists on it
  useEffect(() => {
    if (!presets) return;
    setForm((f) =>
      f.model && presets[f.kind].models.includes(f.model)
        ? f
        : { ...f, model: presets[f.kind].models[0] || "" },
    );
  }, [form.kind, presets]);

  const add = async () => {
    try {
      setSaving(true);
      const { data } = await axios.post("/api/ai/providers", form);
      if (!data.success) throw new Error(data.message);
      setProviders((p) => [...p, data.provider]);
      setForm(BLANK);
      setAdding(false);
      notify.success("Provider added", "Test it to make sure the key works");
      // Prove it immediately — a key that looks right often isn't
      test(data.provider._id);
    } catch (err: any) {
      notify.error("Could not add", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      const { data } = await axios.put("/api/ai/providers", { id, ...body });
      if (!data.success) throw new Error(data.message);
      setProviders((list) => list.map((p) => (p._id === id ? data.provider : p)));
      return true;
    } catch (err: any) {
      notify.error("Update failed", err.response?.data?.message || err.message);
      return false;
    }
  };

  const test = async (id?: string) => {
    try {
      setTesting(id || "all");
      const { data } = await axios.post("/api/ai/providers/test",
        id ? { id } : { all: true },
      );
      if (!data.success) throw new Error(data.message);

      const failed = data.results.filter((r: any) => !r.ok);
      if (failed.length === 0) {
        notify.success(
          data.total === 1 ? "Key works" : `All ${data.total} keys work`,
          data.results.map((r: any) => `${r.label}: ${r.latencyMs}ms`).join(" · "),
        );
      } else {
        notify.warning(
          `${data.working}/${data.total} working`,
          failed.map((r: any) => `${r.label}: ${r.error}`).join(" · "),
        );
      }
      load();
    } catch (err: any) {
      notify.error("Test failed", err.response?.data?.message || err.message);
    } finally {
      setTesting(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= providers.length) return;
    const reordered = [...providers];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setProviders(reordered);
    await Promise.all(
      reordered.map((p, i) =>
        axios.put("/api/ai/providers", { id: p._id, order: i }).catch(() => {}),
      ),
    );
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`/api/ai/providers?id=${deleting._id}`);
      setProviders((list) => list.filter((p) => p._id !== deleting._id));
      setDeleting(null);
      notify.success("Provider removed");
    } catch (err: any) {
      notify.error("Could not remove", err.response?.data?.message || err.message);
    }
  };

  const saveSettings = async (patchBody: Partial<AiSettings>) => {
    if (!settings) return;
    const optimistic = { ...settings, ...patchBody };
    setSettings(optimistic);
    try {
      const { data } = await axios.put("/api/ai/settings", patchBody);
      if (!data.success) throw new Error(data.message);
      setSettings(data.settings);
    } catch (err: any) {
      setSettings(settings); // roll back
      notify.error("Could not save", err.response?.data?.message || err.message);
    }
  };

  if (user && user.role !== "owner") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="size-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
          <Bot size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">Owner access only</h1>
        <p className="text-gray-500 font-medium max-w-sm">
          API keys can only be managed by the owner account.
        </p>
      </div>
    );
  }

  const working = providers.filter((p) => p.lastTest?.ok).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
            <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
              <Bot size={24} />
            </div>
            AI Providers
          </h1>
          <p className="text-gray-400 font-medium text-sm max-w-2xl">
            Add one or more API keys. They're tried in order, so if a free tier
            rate-limits you the next one picks up automatically. Keys are
            encrypted before they're stored and are never sent back to this
            page.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        ) : (
          <>
            {/* ── Behaviour ─────────────────────────────────────────────── */}
            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-6">
              <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                <Zap size={14} /> Assistant behaviour
              </h2>

              {settings && (
                <div className="space-y-5">
                  {(
                    [
                      [
                        "enabled",
                        "Assistant enabled",
                        "Master switch. Off means no AI calls at all.",
                      ],
                      [
                        "chatAutoReply",
                        "Reply to clients when I'm away",
                        "Short, language-matched answers while nobody is at the dashboard.",
                      ],
                      [
                        "translationEnabled",
                        "Translation in chat",
                        "Translate and explain buttons on chat messages.",
                      ],
                    ] as const
                  ).map(([field, title, help]) => (
                    <div
                      key={field}
                      className="flex items-start justify-between gap-5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white">{title}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-relaxed">
                          {help}
                        </p>
                      </div>
                      <Toggle
                        checked={settings[field]}
                        onChange={(v) => saveSettings({ [field]: v } as any)}
                      />
                    </div>
                  ))}

                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    {(
                      [
                        ["awayAfterMinutes", "Away after (min)", 1, 120],
                        ["minGapSeconds", "Min gap (sec)", 5, 600],
                        ["maxRepliesPerThread", "Max replies / thread", 1, 50],
                      ] as const
                    ).map(([field, label, min, max]) => (
                      <label key={field} className="block space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                          {label}
                        </span>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={settings[field]}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [field]: Number(e.target.value),
                            })
                          }
                          onBlur={(e) =>
                            saveSettings({
                              [field]: Number(e.target.value),
                            } as any)
                          }
                          className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent"
                        />
                      </label>
                    ))}
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500 flex items-center gap-1.5">
                      <Languages size={11} /> Default translation
                    </span>
                    <select
                      value={settings.defaultTranslateTarget}
                      onChange={(e) =>
                        saveSettings({
                          defaultTranslateTarget: e.target.value as any,
                        })
                      }
                      className="w-full sm:w-64 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent cursor-pointer"
                    >
                      <option value="english" className="bg-[#0d0d14]">English</option>
                      <option value="urdu" className="bg-[#0d0d14]">Urdu</option>
                      <option value="roman-urdu" className="bg-[#0d0d14]">Roman Urdu</option>
                    </select>
                  </label>
                </div>
              )}
            </section>

            {/* ── Keys ──────────────────────────────────────────────────── */}
            <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
                    <KeyRound size={14} /> Keys &amp; fallback order
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium mt-1.5">
                    {providers.length === 0
                      ? "No keys yet"
                      : `${working}/${providers.length} tested working · tried top to bottom`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {providers.length > 0 && (
                    <button
                      onClick={() => test()}
                      disabled={testing !== null}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      {testing === "all" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Zap size={13} />
                      )}
                      Test all
                    </button>
                  )}
                  <button
                    onClick={() => setAdding((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    <Plus size={13} /> Add key
                  </button>
                </div>
              </div>

              {adding && presets && (
                <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                        Provider
                      </span>
                      <select
                        value={form.kind}
                        onChange={(e) =>
                          setForm({ ...form, kind: e.target.value as Kind })
                        }
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent cursor-pointer"
                      >
                        {(Object.keys(presets) as Kind[]).map((k) => (
                          <option key={k} value={k} className="bg-[#0d0d14]">
                            {presets[k].label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                        Model
                      </span>
                      <input
                        list="ai-models"
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        placeholder={presets[form.kind].models[0]}
                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-accent placeholder:text-gray-600"
                      />
                      <datalist id="ai-models">
                        {presets[form.kind].models.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </label>
                  </div>

                  <FloatingInput
                    label="Name it (e.g. OpenRouter key 1)"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                  <FloatingInput
                    label={`API key (${presets[form.kind].keyHint})`}
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  />
                  {presets[form.kind].needsBaseUrl && (
                    <FloatingInput
                      label="Base URL (https://…/v1)"
                      value={form.baseUrl}
                      onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={add}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Save size={13} />
                      )}
                      Save &amp; test
                    </button>
                    <button
                      onClick={() => {
                        setAdding(false);
                        setForm(BLANK);
                      }}
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                    >
                      Cancel
                    </button>
                    {presets[form.kind].docs && (
                      <a
                        href={presets[form.kind].docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-accent hover:underline"
                      >
                        Get a free key <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {providers.length === 0 && !adding ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center space-y-2">
                  <Bot size={24} className="mx-auto text-gray-700" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    No providers configured
                  </p>
                  <p className="text-[11px] text-gray-600 font-medium">
                    OpenRouter, Gemini and Groq all have free tiers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map((p, i) => (
                    <div
                      key={p._id}
                      className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="p-1 rounded text-gray-600 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                            aria-label="Move up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === providers.length - 1}
                            className="p-1 rounded text-gray-600 hover:text-white disabled:opacity-20 transition-colors cursor-pointer"
                            aria-label="Move down"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-white truncate">
                              {p.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
                              {presets?.[p.kind]?.label || p.kind}
                            </span>
                            {p.lastTest?.ok === true && (
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-400">
                                <CheckCircle2 size={11} /> working
                                {p.lastTest.latencyMs
                                  ? ` · ${p.lastTest.latencyMs}ms`
                                  : ""}
                              </span>
                            )}
                            {p.lastTest?.ok === false && (
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400">
                                <XCircle size={11} /> failing
                              </span>
                            )}
                            {p.coolingDown && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                                cooling down
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-600 mt-1 truncate">
                            {p.model} · {p.keyPreview}
                            {p.successCount + p.failureCount > 0 &&
                              ` · ${p.successCount} ok / ${p.failureCount} failed`}
                          </p>
                          {p.lastTest?.ok === false && p.lastTest.message && (
                            <p className="text-[10px] text-red-400/80 font-medium mt-1 break-words">
                              {p.lastTest.message}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Toggle
                            checked={p.enabled}
                            onChange={(v) => patch(p._id, { enabled: v })}
                          />
                          <button
                            onClick={() => test(p._id)}
                            disabled={testing !== null}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-accent disabled:opacity-40 transition-colors cursor-pointer"
                            aria-label="Test this key"
                          >
                            {testing === p._id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Zap size={13} />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleting(p)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Replacing a key without recreating the provider */}
                      <div className="flex gap-2 pl-8">
                        <input
                          type="password"
                          placeholder="Paste a new key to replace it…"
                          value={rekeying[p._id] || ""}
                          onChange={(e) =>
                            setRekeying({ ...rekeying, [p._id]: e.target.value })
                          }
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-accent placeholder:text-gray-600"
                        />
                        <button
                          onClick={async () => {
                            const key = rekeying[p._id]?.trim();
                            if (!key) return;
                            const ok = await patch(p._id, { apiKey: key });
                            if (ok) {
                              setRekeying({ ...rekeying, [p._id]: "" });
                              notify.success("Key replaced");
                              test(p._id);
                            }
                          }}
                          disabled={!rekeying[p._id]?.trim()}
                          className="px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 text-gray-300 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleting}
        title="Remove this provider?"
        message={`"${deleting?.label}" will be deleted and its key erased. Any provider below it moves up the fallback order.`}
        confirmText="Remove"
        cancelText="Keep"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
        type="danger"
      />
    </div>
  );
}
