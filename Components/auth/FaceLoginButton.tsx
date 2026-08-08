"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ScanFace, Users } from "lucide-react";
import { notify } from "@/lib/notify";
import FaceScanner, { type ScanStep } from "./FaceScanner";

/** One capture, and it has to blink — a still photo won't get through. */
const LOGIN_STEPS: ScanStep[] = [
  { id: "verify", prompt: "Look at the camera and blink", requireBlink: true },
];

/**
 * Sign in with our own camera-based face check.
 *
 * The descriptor is compared on the server, so a modified page can't simply
 * declare itself a match.
 */
export default function FaceLoginButton({
  identifier,
  className = "",
}: {
  /** Email or username, when the form already has one — makes matching stricter. */
  identifier?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** Set when one face turns out to belong to several accounts. */
  const [choices, setChoices] = useState<
    { username: string; email: string; role: string }[] | null
  >(null);
  const lastDescriptor = useRef<number[] | null>(null);

  const verify = async (descriptors: number[][], asAccount?: string) => {
    try {
      lastDescriptor.current = descriptors[0];
      const { data } = await axios.post("/api/auth/face/verify", {
        descriptor: descriptors[0],
        identifier: asAccount || identifier?.trim() || undefined,
      });

      // The same face on two accounts — let them say which
      if (data.needsChoice) {
        setChoices(data.accounts || []);
        setOpen(false);
        return;
      }

      if (!data.success) throw new Error(data.message);

      notify.success("Welcome back", `Signed in as ${data.user.username}`);
      setChoices(null);
      setOpen(false);
      router.replace(data.user.role === "user" ? "/portal" : "/dashboard");
      router.refresh();
    } catch (err: any) {
      // Surface the server's reason (not recognised / locked out / not enrolled)
      throw new Error(
        err.response?.data?.message || err.message || "Face not recognised",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-200 font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
        }
      >
        <ScanFace size={15} />
        Sign in with your face
      </button>

      <FaceScanner
        open={open}
        onClose={() => setOpen(false)}
        title="Face sign-in"
        steps={LOGIN_STEPS}
        onComplete={(d) => verify(d)}
        busyLabel="Checking…"
      />

      {/* Account picker — only appears when the face matched more than one */}
      {choices && choices.length > 0 && (
        <div className="mt-3 rounded-2xl border border-accent/25 bg-accent/5 p-4 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-accent flex items-center gap-1.5">
            <Users size={12} /> Which account?
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            This face is set up on more than one account.
          </p>
          <div className="space-y-2">
            {choices.map((c) => (
              <button
                key={c.username}
                type="button"
                onClick={() => {
                  if (!lastDescriptor.current) return;
                  verify([lastDescriptor.current], c.username).catch((e) =>
                    notify.error("Could not sign in", e.message),
                  );
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-accent/40 hover:bg-white/10 transition-colors cursor-pointer text-left"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-white truncate">
                    {c.username}
                  </span>
                  <span className="block text-[10px] font-bold text-gray-500 truncate">
                    {c.email}
                  </span>
                </span>
                <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  {c.role}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChoices(null)}
            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
