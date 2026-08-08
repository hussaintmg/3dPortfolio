"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ScanFace } from "lucide-react";
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

  const verify = async (descriptors: number[][]) => {
    try {
      const { data } = await axios.post("/api/auth/face/verify", {
        descriptor: descriptors[0],
        identifier: identifier?.trim() || undefined,
      });

      if (!data.success) throw new Error(data.message);

      notify.success("Welcome back", `Signed in as ${data.user.username}`);
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
        onComplete={verify}
        busyLabel="Checking…"
      />
    </>
  );
}
