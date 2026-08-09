"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mails,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  MailX,
  MailCheck,
  History,
  FlaskConical,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import DataTable, { Column } from "@/Components/ui/DataTable";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import { Skeleton } from "@/Components/ui/Skeleton";

interface Subscriber {
  _id: string;
  email: string;
  subscribed?: boolean;
  source?: string;
  createdAt: string;
  lastSentAt?: string | null;
}

interface Campaign {
  _id: string;
  subject: string;
  topic: string;
  aiDrafted: boolean;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

const TOPICS = [
  { id: "packages", label: "Packages" },
  { id: "solutions", label: "Ready-made solutions" },
  { id: "custom", label: "Something else" },
] as const;

/**
 * The newsletter desk.
 *
 * Subscribers were being collected and then nothing happened to them. This
 * is the other half: see the list, have the assistant draft something from
 * the real catalogue, read it, test it on yourself, then send.
 */
export default function SubscribersPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);

  const [topic, setTopic] = useState<string>("packages");
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  const [mail, setMail] = useState({
    subject: "",
    body: "",
    ctaLabel: "",
    ctaUrl: "",
  });

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/subscribers");
      if (data.success) {
        setSubs(data.subscribers || []);
        setCampaigns(data.campaigns || []);
        setStats(data.stats || { total: 0, active: 0, unsubscribed: 0 });
      }
    } catch {
      notify.error("Could not load subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const draft = async () => {
    try {
      setDrafting(true);
      const { data } = await axios.post("/api/subscribers/draft", { topic, brief });
      if (!data.success) {
        notify.error("Draft failed", data.message);
        return;
      }
      setMail({
        subject: data.draft.subject,
        body: data.draft.body,
        ctaLabel: data.draft.ctaLabel,
        ctaUrl: data.draft.ctaUrl,
      });
      setAiDrafted(true);
      notify.success("Draft ready", `Written by ${data.provider} — read it before sending`);
    } catch (err: any) {
      notify.error("Draft failed", err.response?.data?.message || err.message);
    } finally {
      setDrafting(false);
    }
  };

  const sendTest = async () => {
    if (!user?.email) {
      notify.error("No address on your account to test with");
      return;
    }
    try {
      setTesting(true);
      const { data } = await axios.post("/api/subscribers/campaign", {
        ...mail,
        topic,
        aiDrafted,
        testTo: user.email,
      });
      if (data.success) notify.success("Test sent", `Check ${user.email}`);
      else notify.error("Test failed", data.message);
    } catch (err: any) {
      notify.error("Test failed", err.response?.data?.message || err.message);
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    try {
      setSending(true);
      setConfirmSend(false);
      const { data } = await axios.post("/api/subscribers/campaign", {
        ...mail,
        topic,
        aiDrafted,
      });
      if (data.success) {
        notify.success("Campaign sent", data.message);
        setMail({ subject: "", body: "", ctaLabel: "", ctaUrl: "" });
        setAiDrafted(false);
        load();
      } else notify.error("Send failed", data.message);
    } catch (err: any) {
      notify.error("Send failed", err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await axios.delete(`/api/subscribers?id=${deleting._id}`);
      setSubs((prev) => prev.filter((s) => s._id !== deleting._id));
      setDeleting(null);
      notify.success("Subscriber removed");
      load();
    } catch (err: any) {
      notify.error("Could not remove", err.response?.data?.message || err.message);
    }
  };

  const columns: Column<Subscriber>[] = [
    {
      id: "email",
      header: "Email",
      cell: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`size-9 rounded-xl flex items-center justify-center shrink-0 border ${
              r.subscribed === false
                ? "bg-white/5 text-gray-600 border-white/10"
                : "bg-accent/10 text-accent border-accent/20"
            }`}
          >
            {r.subscribed === false ? <MailX size={15} /> : <MailCheck size={15} />}
          </div>
          <span className="text-sm font-bold text-white truncate">{r.email}</span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => (
        <span
          className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
            r.subscribed === false
              ? "text-gray-500 bg-white/5 border-white/10"
              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          }`}
        >
          {r.subscribed === false ? "Unsubscribed" : "Active"}
        </span>
      ),
    },
    {
      id: "joined",
      header: "Joined",
      cell: (r) => (
        <span className="text-xs font-bold text-gray-500">
          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "last",
      header: "Last emailed",
      cell: (r) => (
        <span className="text-xs font-bold text-gray-500">
          {r.lastSentAt ? new Date(r.lastSentAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      locked: true,
      className: "text-right",
      cell: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleting(r);
          }}
          title="Remove from the list"
          className="size-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer ml-auto"
        >
          <Trash2 size={15} />
        </button>
      ),
    },
  ];

  const canSend = mail.subject.trim() && mail.body.trim() && stats.active > 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight flex items-center gap-4">
            <div className="size-12 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
              <Mails size={24} />
            </div>
            Subscribers
          </h1>
          <p className="text-gray-400 font-medium text-sm">
            Everyone who signed up in the footer — and the newsletters you send
            them.
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {(
            [
              ["Active", stats.active, "text-emerald-400"],
              ["Unsubscribed", stats.unsubscribed, "text-gray-500"],
              ["Total", stats.total, "text-white"],
            ] as const
          ).map(([label, value, tone]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-card px-4 py-5 sm:px-6"
            >
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-600">
                {label}
              </p>
              <p className={`text-2xl sm:text-3xl font-black tracking-tighter mt-1 tabular-nums ${tone}`}>
                {loading ? "—" : value}
              </p>
            </div>
          ))}
        </div>

        {/* Composer */}
        <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
              <Send size={14} /> Write a newsletter
            </h2>
            <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-2xl">
              The assistant drafts from your real packages and solutions, so it
              can't invent a price. Read what it wrote, send yourself a test,
              then send it to the list.
            </p>
          </div>

          {/* Topic + brief → AI draft */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTopic(t.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border ${
                    topic === t.id
                      ? "bg-accent text-white border-accent"
                      : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <FloatingTextarea
              label="Anything specific to mention? (optional)"
              rows={2}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />

            <button
              onClick={draft}
              disabled={drafting}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-gray-200 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              {drafting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} className="text-accent" />
              )}
              Draft it for me
            </button>
          </div>

          <FloatingInput
            label="Subject"
            value={mail.subject}
            onChange={(e) => setMail({ ...mail, subject: e.target.value })}
          />

          <FloatingTextarea
            label="Body — blank line = new paragraph, lines starting with '- ' become bullets"
            rows={10}
            value={mail.body}
            onChange={(e) => setMail({ ...mail, body: e.target.value })}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <FloatingInput
              label="Button label (optional)"
              value={mail.ctaLabel}
              onChange={(e) => setMail({ ...mail, ctaLabel: e.target.value })}
            />
            <FloatingInput
              label="Button link"
              value={mail.ctaUrl}
              onChange={(e) => setMail({ ...mail, ctaUrl: e.target.value })}
            />
          </div>

          {aiDrafted && (
            <p className="text-[11px] font-bold text-amber-400/90 leading-relaxed">
              Drafted by the assistant. Check every claim and price before this
              reaches {stats.active} inbox{stats.active === 1 ? "" : "es"}.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={sendTest}
              disabled={testing || !mail.subject.trim() || !mail.body.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-gray-200 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              {testing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FlaskConical size={13} />
              )}
              Send me a test
            </button>
            <button
              onClick={() => setConfirmSend(true)}
              disabled={sending || !canSend}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending
                ? "Sending…"
                : `Send to ${stats.active} subscriber${stats.active === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>

        {/* Past campaigns */}
        <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-5">
          <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
            <History size={14} /> Already sent
          </h2>

          {loading ? (
            <Skeleton className="h-20 w-full rounded-2xl" />
          ) : campaigns.length === 0 ? (
            <p className="text-xs font-bold text-gray-600 uppercase tracking-widest py-6 text-center">
              Nothing sent yet
            </p>
          ) : (
            <div className="space-y-2.5">
              {campaigns.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/2 px-4 sm:px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">
                      {c.subject}
                    </p>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                      {new Date(c.createdAt).toLocaleDateString()} · {c.topic}
                      {c.aiDrafted && " · ai draft"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-400 tabular-nums">
                      {c.sentCount}
                    </p>
                    {c.failedCount > 0 && (
                      <p className="text-[10px] font-bold text-red-400">
                        {c.failedCount} failed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <DataTable
          tableKey="dashboard-subscribers"
          columns={columns}
          rows={subs}
          rowKey={(r) => r._id}
          loading={loading}
          emptyMessage="Nobody has subscribed yet."
          gridCols={3}
          renderCard={(s: Subscriber) => (
            <div className="space-y-2">
              <p className="text-sm font-bold text-white truncate">{s.email}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                {s.subscribed === false ? "Unsubscribed" : "Active"} ·{" "}
                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          )}
        />
      </div>

      <ConfirmationModal
        isOpen={confirmSend}
        title={`Send to ${stats.active} subscribers?`}
        message="This goes out immediately and cannot be recalled. Send yourself a test first if you haven't."
        confirmText="Send it"
        cancelText="Not yet"
        isLoading={sending}
        onConfirm={send}
        onClose={() => setConfirmSend(false)}
        type="danger"
      />

      <ConfirmationModal
        isOpen={!!deleting}
        title="Remove subscriber"
        message={`${deleting?.email} will be deleted from the list entirely.`}
        confirmText="Remove"
        cancelText="Keep"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
        type="danger"
      />
    </div>
  );
}
