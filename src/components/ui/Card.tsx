import React from "react";
import { cn } from "../../lib/utils";

export type CardVariant = "default" | "interactive" | "highlighted";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-dark-card border border-white/10",
  interactive:
    "bg-dark-card border border-white/10 hover:border-neon-purple/30 transition-all cursor-pointer group",
  highlighted:
    "bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 border-2 border-neon-purple neon-glow-purple",
};

export function Card({
  variant = "default",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn("rounded-3xl p-8", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Card compacto — padding reduzido para listas e logs */
export function CardCompact({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-dark-card border border-white/10 rounded-xl p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
