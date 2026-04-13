import React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

/** Skeleton com shimmer effect para loading states */
export function Skeleton({
  className,
  variant = "rect",
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-white/5 rounded-xl",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4",
        className
      )}
    />
  );
}

/** Skeleton de card — placeholder para card loading */
export function SkeletonCard({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-dark-card border border-white/10 rounded-3xl p-8 space-y-4", className)}>
      <Skeleton variant="rect" className="h-6 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn("w-full", i === lines - 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}

/** Grid de skeletons para feed/skills loading */
export function SkeletonGrid({
  count = 6,
  cols = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  gap = "gap-6",
  height = "h-48",
  className,
}: {
  count?: number;
  cols?: string;
  gap?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid", cols, gap, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("bg-white/5 animate-pulse rounded-3xl", height)} />
      ))}
    </div>
  );
}
