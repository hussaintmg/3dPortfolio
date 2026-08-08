import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

/**
 * Cached by the service worker at install time and served whenever a
 * navigation fails — the installed app should never show a browser error.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-sm">
        <div className="mx-auto size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
          <WifiOff size={28} />
        </div>
        <h1 className="text-2xl font-black text-white">You're offline</h1>
        <p className="text-sm text-gray-400 font-medium leading-relaxed">
          This page needs a connection. It will load as soon as you're back
          online — nothing you were doing has been lost.
        </p>
      </div>
    </div>
  );
}
