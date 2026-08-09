"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Camera,
  Loader2,
  Trash2,
  FileText,
  Download,
  MoreVertical,
  CheckCheck,
  Play,
  Languages,
  Sparkles,
  Bot,
  X,
  Reply,
  Pencil,
  Copy,
  ListChecks,
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import { getSocket } from "@/lib/socket-client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";
import MediaViewer, { type MediaItem } from "@/Components/chat/MediaViewer";
import MessageTicks, { tickState } from "@/Components/chat/MessageTicks";
import { uploadFile } from "@/lib/uploadClient";
import { uploadSizeError, kindFromMime, SIZE_LIMITS, formatBytes } from "@/lib/uploadLimits";

/** PDFs get the built-in reader; everything else stays a download. */
const isPdf = (a?: { name?: string; mime?: string; url?: string }) =>
  !!a &&
  (a.mime === "application/pdf" ||
    /\.pdf($|\?)/i.test(a.name || "") ||
    /\.pdf($|\?)/i.test(a.url || ""));

export interface ChatMsg {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: "user" | "admin" | "owner";
  type: "text" | "audio" | "image" | "video" | "file";
  text: string;
  attachment?: {
    url: string;
    name?: string;
    size?: number;
    mime?: string;
    storageKey?: string;
  };
  createdAt: string;
  /** Written by the assistant rather than a person. */
  isAi?: boolean;
  /** Tick state is derived from these — see MessageTicks. */
  deliveredTo?: string[];
  readBy?: string[];
  heardBy?: string[];
  editedAt?: string | null;
  replyTo?: { id?: string; text?: string; senderName?: string; type?: string };
  reactions?: { userId: string; emoji: string }[];
}

/** The row offered on long-press / right-click, WhatsApp-style. */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

/** A one-line summary of any message, for the reply quote and the menu. */
const previewOf = (m: ChatMsg) =>
  m.type === "text"
    ? m.text
    : m.type === "audio"
      ? "Voice note"
      : m.attachment?.name || m.type;

interface ChatThreadProps {
  /** Staff passes the client's conversation id; clients omit it. */
  conversationId?: string;
  className?: string;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtSize = (b?: number) =>
  !b ? "" : b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.ceil(b / 1024) + " KB";

/**
 * A video bubble that admits when it cannot render.
 *
 * A `<video>` whose source the browser refuses (an unsupported codec, or a
 * file stored under the wrong content type) collapses to an empty rectangle
 * with a play button on it — which is exactly what "the video went but does
 * not work" looked like. Now the failure says so and still offers the file.
 */
function VideoThumb({
  attachment,
  onOpen,
}: {
  attachment: NonNullable<ChatMsg["attachment"]>;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="size-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
          <Play size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white truncate">
            {attachment.name || "Video"}
          </p>
          <p className="text-[10px] text-gray-500 font-medium">
            This browser can&apos;t play it · {fmtSize(attachment.size)} · open or download
          </p>
        </div>
        <Download size={15} className="shrink-0 opacity-60" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-full cursor-pointer group/vid"
    >
      <video
        src={attachment.url}
        className="max-h-72 w-full pointer-events-none"
        preload="metadata"
        playsInline
        muted
        onError={() => setFailed(true)}
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/vid:bg-black/40 transition-colors">
        <span className="size-12 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white group-hover/vid:scale-110 transition-transform">
          <Play size={20} className="ml-0.5" />
        </span>
      </span>
    </button>
  );
}

export default function ChatThread({ conversationId, className }: ChatThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** 0–100 while an attachment is on its way to storage. */
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const uploadAbort = useRef<AbortController | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  /** The message being quoted by whatever is in the composer. */
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  /** An own text message open for rewriting, held separately from the composer. */
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  /** Multi-select for deleting several at once. */
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState<"me" | "everyone" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; mode: "me" | "everyone" } | null>(null);
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  /** Per-message translation/explanation, keyed by message id. */
  const [aiNotes, setAiNotes] = useState<
    Record<string, { mode: "translate" | "explain"; text: string; busy?: boolean }>
  >({});
  /** A translated version of what the owner is composing, pending approval. */
  const [draft, setDraft] = useState<
    { label: string; text: string; busy?: boolean } | null
  >(null);

