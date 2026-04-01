"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket-client";
import {
  Send,
  User,
  Check,
  Package as PackageIcon,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Loader2,
  Phone,
  Video,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  _id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  packageContext?: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const pkgId = searchParams?.get("packageId");
  const pkgName = searchParams?.get("packageName");

  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  // For users, targeting "admin". In a multi-admin setup we would target the owner.
  const receiverId = isAdmin ? searchParams?.get("receiverId") || "" : "admin";

  useEffect(() => {
    // Wake up Socket Server
    fetch("/api/socket").catch(() => {});

    if (user) {
      const socket = getSocket();
      socket.emit("join_room", user.id);

      socket.on("receive_message", (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    // Auto-fill package context
    if (pkgName && !isAdmin) {
      setInputValue(
        `Hi, I'm interested in the ${pkgName} package (ID: ${pkgId}). Can we discuss the details?`,
      );
    }

    fetchMessages();

    return () => {
      const socket = getSocket();
      socket.off("receive_message");
    };
  }, [user, receiverId]);

  useEffect(() => {
    // Scroll to bottom on new message
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`/api/chat?receiverId=${receiverId}`);
      const data = await resp.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !user) return;

    const msgData = {
      senderId: user.id,
      receiverId,
      message: inputValue,
      packageContext: pkgName || "",
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Emit real-time
      const socket = getSocket();
      socket.emit("send_message", msgData);

      // 2. Persist in DB
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData),
      });

      const data = await resp.json();
      if (data.success) {
        setMessages((prev) => [...prev, { ...msgData, _id: data.chat._id }]);
        setInputValue("");
      }
    } catch (err) {
      console.error("Send error:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-[90vh] flex bg-[#F9FAFB] text-gray-900 rounded-4xl overflow-hidden border border-gray-100 shadow-sm mx-4 sm:mx-8 mb-8">
      {/* Left Sidebar (Conversations List) */}
      <div className="hidden lg:flex flex-col w-[380px] border-r border-gray-100 bg-gray-50/30">
        <div className="p-8 pb-4 flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tighter">Messages</h2>
          <div className="flex gap-3 text-gray-400">
            <MoreVertical size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
          </div>
        </div>

        <div className="p-6">
          <div className="relative group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-accent transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full rounded-2xl bg-white border border-gray-100 py-3.5 pl-12 pr-4 text-sm focus:ring-4 focus:ring-indigo-50 focus:border-accent transition-all placeholder-gray-300 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <div className="p-4 flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm group cursor-pointer transition-all hover:border-accent/10 hover:bg-white">
            <div className="size-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-accent shadow-sm">
                <User size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm tracking-tight truncate">
                  {isAdmin ? receiverId || "System Direct" : "Head Architect"}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">NOW</span>
              </div>
              <p className="text-xs text-gray-500 truncate font-medium">
                Established terminal connection.
              </p>
            </div>
          </div>
          
          {/* Placeholder for other chats */}
          <div className="p-4 flex items-center gap-4 filter grayscale opacity-20 pointer-events-none">
             <div className="size-12 rounded-2xl bg-gray-100" />
             <div className="flex-1 space-y-2">
                 <div className="h-3 w-24 bg-gray-100 rounded-full" />
                 <div className="h-2 w-full bg-gray-50 rounded-full" />
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Chat Header */}
        <div className="px-8 py-5 bg-white flex items-center justify-between border-b border-gray-50 shadow-sm z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
                <div className="size-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white shadow-xl shadow-gray-900/10">
                    {isAdmin ? <User size={24} /> : <Sparkles size={24} />}
                </div>
                <div className="absolute -bottom-1 -right-1 size-4 bg-white rounded-full flex items-center justify-center border-2 border-white">
                    <div className="size-full bg-emerald-500 rounded-full animate-pulse" />
                </div>
            </div>
            <div>
              <h3 className="font-black text-lg tracking-tighter text-gray-900 leading-none mb-1">
                {isAdmin
                  ? receiverId || "Client Terminal"
                  : "Architect-in-Chief"}
              </h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                 Live Link Established
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-gray-300">
            <Video size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
            <Phone size={18} className="hover:text-gray-900 transition-colors cursor-pointer" />
            <MoreVertical size={20} className="hover:text-gray-900 transition-colors cursor-pointer" />
          </div>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F9FAFB]/50 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] bg-size-[20px_20px]" />
          
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.id;
            return (
              <motion.div
                key={msg._id || idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"} relative z-10`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl p-5 shadow-sm relative ${
                    isMe 
                      ? "bg-gray-900 text-white rounded-tr-none shadow-xl shadow-gray-900/10" 
                      : "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm"
                  }`}
                >
                  {msg.packageContext && (
                    <div className={`flex items-center gap-3 mb-4 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                        isMe ? "bg-white/10 text-indigo-200 border border-white/5" : "bg-indigo-50 text-accent border border-indigo-100"
                    }`}>
                      <PackageIcon size={14} strokeWidth={3} />
                      STRATEGIC CONTEXT: {msg.packageContext}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed font-medium">{msg.message}</p>
                  <div className={`mt-3 flex items-center gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? "text-gray-400" : "text-gray-300"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && <Check size={14} className="text-emerald-400" strokeWidth={3} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Improved Chat Input Area */}
        <div className="p-6 bg-white border-t border-gray-50 flex items-center gap-4">
          <div className="flex gap-1">
             <button className="size-11 rounded-2xl hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
                <Smile size={22} />
             </button>
             <button className="size-11 rounded-2xl hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all">
                <Paperclip size={22} />
             </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex-1">
            <input
              type="text"
              placeholder="Transmit message to architect..."
              className="w-full rounded-2xl bg-gray-50/50 border border-transparent focus:border-gray-100 focus:bg-white py-4 px-6 text-sm text-gray-900 focus:ring-4 focus:ring-gray-50 transition-all placeholder:text-gray-300 font-medium"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </form>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim()}
            className="size-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white hover:bg-black transition-all active:scale-[0.98] disabled:opacity-20 shadow-xl shadow-gray-900/10"
          >
            <Send size={20} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={48} />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
