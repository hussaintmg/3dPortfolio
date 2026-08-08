"use client";

import { Sparkles } from "lucide-react";
import ChatThread from "@/Components/chat/ChatThread";
import EditableText from "@/Components/editable/EditableText";
import { useSite } from "@/context/SiteContext";

export default function PortalChat() {
  const { settings } = useSite();

  return (
    <div className="h-screen flex flex-col p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
      <header className="shrink-0 mb-4">
        <h1 className="text-2xl font-black text-white tracking-tighter">
          <EditableText k="portal.chat.heading">Direct Chat</EditableText>
        </h1>
        <EditableText
          k="portal.chat.subheading"
          as="p"
          className="text-xs text-gray-500 font-medium block mt-1"
        >
          Text, voice notes, images and files — everything stays in this thread.
        </EditableText>
      </header>

      <div className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-card overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 px-5 sm:px-6 py-4 border-b border-white/8 bg-white/2 shrink-0">
          <div className="relative">
            <div className="size-11 rounded-2xl bg-linear-to-tr from-accent to-purple-500 flex items-center justify-center text-white font-black text-sm">
              {settings.websiteName.slice(0, 1)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 border-2 border-card" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white tracking-tight truncate">
              {settings.websiteName}
            </p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Usually replies within a few hours
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest">
            <Sparkles size={11} /> Project Line
          </div>
        </div>

        <ChatThread className="flex-1" />
      </div>
    </div>
  );
}
