"use client";

import { cn } from "@/lib/cn";

/**
 * Base shimmer block. Deliberately matches the site's card language —
 * translucent white surface, hairline border, indigo-tinted sweep — so a
 * loading page reads as the same product, not a grey wireframe.
 */
export function Skeleton({
  className,
  rounded = "rounded-xl",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-white/[0.04] border border-white/[0.05]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-linear-to-r before:from-transparent before:via-indigo-300/10 before:to-transparent",
        rounded,
        className,
      )}
    />
  );
}

/** A pill, like the site's badges. */
export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton rounded="rounded-full" className={cn("h-7 w-40", className)} />;
}

/** Multi-line text placeholder with a natural ragged last line. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-[92%]", "w-[85%]", "w-[70%]", "w-[60%]"];
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          rounded="rounded-md"
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

/**
 * Mirrors the real project/solution card: image on top, title, tech pills,
 * two lines of copy — inside the same 4xl rounded glass surface.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl overflow-hidden",
        className,
      )}
    >
      <Skeleton rounded="rounded-none" className="aspect-video w-full border-0" />
      <div className="p-7 space-y-4">
        <Skeleton rounded="rounded-lg" className="h-5 w-3/5" />
        <SkeletonText lines={2} />
        <div className="flex gap-2 pt-1">
          <Skeleton rounded="rounded-full" className="h-6 w-16" />
          <Skeleton rounded="rounded-full" className="h-6 w-20" />
          <Skeleton rounded="rounded-full" className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
}

/** Icon + heading + copy card, like the services grid. */
export function SkeletonFeatureCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-8 space-y-5",
        className,
      )}
    >
      <Skeleton rounded="rounded-2xl" className="size-14" />
      <Skeleton rounded="rounded-lg" className="h-6 w-2/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

/** Pricing-card shaped placeholder. */
export function SkeletonPriceCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-4xl border border-white/8 bg-white/2 backdrop-blur-xl p-8 space-y-6",
        className,
      )}
    >
      <div className="space-y-2">
        <Skeleton rounded="rounded-lg" className="h-5 w-32" />
        <Skeleton rounded="rounded-md" className="h-3 w-24" />
      </div>
      <Skeleton rounded="rounded-xl" className="h-12 w-40" />
      <SkeletonText lines={2} />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton rounded="rounded-full" className="size-4 shrink-0" />
            <Skeleton rounded="rounded-md" className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton rounded="rounded-2xl" className="h-12 w-full" />
    </div>
  );
}

/** Dashboard table row placeholder. */
export function SkeletonRow({
  cols = 4,
  className,
}: {
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 px-6 py-5 border-b border-white/5",
        className,
      )}
    >
      <Skeleton rounded="rounded-xl" className="size-11 shrink-0" />
      {Array.from({ length: Math.max(1, cols - 1) }).map((_, i) => (
        <Skeleton
          key={i}
          rounded="rounded-md"
          className={cn("h-3.5", i === 0 ? "w-40" : "w-20")}
        />
      ))}
    </div>
  );
}

/** Stat tile placeholder for dashboards and the client portal. */
export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[2.5rem] border border-white/8 bg-card p-7 space-y-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton rounded="rounded-2xl" className="size-11" />
        <Skeleton rounded="rounded-full" className="h-4 w-10" />
      </div>
      <Skeleton rounded="rounded-md" className="h-3 w-28" />
      <Skeleton rounded="rounded-xl" className="h-9 w-24" />
    </div>
  );
}

/** Section heading block: eyebrow, big title, supporting line. */
export function SkeletonHeading({
  align = "left",
  className,
}: {
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-5 max-w-3xl",
        align === "center" && "mx-auto text-center items-center flex flex-col",
        className,
      )}
    >
      <SkeletonPill />
      <Skeleton rounded="rounded-2xl" className="h-14 w-full max-w-xl" />
      <Skeleton rounded="rounded-2xl" className="h-14 w-2/3" />
      <SkeletonText lines={2} className="w-full max-w-lg" />
    </div>
  );
}
