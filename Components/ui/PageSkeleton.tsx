import {
  Skeleton,
  SkeletonPill,
  SkeletonText,
  SkeletonCard,
  SkeletonFeatureCard,
  SkeletonPriceCard,
  SkeletonHeading,
  SkeletonStat,
  SkeletonRow,
} from "./Skeleton";

type Variant = "home" | "grid" | "services" | "packages" | "dashboard" | "portal";

/**
 * Route-level placeholder. Each variant mirrors the real page's layout, so
 * the transition to loaded content is a fill-in rather than a re-flow.
 * The 3D background keeps rendering behind these (it lives in the layout).
 */
export default function PageSkeleton({
  variant = "grid",
}: {
  variant?: Variant;
}) {
  if (variant === "home") {
    return (
      <div className="min-h-screen">
        {/* Hero — mirrors StackedCardsHero: text left, 3D scene right */}
        <section className="min-h-[90vh] flex items-center px-6 md:px-12 pt-16">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <SkeletonPill className="w-52" />
              <div className="space-y-4">
                <Skeleton rounded="rounded-2xl" className="h-16 w-full max-w-lg" />
                <Skeleton rounded="rounded-2xl" className="h-16 w-4/5" />
                <Skeleton rounded="rounded-2xl" className="h-16 w-3/5" />
              </div>
              <SkeletonText lines={2} className="max-w-xl" />
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Skeleton rounded="rounded-md" className="h-14 w-44" />
                <Skeleton rounded="rounded-md" className="h-14 w-44" />
              </div>
            </div>
            {/* Left empty — the live 3D sphere renders here */}
            <div className="hidden lg:block h-[600px]" />
          </div>
        </section>

        {/* Next section peeking in, so the page has depth while loading */}
        <section className="py-32 px-4 md:px-8 border-t border-white/5">
          <div className="max-w-6xl mx-auto space-y-6">
            <SkeletonPill className="w-44" />
            <Skeleton rounded="rounded-2xl" className="h-12 w-96 max-w-full" />
            <SkeletonText lines={3} className="max-w-2xl" />
          </div>
        </section>
      </div>
    );
  }

  if (variant === "services") {
    return (
      <div className="min-h-screen pt-36 pb-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          <SkeletonHeading />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonFeatureCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/5 bg-white/2 p-7 space-y-3"
              >
                <Skeleton rounded="rounded-lg" className="h-10 w-12" />
                <Skeleton rounded="rounded-md" className="h-4 w-24" />
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "packages") {
    return (
      <div className="min-h-screen pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto space-y-20">
          <SkeletonHeading align="center" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPriceCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="min-h-screen p-8 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="space-y-3">
            <Skeleton rounded="rounded-2xl" className="h-10 w-72" />
            <Skeleton rounded="rounded-md" className="h-3.5 w-56" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3 rounded-[2.5rem] border border-white/8 bg-card p-8 space-y-8">
              <Skeleton rounded="rounded-lg" className="h-5 w-56" />
              <div className="flex items-end gap-4 h-44">
                {["h-1/3", "h-2/3", "h-1/2", "h-full", "h-2/5", "h-3/5"].map(
                  (h, i) => (
                    <div key={i} className="flex-1 flex items-end h-full">
                      <Skeleton rounded="rounded-xl" className={`w-full ${h}`} />
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="xl:col-span-2 rounded-[2.5rem] border border-white/8 bg-card p-8 space-y-4">
              <Skeleton rounded="rounded-lg" className="h-5 w-40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <Skeleton rounded="rounded-xl" className="size-9 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton rounded="rounded-md" className="h-3 w-3/4" />
                    <Skeleton rounded="rounded-md" className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-white/8 bg-card overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} cols={4} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "portal") {
    return (
      <div className="p-6 sm:p-10 space-y-10 pt-20 lg:pt-10">
        <div className="space-y-3">
          <Skeleton rounded="rounded-2xl" className="h-10 w-80" />
          <Skeleton rounded="rounded-md" className="h-3.5 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStat key={i} className="rounded-3xl p-7" />
          ))}
        </div>
        <div className="rounded-3xl border border-white/8 bg-card overflow-hidden">
          <div className="px-7 py-5 border-b border-white/5">
            <Skeleton rounded="rounded-lg" className="h-4 w-40" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} cols={3} className="px-7" />
          ))}
        </div>
      </div>
    );
  }

  // "grid" — projects archive and similar listings
  return (
    <div className="min-h-screen pt-36 pb-24 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        <SkeletonHeading />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
