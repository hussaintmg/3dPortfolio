"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Search,
  Mic,
  Image as ImageIcon,
  Video,
  FileText,
  ChevronLeft,
} from "lucide-react";
import axios from "axios";
import { getSocket } from "@/lib/socket-client";
import ChatThread from "@/Components/chat/ChatThread";
import { Skeleton } from "@/Components/ui/Skeleton";
import FloatingInput from "@/Components/ui/FloatingInput";

interface Conversation {
  conversationId: string;
  lastMessage: {
    type: string;
    text: string;
    senderRole: string;
    createdAt: string;
  };
  unread: number;
  user: {
    _id: string;
    username: string;
    displayName?: string;
    email: string;
    profileImage?: string;
  } | null;
}

const typeLabel: Record<string, React.ReactNode> = {
  audio: (
    <span className="inline-flex items-center gap-1"><Mic size={11} /> Voice note</span>
  ),
  image: (
    <span className="inline-flex items-center gap-1"><ImageIcon size={11} /> Photo</span>
  ),
  video: (
    <span className="inline-flex items-center gap-1"><Video size={11} /> Video</span>
  ),
  file: (
    <span className="inline-flex items-center gap-1"><FileText size={11} /> File</span>
  ),
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function DashboardChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [query, setQuery] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get("/api/chat");
      if (res.data.success) setConversations(res.data.conversations || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const poll = setInterval(fetchConversations, 10_000);

    const socket = getSocket();
    socket.emit("chat:join", ["staff"]);
    const onInbox = () => fetchConversations();
    socket.on("chat:inbox", onInbox);

    return () => {
      clearInterval(poll);
      socket.off("chat:inbox", onInbox);
    };
  }, [fetchConversations]);

  // Opening a thread clears its unread counter locally
  const openConversation = (c: Conversation) => {
    setActive(c);
    setConversations((prev) =>
      prev.map((x) =>
        x.conversationId === c.conversationId ? { ...x, unread: 0 } : x,
      ),
    );
  };

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.user?.username?.toLowerCase().includes(q) ||
      c.user?.displayName?.toLowerCase().includes(q) ||
      c.user?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen flex flex-col p-4 sm:p-6 gap-4">
      <header className="flex items-center gap-4 shrink-0">
        <div className="size-11 rounded-xl bg-card flex items-center justify-center text-accent border border-white/10">
          <MessageSquare size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Client Chats</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            All conversations — realtime
          </p>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Conversation list */}
        <div
          className={`rounded-3xl border border-white/10 bg-card flex-col min-h-0 overflow-hidden ${active ? "hidden lg:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-white/5">
            <FloatingInput
              label="Search clients"
              icon={<Search size={15} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar" data-lenis-prevent>
            {loading ? (
              <div className="p-4 space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <Skeleton className="size-11 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-6">
                <MessageSquare size={28} className="mx-auto text-gray-700" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  No conversations yet
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  When a client messages you from the website chat, it appears here.
                </p>
              </div>
            ) : (
              filtered.map((c) => {
                const name = c.user?.displayName || c.user?.username || "Unknown user";
                const isActive = active?.conversationId === c.conversationId;
                return (
                  <button
                    key={c.conversationId}
                    onClick={() => openConversation(c)}
                    className={`w-full text-left px-4 py-3.5 flex items-center gap-3.5 border-b border-white/3 transition-colors ${
                      isActive ? "bg-accent/10" : "hover:bg-white/3"
                    }`}
                  >
                    <div className="relative shrink-0">
                      {c.user?.profileImage ? (
                        <img src={c.user.profileImage} alt="" className="size-11 rounded-2xl object-cover" />
                      ) : (
                        <div className="size-11 rounded-2xl bg-linear-to-tr from-accent/70 to-purple-500/70 flex items-center justify-center text-white font-black text-sm uppercase">
                          {name.slice(0, 1)}
                        </div>
                      )}
                      {c.unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-accent text-white text-[9px] font-black flex items-center justify-center border-2 border-card">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-black truncate ${c.unread ? "text-white" : "text-gray-300"}`}>
                          {name}
                        </p>
                        <span className="text-[9px] font-bold text-gray-600 shrink-0">
                          {timeAgo(c.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 font-medium ${c.unread ? "text-gray-300" : "text-gray-500"}`}>
                        {c.lastMessage.senderRole !== "user" && (
                          <span className="text-gray-600">You: </span>
                        )}
                        {c.lastMessage.type === "text"
                          ? c.lastMessage.text
                          : typeLabel[c.lastMessage.type] || "Attachment"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div
          className={`rounded-3xl border border-white/10 bg-card flex-col min-h-0 overflow-hidden ${active ? "flex" : "hidden lg:flex"}`}
        >
          {active ? (
            <>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/2 shrink-0">
                <button
                  onClick={() => setActive(null)}
                  className="lg:hidden p-2 -ml-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="size-10 rounded-2xl bg-linear-to-tr from-accent/70 to-purple-500/70 flex items-center justify-center text-white font-black text-sm uppercase">
                  {(active.user?.displayName || active.user?.username || "?").slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {active.user?.displayName || active.user?.username || "Unknown user"}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 truncate">
                    {active.user?.email || active.conversationId}
                  </p>
                </div>
              </div>
              <ChatThread
                key={active.conversationId}
                conversationId={active.conversationId}
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600">
                <MessageSquare size={26} />
              </div>
              <p className="text-sm font-bold text-gray-400">
                Select a conversation to start replying
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
