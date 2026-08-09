"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Send,
} from "lucide-react";
import { notify } from "@/lib/notify";
import FloatingInput from "@/Components/ui/FloatingInput";

interface Props {
  googleVerification: string;
  googleVerificationFile: string;
  bingVerification: string;
  onChange: (patch: {
    googleVerification?: string;
    googleVerificationFile?: string;
    bingVerification?: string;
  }) => void;
}

/** Reflects one live probe, not the presence of a file in the repo. */
function Check({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {ok ? (
        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-bold text-white">{label}</p>
        {detail && (
          <p className="text-[10px] text-gray-500 font-medium break-all">{detail}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Search-console setup, in the dashboard rather than in environment variables.
 *
 * Google issues a verification code and expects to find it on the site within
 * minutes. If the only place to put it is a Vercel env var, verification waits
 * on a redeploy — so the codes are saved with the rest of the settings and are
 * live on the next render.
 */
export default function SeoPanel({
  googleVerification,
  googleVerificationFile,
  bingVerification,
  onChange,
}: Props) {
  const [status, setStatus] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const check = useCallback(async () => {
    try {
      setChecking(true);
      const { data } = await axios.get("/api/seo/indexnow");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const submitSitemap = async () => {
    try {
      setSubmitting(true);
      const { data } = await axios.post("/api/seo/indexnow", {});
      if (data.success) {
        notify.success(
          "Sent to IndexNow",
          `${data.submitted ?? status?.urlCount ?? 0} URLs pushed to Bing, Yandex and friends.`,
        );
      } else {
        notify.error("Submission failed", data.message);
      }
    } catch (e: any) {
      notify.error("Submission failed", e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const c = status?.checks || {};

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-black text-accent uppercase tracking-[0.2em] flex items-center gap-2">
          <Search size={14} /> Search Engines
        </h2>
        <button
          type="button"
          onClick={check}
          disabled={checking}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          {checking ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Re-check
        </button>
      </div>

      <p className="text-xs text-gray-400 font-medium leading-relaxed">
        Paste the code each console gives you and press Save — it goes live
        immediately, no redeploy. Paste the whole <code>&lt;meta&gt;</code> tag
        if that is easier; only the value is kept.
      </p>

      <div className="space-y-5">
        <FloatingInput
          label="Google verification code (HTML tag method)"
          value={googleVerification}
          onChange={(e) => onChange({ googleVerification: e.target.value })}
        />
        <FloatingInput
          label="Google HTML file, e.g. google1a2b3c.html (file method only)"
          value={googleVerificationFile}
          onChange={(e) => onChange({ googleVerificationFile: e.target.value })}
        />
        <FloatingInput
          label="Bing verification code (msvalidate.01)"
          value={bingVerification}
          onChange={(e) => onChange({ bingVerification: e.target.value })}
        />
      </div>

      {/* Live probes of the real URLs a crawler would request */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
          Live on {status?.siteUrl || "the site"}
        </p>

        {checking && !status ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium py-2">
            <Loader2 size={13} className="animate-spin" /> Checking…
          </div>
        ) : !status ? (
          <p className="text-xs text-gray-500 font-medium">
            Could not run the checks.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            <Check
              label="robots.txt"
              ok={!!c.robots?.ok}
              detail={c.robots?.ok ? "200 — crawlers allowed" : `HTTP ${c.robots?.status ?? "—"}`}
            />
            <Check
              label="sitemap.xml"
              ok={!!c.sitemap?.ok}
              detail={
                c.sitemap?.ok
                  ? `200 — ${status.urlCount} URLs listed`
                  : `HTTP ${c.sitemap?.status ?? "—"}`
              }
            />
            <Check
              label="llms.txt (answer engines)"
              ok={!!c.llms?.ok}
              detail={c.llms?.ok ? "200" : `HTTP ${c.llms?.status ?? "—"}`}
            />
            <Check
              label="IndexNow key file"
              ok={!!status.keyFileOk}
              detail={status.keyFileOk ? "200 — pushes will be accepted" : status.keyFileError}
            />
            <Check
              label="Google verification tag"
              ok={!!status.googleVerificationConfigured}
              detail={
                status.googleVerificationConfigured
                  ? "In the page head"
                  : "Not set — Search Console cannot verify yet"
              }
            />
            {status.googleVerificationFile && (
              <Check
                label={`/${status.googleVerificationFile}`}
                ok={!!c.googleFile?.ok}
                detail={c.googleFile?.ok ? "200" : `HTTP ${c.googleFile?.status ?? "—"}`}
              />
            )}
            <Check
              label="Bing verification tag"
              ok={!!status.bingVerificationConfigured}
              detail={
                status.bingVerificationConfigured
                  ? "In the page head + /BingSiteAuth.xml"
                  : "Not set"
              }
            />
            <Check
              label="Meta description length"
              ok={(status.descriptionLength ?? 0) >= 90}
              detail={
                (status.descriptionLength ?? 0) >= 90
                  ? `${status.descriptionLength} characters`
                  : `${status.descriptionLength ?? 0} characters — under 90, so the built-in default is used instead`
              }
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submitSitemap}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent text-white text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-all disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          Push all URLs to IndexNow
        </button>
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white transition-all"
        >
          <ExternalLink size={13} /> Search Console
        </a>
        <a
          href="https://www.bing.com/webmasters"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white transition-all"
        >
          <ExternalLink size={13} /> Bing Webmaster
        </a>
      </div>

      <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
        Google has no IndexNow equivalent — after verifying, open URL
        Inspection in Search Console and press &ldquo;Request indexing&rdquo;
        on the home page once. That is the only way to hurry a first crawl.
      </p>
    </section>
  );
}
