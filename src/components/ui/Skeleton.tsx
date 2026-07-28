"use client";

/**
 * Skeleton Components for Loading States
 * Provides professional loading placeholders
 */

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

// Basic skeleton line
export function Skeleton({ className = "", animate = true }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-slate-200/80 dark:bg-slate-700/70 ${
        animate ? "skeleton-shimmer" : ""
      } ${className}`}
    />
  );
}

/** A route-level shell that prevents layout jumps during page transitions. */
export function AppShellSkeleton({
  variant = "default",
}: {
  variant?: "default" | "chat" | "list";
}) {
  if (variant === "chat") {
    return (
      <div className="min-h-screen bg-background-light px-4 pb-28 pt-5 dark:bg-background-dark sm:px-6">
        <div className="mx-auto flex max-w-6xl gap-5">
          <aside className="hidden w-64 shrink-0 space-y-4 rounded-2xl border border-border-light/70 bg-white p-4 dark:border-border-dark dark:bg-card-dark lg:block">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-8 w-3/5" />
            <ListSkeleton count={5} />
          </aside>
          <section className="min-h-[72vh] flex-1 rounded-2xl border border-border-light/70 bg-white p-4 dark:border-border-dark dark:bg-card-dark sm:p-6">
            <div className="mb-8 flex items-center justify-between"><Skeleton className="h-7 w-36" /><Skeleton className="h-9 w-9 rounded-full" /></div>
            <ChatSkeleton />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light px-4 pb-28 pt-6 dark:bg-background-dark sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3"><Skeleton className="h-3 w-24 rounded-full" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-72 max-w-full" /></div>
          <Skeleton className="hidden h-10 w-28 rounded-xl sm:block" />
        </div>
        {variant === "list" ? <ListSkeleton count={6} /> : <DashboardSkeleton />}
      </div>
    </div>
  );
}

// Text skeleton with multiple lines
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return <Skeleton className={`${sizeClasses[size]} rounded-full`} />;
}

// Card skeleton
export function SkeletonCard({
  hasImage = false,
  lines = 3,
}: {
  hasImage?: boolean;
  lines?: number;
}) {
  return (
    <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-soft">
      {hasImage && <Skeleton className="w-full h-32 rounded-lg mb-4" />}
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <SkeletonAvatar size="lg" />
      </div>

      {/* Main card skeleton */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-6 shadow-soft">
        <div className="flex items-center justify-center mb-4">
          <Skeleton className="w-24 h-24 rounded-full" />
        </div>
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-soft"
          >
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

// Chat skeleton
export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {/* Chat messages skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`
              max-w-[75%] rounded-2xl p-4
              ${
                i % 2 === 0
                  ? "bg-primary/20 rounded-tr-sm"
                  : "bg-gray-100 dark:bg-gray-800 rounded-tl-sm"
              }
            `}
          >
            <SkeletonText lines={2} className="w-48" />
          </div>
        </div>
      ))}

      {/* Input skeleton */}
      <div className="mt-8 border-t border-border-light pt-4 dark:border-border-dark">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

// List skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 bg-white dark:bg-card-dark rounded-xl p-4 shadow-soft"
        >
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 animate-pulse">
      {/* Avatar and name */}
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Settings cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    </div>
  );
}
