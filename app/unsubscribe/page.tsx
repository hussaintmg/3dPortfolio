import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import dbConnect from "@/lib/mongoose";
import Subscriber from "@/models/Subscriber";

export const metadata: Metadata = {
  title: "Unsubscribe",
  // A one-off transactional page has nothing to offer a search engine
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The page the footer's unsubscribe link lands on.
 *
 * It does the work on arrival rather than showing a "click to confirm"
 * button: an extra click is a step people skip, and someone who wanted out
 * and is still on the list will report the next email instead.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let done = false;
  let message = "This link is missing its code.";
  let email = "";

  if (token) {
    try {
      await dbConnect();
      const sub: any = await Subscriber.findOne({ token });
      if (!sub) {
        message = "This link has expired or has already been used.";
      } else {
        email = sub.email;
        if (sub.subscribed === false) {
          done = true;
          message = "You were already unsubscribed — nothing more to do.";
        } else {
          sub.subscribed = false;
          sub.unsubscribedAt = new Date();
          await sub.save();
          done = true;
          message = "You're off the list. No more emails.";
        }
      }
    } catch {
      message = "Something went wrong on our side. Try the link again shortly.";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card p-8 sm:p-10 text-center space-y-5">
        <div
          className={`size-14 mx-auto rounded-2xl flex items-center justify-center ${
            done
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {done ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          {done ? "Unsubscribed" : "We couldn't do that"}
        </h1>

        <p className="text-sm text-gray-400 font-medium leading-relaxed">
          {message}
        </p>

        {email && (
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest break-all">
            {email}
          </p>
        )}

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 font-black text-[11px] uppercase tracking-widest transition-colors"
        >
          Back to the site
        </Link>
      </div>
    </div>
  );
}
