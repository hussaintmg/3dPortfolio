"use client";

import { Check, CheckCheck, Clock } from "lucide-react";

export type TickState = "pending" | "sent" | "delivered" | "read";

/**
 * Works out how far a message has actually got.
 *
 * `deliveredTo` and `readBy` both include the sender (they're set on create),
 * so the sender has to be discounted — otherwise every message would claim
 * to be read the moment it was sent.
 */
export function tickState(
  m: {
    _id?: string;
    senderId: string;
    deliveredTo?: string[];
    readBy?: string[];
  },
  selfId: string,
): TickState {
  // Optimistic messages get a temporary id until the server answers
  if (!m._id || m._id.startsWith("tmp-")) return "pending";

  const others = (list?: string[]) =>
    (list || []).filter((id) => id !== m.senderId).length > 0;

  if (others(m.readBy)) return "read";
  if (others(m.deliveredTo)) return "delivered";
  return "sent";
}

/**
 * WhatsApp's vocabulary, because it is the one people already know:
 *   clock       — still leaving this device
 *   one tick    — the server has it, they don't yet
 *   two ticks   — on their device
 *   two blue    — they've read it
 *
 * Voice notes use "heard" rather than "read": seeing a voice note in a
 * thread is not the same as listening to it.
 */
export default function MessageTicks({
  state,
  heard,
  isVoice,
  className = "",
}: {
  state: TickState;
  heard?: boolean;
  isVoice?: boolean;
  className?: string;
}) {
  if (state === "pending") {
    return (
      <Clock size={12} className={`text-white/45 ${className}`} aria-label="Sending" />
    );
  }
  if (state === "sent") {
    return (
      <Check size={13} className={`text-white/50 ${className}`} aria-label="Sent" />
    );
  }

  const listened = isVoice ? heard : state === "read";
  return (
    <CheckCheck
      size={13}
      className={`${listened ? "text-sky-400" : "text-white/50"} ${className}`}
      aria-label={
        isVoice
          ? heard
            ? "Heard"
            : "Delivered"
          : state === "read"
            ? "Read"
            : "Delivered"
      }
    />
  );
}
