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
} from "lucide-react";
import axios from "axios";
import { notify } from "@/lib/notify";
import { getSocket } from "@/lib/socket-client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/Components/ui/Skeleton";
import ConfirmationModal from "@/Components/dashboard/ConfirmationModal";

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
}

interface ChatThreadProps {
  /** Staff passes the client's conversation id; clients omit it. */
  conversationId?: string;
  className?: string;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtSize = (b?: number) =>
  !b ? "" : b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.ceil(b / 1024) + " KB";

export default function ChatThread({ conversationId, className }: ChatThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; mode: "me" | "everyone" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const threadIdRef = useRef<string>("");

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

    socket.on("chat:new", onNew);
    socket.on("chat:delete", onDelete);
    return () => {
      socket.off("chat:new", onNew);
      socket.off("chat:delete", onDelete);
    };
  }, [threadId, user, isStaff, scrollToBottom]);

  // Close message menus on outside click
  useEffect(() => {
    const close = () => setMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const pushMessage = (msg: ChatMsg) => {
    setMessages((prev) => [...prev, msg]);
    getSocket().emit("chat:new", msg);
    setTimeout(() => scrollToBottom(), 60);
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
      });
      if (res.data.success) {
        setText("");
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

  const sendAttachment = async (file: File) => {
    if (uploading) return;
    const mime = file.type || "application/octet-stream";
    const type: ChatMsg["type"] = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : mime.startsWith("audio/")
          ? "audio"
          : "file";
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "chat");
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!up.success) throw new Error(up.error || "Upload failed");

      const res = await axios.post("/api/chat", {
        type,
        conversationId: threadId,
        attachment: {
          url: up.publicUrl,
          name: file.name,
          size: file.size,
          mime,
          storageKey: up.filePath,
        },
      });
      if (res.data.success) pushMessage(res.data.message);
      else notify.error("Send failed", res.data.message);
    } catch (err: any) {
      notify.error("Attachment failed", err.message);
    } finally {
      setUploading(false);
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
            const own = m.senderId === user.id;
            const canDeleteEveryone = own || isStaff;
            return (
              <div key={m._id} className={`flex ${own ? "justify-end" : "justify-start"} group`}>
                <div className={`relative max-w-[85%] sm:max-w-[70%] ${own ? "order-1" : ""}`}>
                  {/* Sender label (only for staff viewing client, or client viewing staff) */}
                  {!own && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1 ml-3">
                      {m.senderRole === "user" ? m.senderName : "Hussain"}
                    </p>
                  )}
                  <div
                    className={`rounded-3xl overflow-hidden border ${
                      own
                        ? "bg-accent text-white border-accent/40 rounded-br-lg"
                        : "bg-white/5 text-gray-200 border-white/10 rounded-bl-lg"
                    }`}
                  >
                    {m.type === "text" && (
                      <p className="px-4 py-3 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                    )}
                    {m.type === "image" && m.attachment?.url && (
                      <a href={m.attachment.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={m.attachment.url}
                          alt={m.attachment.name || "image"}
                          className="max-h-72 w-auto object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.type === "video" && m.attachment?.url && (
                      <video src={m.attachment.url} controls className="max-h-72 w-full" preload="metadata" />
                    )}
                    {m.type === "audio" && m.attachment?.url && (
                      <div className="px-3 py-2.5 min-w-[240px]">
                        <audio src={m.attachment.url} controls className="w-full h-10" preload="metadata" />
                      </div>
                    )}
                    {m.type === "file" && m.attachment?.url && (
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
                    )}
                  </div>
                  <p className={`text-[9px] font-bold text-gray-600 mt-1 ${own ? "text-right mr-2" : "ml-3"}`}>
                    {fmtTime(m.createdAt)}
                  </p>

                  {/* Message menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === m._id ? null : m._id);
                    }}
                    className={`absolute top-1 ${own ? "-left-8" : "-right-8"} p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all`}
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuFor === m._id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute top-8 ${own ? "right-full mr-2" : "left-full ml-2"} z-20 w-48 rounded-2xl bg-[#12121c] border border-white/10 shadow-2xl overflow-hidden`}
                    >
                      <button
                        onClick={() => { setMenuFor(null); setConfirmDelete({ id: m._id, mode: "me" }); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <Trash2 size={13} /> Delete for me
                      </button>
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
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-white/8 bg-white/2 backdrop-blur-xl p-3 sm:p-4">
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
            <label className="size-11 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-accent hover:border-accent/40 transition-all cursor-pointer active:scale-95">
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

            <div className="flex-1 min-w-0">
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
    </div>
  );
}
