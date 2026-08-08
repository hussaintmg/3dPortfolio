"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import axios from "axios";
import EditableText from "@/Components/editable/EditableText";
import EditableBox from "@/Components/editable/EditableBox";
import FloatingInput from "@/Components/ui/FloatingInput";
import FloatingTextarea from "@/Components/ui/FloatingTextarea";
import { notify } from "@/lib/notify";
import { useSite } from "@/context/SiteContext";

/**
 * Drop-in enquiry form. Usable on any page via the section library and posts
 * to the same endpoint as the main contact page.
 */
export default function ContactFormSection({ k }: { k: (f: string) => string }) {
  const { getText, isEditing } = useSite();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please tell me your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "That email doesn't look right";
    if (form.message.trim().length < 10)
      e.message = "A little more detail helps (10+ characters)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    // In edit mode the form is a preview — never fire a real enquiry
    if (isEditing) return;
    if (!validate()) return;

    try {
      setSending(true);
      const res = await axios.post("/api/enquiry", form);
      if (res.data.success !== false) {
        setSent(true);
        setForm({ name: "", email: "", message: "" });
        notify.success("Message sent", "Thanks — I'll be in touch soon.");
      } else {
        notify.error("Could not send", res.data.message);
      }
    } catch (err: any) {
      notify.error(
        "Could not send",
        err.response?.data?.message || err.message,
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      {sent ? (
        <div className="rounded-4xl border border-emerald-500/25 bg-emerald-500/5 p-10 text-center space-y-4">
          <CheckCircle2 size={34} className="mx-auto text-emerald-400" />
          <p className="text-base font-bold text-white">
            {getText(k("success"), "Thanks — your message is in.")}
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-[11px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
          >
            Send another
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-8 sm:p-10 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FloatingInput
              label={getText(k("nameLabel"), "Your name")}
              value={form.name}
              error={errors.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FloatingInput
              label={getText(k("emailLabel"), "Email address")}
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <FloatingTextarea
            label={getText(k("messageLabel"), "What are you building?")}
            rows={5}
            value={form.message}
            error={errors.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <EditableBox
            k={k("button.box")}
            label="Submit button"
            as="button"
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-3 py-4.5 rounded-2xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.99] shadow-lg shadow-accent/20"
          >
            {sending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            <EditableText k={k("button")}>Send message</EditableText>
          </EditableBox>
        </form>
      )}
    </div>
  );
}