  /** Every viewable attachment in the thread, so the viewer can page through. */
  const mediaItems: MediaItem[] = messages.reduce<MediaItem[]>((acc, m) => {
    const a = m.attachment;
    if (!a?.url) return acc;
    const kind: MediaItem["kind"] | null =
      m.type === "image"
        ? "image"
        : m.type === "video"
          ? "video"
          : isPdf(a)
            ? "pdf"
            : null;
    if (!kind) return acc;
    acc.push({ url: a.url, name: a.name, mime: a.mime, size: a.size, kind });
    return acc;
  }, []);

  const openMedia = (m: ChatMsg, kind: MediaItem["kind"]) => {
    if (!m.attachment?.url) return;
    setViewing({
      url: m.attachment.url,
      name: m.attachment.name,
      mime: m.attachment.mime,
      size: m.attachment.size,
      kind,
    });
  };

  /**
   * Translate or explain one message. Staff-only — the endpoint refuses
   * anyone else, and there is no reason to spend a client's goodwill (or the
   * owner's API credits) on it.
   */
  const runAi = async (m: ChatMsg, mode: "translate" | "explain") => {
    if (!m.text?.trim()) return;
    setMenuFor(null);
    setAiNotes((n) => ({ ...n, [m._id]: { mode, text: "", busy: true } }));
    try {
      const { data } = await axios.post("/api/ai/translate", {
        text: m.text,
        mode,
      });
      if (!data.success) throw new Error(data.message);
      setAiNotes((n) => ({ ...n, [m._id]: { mode, text: data.result } }));
    } catch (err: any) {
      setAiNotes((n) => {
        const next = { ...n };
        delete next[m._id];
        return next;
      });
      notify.error(
        mode === "translate" ? "Could not translate" : "Could not explain",
        err.response?.data?.message || err.message,
      );
    }
  };

  const LABELS: Record<string, string> = {
    english: "English",
    urdu: "Urdu",
    "roman-urdu": "Roman Urdu",
  };

