import React from "react";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[rgba(148,163,184,0.25)] animate-pulse rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[rgba(28,25,23,0.07)] bg-[rgba(255,255,255,0.55)] p-4">
      <SkeletonLine className="h-4 w-2/3 mb-3" />
      <SkeletonLine className="h-3 w-1/2 mb-3" />
      <SkeletonLine className="h-3 w-full" />
      <div className="mt-4 flex gap-2">
        <SkeletonLine className="h-8 w-8 rounded-xl" />
        <SkeletonLine className="h-8 w-full" />
      </div>
    </div>
  );
}