  /** Translates the composer's contents without sending anything. */
  const translateDraft = async (target: "english" | "urdu" | "roman-urdu") => {
    const source = text.trim();
    if (!source) return;
    setDraft({ label: LABELS[target], text: "", busy: true });
    try {
      const { data } = await axios.post("/api/ai/translate", {
        text: source,
        target,
        mode: "translate",
      });
      if (!data.success) throw new Error(data.message);
      setDraft({ label: LABELS[target], text: data.result });
    } catch (err: any) {
      setDraft(null);
      notify.error(
        "Could not translate",
        err.response?.data?.message || err.message,
      );
    }
  };
  const [deleting, setDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadIdRef = useRef<string>("");
  /**
   * Long-press timer, held in a ref rather than a per-render local.
   *
   * A local `let` inside the message map is recreated on every render, so a
   * re-render between touchstart and touchend left the old timer running
   * with nothing able to clear it — the menu then opened after a tap.
   */
  const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = useCallback(() => {
    if (pressRef.current) clearTimeout(pressRef.current);
    pressRef.current = null;
  }, []);

  const isStaff = user?.role === "admin" || user?.role === "owner";
  const threadId = isStaff ? conversationId : user?.id;

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const fetchMessages = useCallback(
    async (initial = false) => {
      if (!threadId) return;
      try {
        const res = await axios.get("/api/chat", {
          params: isStaff ? { conversationId: threadId } : {},
        });
        if (res.data.success) {
          setMessages(res.data.messages || []);
          threadIdRef.current = res.data.conversationId;
          if (initial) setTimeout(() => scrollToBottom(false), 60);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [threadId, isStaff, scrollToBottom],
  );

  // Initial load + polling fallback (works even without sockets, e.g. Vercel)
  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    fetchMessages(true);
    axios.put("/api/chat", { conversationId: threadId }).catch(() => {});
    const poll = setInterval(fetchMessages, 5000);
    return () => clearInterval(poll);
  }, [threadId, fetchMessages]);

  /**
   * Tell the server a human is watching.
   *
   * This is what stops the assistant from answering over the top of a live
   * conversation: while this heartbeat is fresh, auto-reply stands down.
   */
  useEffect(() => {
    if (!isStaff) return;
    const beat = () => {
      if (document.visibilityState === "hidden") return;
      axios.post("/api/ai/settings").catch(() => {});
    };
    beat();
    const id = setInterval(beat, 45000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [isStaff]);

  // Realtime via socket.io (instant when the socket server is available)
  useEffect(() => {
    if (!threadId || !user) return;
    const socket = getSocket();
    const rooms = [`conv:${threadId}`];
    if (isStaff) rooms.push("staff");
    socket.emit("chat:join", rooms);

    const onNew = (msg: ChatMsg) => {
      if (msg.conversationId !== threadId) return;
      setMessages((prev) =>
        prev.some((m) => m._id === msg._id) ? prev : [...prev, msg],
      );
      axios.put("/api/chat", { conversationId: threadId }).catch(() => {});
      setTimeout(() => scrollToBottom(), 60);
    };
    const onDelete = (p: { conversationId: string; id: string }) => {
      if (p.conversationId !== threadId) return;
      setMessages((prev) => prev.filter((m) => m._id !== p.id));
    };

    /** An edit or a reaction — the message stays, its contents change. */
    const onUpdate = (msg: ChatMsg) => {
      if (msg.conversationId !== threadId) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    socket.on("chat:new", onNew);
    socket.on("chat:delete", onDelete);
    socket.on("chat:update", onUpdate);
    return () => {
      socket.off("chat:new", onNew);
      socket.off("chat:delete", onDelete);
      socket.off("chat:update", onUpdate);
    };
  }, [threadId, user, isStaff, scrollToBottom]);

  // Close message menus on outside click
  /**
   * Close the message menu when clicking elsewhere.
   *
   * Registered only while a menu is open, and only from the next tick: Next's
   * React root is attached to `document`, so a listener added here shares the
   * node with React's own delegated handler. Added up front it fires after
   * the button's onClick and closes the menu in the same click that opened
   * it — which is exactly what used to happen.
   */
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    const id = setTimeout(
      () => document.addEventListener("click", close),
      0,
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", close);
    };
  }, [menuFor]);

  const pushMessage = (msg: ChatMsg) => {
    setMessages((prev) => [...prev, msg]);
    getSocket().emit("chat:new", msg);
    setTimeout(() => scrollToBottom(), 60);
  };

  /** Swap one message in place and tell the other side about it. */
  const applyUpdate = (msg: ChatMsg, broadcast = true) => {
    setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    if (broadcast) getSocket().emit("chat:update", msg);
  };

  /**
   * Add, change or take back a reaction.
   *
   * Applied locally first: the server is the authority, but waiting for a
   * round-trip to see your own tap land makes the whole thing feel broken on
   * a slow connection.
   */
  const react = async (m: ChatMsg, emoji: string) => {
    setMenuFor(null);
    if (!user) return;

    const existing = (m.reactions || []).find((r) => r.userId === user.id);
    const optimistic: ChatMsg = {
      ...m,
      reactions:
        existing?.emoji === emoji
          ? (m.reactions || []).filter((r) => r.userId !== user.id)
          : [
              ...(m.reactions || []).filter((r) => r.userId !== user.id),
              { userId: user.id, emoji },
            ],
    };
    applyUpdate(optimistic, false);

    try {
      const { data } = await axios.patch("/api/chat/message", {
        id: m._id,
        action: "react",
        emoji,
      });
      if (data.success) applyUpdate(data.message);
      else throw new Error(data.message);
    } catch (err: any) {
      applyUpdate(m, false); // put it back
      notify.error("Could not react", err.response?.data?.message || err.message);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const next = editing.text.trim();
    if (!next) return;
    try {
      setSavingEdit(true);
      const { data } = await axios.patch("/api/chat/message", {
        id: editing.id,
        action: "edit",
        text: next,
      });
      if (!data.success) throw new Error(data.message);
      applyUpdate(data.message);
      setEditing(null);
    } catch (err: any) {
      notify.error("Edit failed", err.response?.data?.message || err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Multi-select ──────────────────────────────────────────────────────────
  const toggleSelected = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const leaveSelectMode = () => {
    setSelecting(false);
    setSelected([]);
  };

  const bulkDelete = async () => {
    if (!confirmBulk || selected.length === 0) return;
    const mode = confirmBulk;
    const ids = [...selected];
    try {
      setDeleting(true);
      const { data } = await axios.post("/api/chat/message", { ids, mode });
      if (!data.success) throw new Error(data.message);

      setMessages((prev) => prev.filter((m) => !ids.includes(m._id)));
      if (mode === "everyone") {
        const socket = getSocket();
        // The delete event is per-message, so one per id
        ids.forEach((id) =>
          socket.emit("chat:delete", { conversationId: threadId, id }),
        );
      }
      notify.success(
        `${data.removed} deleted`,
        data.skipped ? `${data.skipped} were not yours to delete` : undefined,
      );
      leaveSelectMode();
    } catch (err: any) {
      notify.error("Delete failed", err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
      setConfirmBulk(null);
    }
  };

  const sendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    try {
      setSending(true);
      const res = await axios.post("/api/chat", {
        type: "text",
        text: value,
        conversationId: threadId,
        // A snapshot, not just an id — the original can be deleted later
        replyTo: replyTo
          ? {
              id: replyTo._id,
              text: previewOf(replyTo),
              senderName: replyTo.senderName,
              type: replyTo.type,
            }
          : undefined,
      });
      if (res.data.success) {
        setText("");
        setReplyTo(null);
        pushMessage(res.data.message);
      } else {
        notify.error("Send failed", res.data.message);
      }
    } catch (err: any) {
      notify.error("Send failed", err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  const cancelUpload = () => uploadAbort.current?.abort();

  const sendAttachment = async (file: File) => {
    if (uploading) return;
    const mime = file.type || "application/octet-stream";
    const type: ChatMsg["type"] = kindFromMime(mime);

    // Refuse locally rather than after a long upload — a person watching a
    // 40MB video crawl to 100% only to be told "too large" has wasted minutes
    // and their mobile data.
    const tooBig = uploadSizeError(file.size, mime);
    if (tooBig) {
      notify.error("Can't send this file", tooBig);
      return;
    }

    const controller = new AbortController();
    uploadAbort.current = controller;

    try {
      setUploading(true);
      setUploadPct(0);
      setUploadName(file.name);

      const up = await uploadFile(file, {
        folder: "chat",
        signal: controller.signal,
        onProgress: setUploadPct,
      });
      if (!up.success) throw new Error(up.error || "Upload failed");

      const res = await axios.post("/api/chat", {
        type,
        conversationId: threadId,
        attachment: {
          url: up.publicUrl,
          name: file.name,
          size: file.size,
          // Store what actually landed in storage, not what the OS guessed —
          // the player reads this to decide whether it can play the file.
          mime: up.contentType || mime,
          storageKey: up.filePath,
        },
      });
      if (res.data.success) pushMessage(res.data.message);
      else notify.error("Send failed", res.data.message);
    } catch (err: any) {
      if (!controller.signal.aborted) {
        notify.error("Attachment failed", err.message);
      }
    } finally {
      uploadAbort.current = null;
      setUploading(false);
      setUploadPct(0);
      setUploadName("");
    }
  };

  // ── Voice notes ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 500) {
          const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type });
          sendAttachment(file);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecordSecs(0);
      setRecording(true);
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      notify.error("Microphone unavailable", "Please allow microphone access to send voice notes.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => () => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      const res = await axios.delete("/api/chat", {
        params: { id: confirmDelete.id, mode: confirmDelete.mode },
      });
      if (res.data.success) {
        setMessages((prev) => prev.filter((m) => m._id !== confirmDelete.id));
        if (confirmDelete.mode === "everyone") {
          getSocket().emit("chat:delete", {
            conversationId: threadId,
            id: confirmDelete.id,
          });
        }
        notify.success(res.data.message);
      } else notify.error("Delete failed", res.data.message);
    } catch (err: any) {
      notify.error("Delete failed", err.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  if (!user) return null;

  return (
    <div className={`flex flex-col h-full min-h-0 ${className || ""}`}>
      {/* Selection bar — replaces nothing, sits above the thread */}
      {selecting && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-white/8 bg-accent/8">
          <button
            onClick={leaveSelectMode}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
          <span className="text-xs font-black text-white">
            {selected.length} selected
          </span>
          <div className="flex-1" />
          <button
            disabled={selected.length === 0}
            onClick={() => setConfirmBulk("me")}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            Delete for me
          </button>
          <button
            disabled={selected.length === 0}
            onClick={() => setConfirmBulk("everyone")}
            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            For everyone
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        data-lenis-prevent
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-6 space-y-4"
      >
        {loading ? (
          <div className="space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-14 rounded-3xl ${i % 2 ? "w-52" : "w-64"}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
            <div className="size-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <Send size={22} />
            </div>
            <p className="text-sm font-bold text-white">Start the conversation</p>
            <p className="text-xs text-gray-500 font-medium max-w-xs">
              Tell me about your project — text, voice note, images or files.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            /**
             * The assistant answers on the studio's behalf, so to staff it is
             * "us" and belongs on their side of the thread. Rendering it as
             * an incoming message made the owner's own auto-replies look
             * like something a client had sent.
             */
            const own = m.senderId === user.id || (isStaff && !!m.isAi);
            const canDeleteEveryone = own || isStaff;
            const isSelected = selected.includes(m._id);
            /** Only your own words, and only words. */
            const canEdit = m.senderId === user.id && m.type === "text";

            /**
             * Long-press opens the menu on touch, where there is no
             * right-click and no hover — the ⋮ button was `opacity-0
             * group-hover:opacity-100`, i.e. permanently invisible on a
             * phone, so none of this was reachable there at all.
             */
            const startPress = () => {
              cancelPress();
              pressRef.current = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate(12);
                setMenuFor(m._id);
              }, 450);
            };

            return (
              <div
                key={m._id}
                onClick={() => selecting && toggleSelected(m._id)}
                className={`flex ${own ? "justify-end" : "justify-start"} group ${
                  selecting ? "cursor-pointer" : ""
                } ${isSelected ? "bg-accent/10 -mx-4 px-4 sm:-mx-6 sm:px-6 py-1 rounded-xl" : ""}`}
              >
                {selecting && (
                  <span
                    className={`self-center mr-3 size-5 rounded-md border shrink-0 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-accent border-accent text-white"
                        : "border-white/25"
                    }`}
                  >
                    {isSelected && <CheckCheck size={12} />}
                  </span>
                )}
                <div
                  onContextMenu={(e) => {
                    if (selecting) return;
                    e.preventDefault();
                    setMenuFor(m._id);
                  }}
                  onTouchStart={selecting ? undefined : startPress}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                  onTouchCancel={cancelPress}
                  className={`relative max-w-[85%] sm:max-w-[70%] ${own ? "order-1" : ""}`}
                >
                  {/* Sender label (only for staff viewing client, or client viewing staff) */}
                  {!own && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1 ml-3 flex items-center gap-1.5">
                      {m.senderRole === "user" ? m.senderName : "Hussain"}
                      {/* Never let a client think a bot was the person */}
                      {m.isAi && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/15 border border-accent/25 text-accent">
                          <Bot size={9} /> auto-reply
                        </span>
                      )}
                    </p>
                  )}
                  {/* The quoted message, snapshotted at send time so it
                      survives the original being deleted. */}
                  {m.replyTo?.id && (
                    <div
                      className={`mb-1 px-3 py-2 rounded-2xl border-l-2 text-[11px] ${
                        own
                          ? "bg-accent/15 border-accent/60 ml-auto"
                          : "bg-white/5 border-white/25"
                      }`}
                    >
                      <p className="font-black text-[9px] uppercase tracking-widest text-accent truncate">
                        {m.replyTo.senderName || "Message"}
                      </p>
                      <p className="text-gray-400 font-medium truncate">
                        {m.replyTo.text ||
                          (m.replyTo.type ? `a ${m.replyTo.type}` : "…")}
                      </p>
                    </div>
                  )}
                  <div
                    className={`rounded-3xl overflow-hidden border ${
                      own
                        ? "bg-accent text-white border-accent/40 rounded-br-lg"
                        : "bg-white/5 text-gray-200 border-white/10 rounded-bl-lg"
                    }`}
                  >
                    {m.type === "text" && editing?.id === m._id ? (
                      /* Edited in place rather than in the composer — moving
                         the text down there loses sight of what it replies
                         to and of the messages around it. */
                      <div className="p-2.5 space-y-2 min-w-[240px]">
                        <textarea
                          autoFocus
                          value={editing.text}
                          onChange={(e) =>
                            setEditing({ id: m._id, text: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditing(null);
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            }
                          }}
                          rows={2}
                          className="w-full bg-black/25 border border-white/25 rounded-2xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-white/60 resize-none custom-scrollbar"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditing(null)}
                            className="px-3 py-1.5 rounded-lg bg-black/25 text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit || !editing.text.trim()}
                            className="px-3 py-1.5 rounded-lg bg-white text-black text-[9px] font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                          >
                            {savingEdit && <Loader2 size={10} className="animate-spin" />}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : m.type === "text" ? (
                      <p className="px-4 py-3 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                    ) : null}
                    {m.type === "image" && m.attachment?.url && (
                      <button
                        type="button"
                        onClick={() => openMedia(m, "image")}
                        className="block cursor-zoom-in"
                      >
                        <img
                          src={m.attachment.url}
                          alt={m.attachment.name || "image"}
                          className="max-h-72 w-auto object-cover"
                          loading="lazy"
                        />
                      </button>
                    )}
                    {m.type === "video" && m.attachment?.url && (
                      <VideoThumb
                        attachment={m.attachment}
                        onOpen={() => openMedia(m, "video")}
                      />
                    )}
                    {m.type === "audio" && m.attachment?.url && (
                      <div className="px-3 py-2.5 min-w-[240px]">
                        <audio src={m.attachment.url} controls className="w-full h-10" preload="metadata" />
                      </div>
                    )}
                    {m.type === "file" && m.attachment?.url && isPdf(m.attachment) ? (
                      <button
                        type="button"
                        onClick={() => openMedia(m, "pdf")}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${own ? "hover:bg-white/10" : "hover:bg-white/5"}`}
                      >
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${own ? "bg-white/15" : "bg-red-500/15 text-red-400"}`}
                        >
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs font-bold truncate max-w-[180px]">
                            {m.attachment.name || "Document.pdf"}
                          </p>
                          <p
                            className={`text-[10px] font-medium ${own ? "text-white/70" : "text-gray-500"}`}
                          >
                            PDF · {fmtSize(m.attachment.size)} · tap to read
                          </p>
                        </div>
                      </button>
                    ) : m.type === "file" && m.attachment?.url ? (
                      <a
                        href={m.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${own ? "hover:bg-white/10" : "hover:bg-white/5"}`}
                      >
                        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${own ? "bg-white/15" : "bg-accent/15 text-accent"}`}>
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate max-w-[180px]">{m.attachment.name || "File"}</p>
                          <p className={`text-[10px] font-medium ${own ? "text-white/70" : "text-gray-500"}`}>
                            {fmtSize(m.attachment.size)}
                          </p>
                        </div>
                        <Download size={15} className="shrink-0 opacity-60" />
                      </a>
                    ) : null}
                  </div>
                  {/* Reactions, grouped by emoji. Yours is outlined, and
                      tapping it again takes it back. */}
                  {(m.reactions?.length ?? 0) > 0 && (
                    <div
                      className={`flex flex-wrap gap-1 -mt-1.5 ${own ? "justify-end mr-2" : "ml-3"}`}
                    >
                      {Object.entries(
                        (m.reactions || []).reduce<Record<string, string[]>>(
                          (acc, r) => {
                            (acc[r.emoji] ||= []).push(r.userId);
                            return acc;
                          },
                          {},
                        ),
                      ).map(([emoji, ids]) => {
                        const mine = ids.includes(user.id);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              react(m, emoji);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px] leading-none transition-colors cursor-pointer ${
                              mine
                                ? "bg-accent/20 border-accent/50"
                                : "bg-white/5 border-white/10 hover:border-white/25"
                            }`}
                          >
                            <span>{emoji}</span>
                            {ids.length > 1 && (
                              <span className="text-[9px] font-black text-gray-400">
                                {ids.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p
                    className={`text-[9px] font-bold text-gray-600 mt-1 flex items-center gap-1 ${
                      own ? "justify-end mr-2" : "ml-3"
                    }`}
                  >
                    {fmtTime(m.createdAt)}
                    {m.editedAt && <span className="italic">· edited</span>}
                    {/* Ticks belong to what YOU sent — nobody needs a read
                        receipt on a message they received. */}
                    {own && (
                      <MessageTicks
                        state={tickState(m, user.id)}
                        isVoice={m.type === "audio"}
                        heard={(m.heardBy || []).some((id) => id !== m.senderId)}
                      />
                    )}
                  </p>

                  {/* Message menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === m._id ? null : m._id);
                    }}
                    aria-label="Message actions"
                    aria-expanded={menuFor === m._id}
                    className={`absolute top-1 ${own ? "-left-8" : "-right-8"} p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-all`}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuFor === m._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute top-8 ${own ? "right-full mr-2" : "left-full ml-2"} z-20 w-48 rounded-2xl bg-[#12121c] border border-white/10 shadow-2xl overflow-hidden`}
                    >
                      {/* Reaction row first — it is the most-used action and
                          wants a tap, not a menu item. */}
                      <div className="flex items-center justify-between px-2.5 py-2 border-b border-white/8">
                        {QUICK_REACTIONS.map((emoji) => {
                          const mine = (m.reactions || []).some(
                            (r) => r.userId === user.id && r.emoji === emoji,
                          );
                          return (
                            <button
                              key={emoji}
                              onClick={() => react(m, emoji)}
                              className={`size-7 rounded-full text-base leading-none flex items-center justify-center transition-transform hover:scale-125 cursor-pointer ${
                                mine ? "bg-accent/25" : ""
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => {
                          setMenuFor(null);
                          setReplyTo(m);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <Reply size={13} /> Reply
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            setEditing({ id: m._id, text: m.text });
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}

                      {m.type === "text" && !!m.text?.trim() && (
                        <button
                          onClick={() => {
                            setMenuFor(null);
                            navigator.clipboard
                              ?.writeText(m.text)
                              .then(() => notify.success("Copied"))
                              .catch(() => {});
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                        >
                          <Copy size={13} /> Copy text
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setMenuFor(null);
                          setSelecting(true);
                          setSelected([m._id]);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                      >
                        <ListChecks size={13} /> Select messages
                      </button>

                      <button
                        onClick={() => { setMenuFor(null); setConfirmDelete({ id: m._id, mode: "me" }); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                      >
                        <Trash2 size={13} /> Delete for me
                      </button>
                      {/* Understanding a client's message is staff-only work */}
                      {isStaff && m.type === "text" && !!m.text?.trim() && (
                        <>
                          <button
                            onClick={() => runAi(m, "translate")}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                          >
                            <Languages size={13} /> Translate
                          </button>
                          <button
                            onClick={() => runAi(m, "explain")}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5 border-t border-white/5"
                          >
                            <Sparkles size={13} /> Explain this
                          </button>
                        </>
                      )}
                      {canDeleteEveryone && (
                        <button
                          onClick={() => { setMenuFor(null); setConfirmDelete({ id: m._id, mode: "everyone" }); }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 border-t border-white/5"
                        >
                          <Trash2 size={13} /> Delete for everyone
                        </button>
                      )}
                    </div>
                  )}

                  {/* Translation / explanation, shown under the message it
                      belongs to and never sent anywhere by itself. */}
                  {aiNotes[m._id] && (
                    <div
                      className={`mt-2 rounded-2xl border border-accent/25 bg-accent/8 px-3.5 py-2.5 ${own ? "text-right" : ""}`}
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5 mb-1">
                        {aiNotes[m._id].mode === "translate" ? (
                          <Languages size={10} />
                        ) : (
                          <Sparkles size={10} />
                        )}
                        {aiNotes[m._id].mode === "translate"
                          ? "Translation"
                          : "What they mean"}
                      </p>
                      {aiNotes[m._id].busy ? (
                        <span className="inline-flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                          <Loader2 size={11} className="animate-spin" /> Working…
                        </span>
                      ) : (
                        <>
                          <p className="text-[12px] text-gray-200 font-medium leading-relaxed whitespace-pre-wrap text-left">
                            {aiNotes[m._id].text}
                          </p>
                          <div className="flex gap-3 mt-2 justify-start">
                            <button
                              onClick={() =>
                                navigator.clipboard
                                  ?.writeText(aiNotes[m._id].text)
                                  .then(() => notify.success("Copied"))
                                  .catch(() => {})
                              }
                              className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() =>
                                setAiNotes((n) => {
                                  const next = { ...n };
                                  delete next[m._id];
                                  return next;
                                })
                              }
                              className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
                            >
                              Hide
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-white/8 bg-white/2 backdrop-blur-xl p-3 sm:p-4">
        {/* A big video takes real time to leave the device. Without this the
            UI looked frozen and people assumed it had failed. */}
        {uploading && (
          <div className="mb-3 rounded-2xl border border-accent/25 bg-accent/8 px-4 py-3">
            <div className="flex items-center gap-3">
              <Loader2 size={14} className="animate-spin text-accent shrink-0" />
              <span className="text-xs font-bold text-white truncate flex-1 min-w-0">
                {uploadName || "Uploading…"}
              </span>
              <span className="text-xs font-black text-accent tabular-nums shrink-0">
                {uploadPct}%
              </span>
              <button
                type="button"
                onClick={cancelUpload}
                title="Cancel upload"
                className="size-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-400/40 transition-all shrink-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}
        {/* What this message will quote. Shown here, above the box, because
            that is where it appears once sent. */}
        {replyTo && (
          <div className="mb-3 flex items-start gap-3 rounded-2xl border-l-2 border-accent bg-accent/8 px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent">
                Replying to {replyTo.senderName || "message"}
              </p>
              <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                {previewOf(replyTo)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {recording ? (
          <div className="flex items-center gap-4 px-2">
            <div className="flex items-center gap-3 flex-1">
              <span className="size-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-black text-white tabular-nums">
                {Math.floor(recordSecs / 60)}:{String(recordSecs % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-500 font-medium">Recording voice note…</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent text-white text-xs font-black uppercase tracking-widest hover:bg-accent-hover transition-all active:scale-95"
            >
              <Square size={14} /> Stop & Send
            </button>
          </div>
        ) : (
          <form onSubmit={sendText} className="flex items-end gap-2">
            {/* Attach any file */}
            <label
              title={`Attach a file — video up to ${formatBytes(SIZE_LIMITS.video)}`}
              className="size-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-accent hover:border-accent/40 transition-all cursor-pointer active:scale-95"
            >
              {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) sendAttachment(f);
                  e.target.value = "";
                }}
              />
            </label>
            {/* Capture / pick image */}
            <label className="size-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 items-center justify-center text-gray-400 hover:text-accent hover:border-accent/40 transition-all cursor-pointer active:scale-95 hidden sm:flex">
              <Camera size={17} />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) sendAttachment(f);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="flex-1 min-w-0 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                className="w-full max-h-32 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-accent/50 transition-all resize-none custom-scrollbar placeholder:text-gray-600"
              />

              {/* Draft translation: the owner reviews it and chooses to use
                  it — nothing is ever auto-sent in a different language. */}
              {isStaff && draft && (
                <div className="rounded-2xl border border-accent/25 bg-accent/8 px-3.5 py-2.5 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
                    <Languages size={10} /> {draft.label}
                  </p>
                  {draft.busy ? (
                    <span className="inline-flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                      <Loader2 size={11} className="animate-spin" /> Translating…
                    </span>
                  ) : (
                    <>
                      <p className="text-[12px] text-gray-100 font-medium leading-relaxed whitespace-pre-wrap">
                        {draft.text}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setText(draft.text);
                            setDraft(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-accent text-white text-[9px] font-black uppercase tracking-widest cursor-pointer"
                        >
                          Use this
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(null)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[9px] font-black uppercase tracking-widest cursor-pointer"
                        >
                          Discard
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isStaff && !!text.trim() && !draft && (
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["english", "EN"],
                      ["urdu", "اردو"],
                      ["roman-urdu", "Roman"],
                    ] as const
                  ).map(([target, label]) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => translateDraft(target)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-accent hover:border-accent/30 text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      → {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {text.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="size-11 shrink-0 rounded-2xl bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-all active:scale-90 disabled:opacity-50"
              >
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={uploading}
                title="Record voice note"
                className="size-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-accent hover:border-accent/40 transition-all active:scale-95"
              >
                <Mic size={17} />
              </button>
            )}
          </form>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title={confirmDelete?.mode === "everyone" ? "Delete for everyone" : "Delete for me"}
        message={
          confirmDelete?.mode === "everyone"
            ? "This message will be permanently deleted for BOTH sides. Attached files are removed from storage too. This cannot be undone."
            : "This message will be hidden from your view only. The other side will still see it."
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(null)}
        type="danger"
      />

      <ConfirmationModal
        isOpen={!!confirmBulk}
        title={
          confirmBulk === "everyone"
            ? `Delete ${selected.length} for everyone`
            : `Delete ${selected.length} for me`
        }
        message={
          confirmBulk === "everyone"
            ? "These messages will be permanently deleted for BOTH sides, along with any attached files. Anything that isn't yours to delete will be skipped. This cannot be undone."
            : "These messages will be hidden from your view only. The other side will still see them."
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleting}
        onConfirm={bulkDelete}
        onClose={() => setConfirmBulk(null)}
        type="danger"
      />

      <MediaViewer
        item={viewing}
        items={mediaItems}
        onNavigate={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
