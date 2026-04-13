import React from "react";
import { cn } from "../../lib/utils";
import { Shield, AlertTriangle, AlertCircle, Globe } from "lucide-react";

export type BadgeVariant =
  | "ai-verified"
  | "community"
  | "risk-low"
  | "risk-medium"
  | "risk-high"
  | "status-published"
  | "status-processing"
  | "status-error"
  | "status-neutral"
  | "tag"
  | "category"
  | "live"
  | "http-get"
  | "http-post"
  | "http-put"
  | "http-delete"
  | "http-patch"
  | "origin-ai"
  | "origin-community"
  | "origin-pending"
  | "trigger-manual"
  | "trigger-auto"
  | "popular";

export interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  "ai-verified":
    "px-2 py-0.5 rounded-full text-[8px] font-bold bg-green-500/20 text-green-400 border border-green-500/30",
  community:
    "px-2 py-0.5 rounded-full text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30",
  "risk-low":
    "px-2 py-0.5 rounded text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20",
  "risk-medium":
    "px-2 py-0.5 rounded text-[9px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20",
  "risk-high":
    "px-2 py-0.5 rounded text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20",
  "status-published":
    "px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-green-500/10 text-green-400",
  "status-processing":
    "px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-blue-500/10 text-blue-400 animate-pulse",
  "status-error":
    "px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-red-500/10 text-red-400",
  "status-neutral":
    "px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-gray-500/10 text-gray-500",
  tag: "px-2 py-0.5 bg-white/5 rounded text-[9px] text-gray-400",
  category:
    "px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest",
  live: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/20 text-neon-purple text-xs font-bold",
  "http-get":
    "px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase",
  "http-post":
    "px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded uppercase",
  "http-put":
    "px-3 py-1 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded uppercase",
  "http-delete":
    "px-3 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase",
  "http-patch":
    "px-3 py-1 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded uppercase",
  "origin-ai":
    "px-2 py-0.5 rounded-full text-[8px] font-bold bg-green-500/20 text-green-400 border border-green-500/30",
  "origin-community":
    "px-2 py-0.5 rounded-full text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30",
  "origin-pending":
    "px-2 py-0.5 rounded-full text-[8px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  "trigger-manual":
    "px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-purple-500/20 text-purple-400",
  "trigger-auto":
    "px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-gray-500/20 text-gray-400",
  popular:
    "bg-neon-purple text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-full",
};

const variantIcon: Record<BadgeVariant, React.ReactNode | null> = {
  "ai-verified": <Shield className="w-2.5 h-2.5" />,
  community: <Globe className="w-2.5 h-2.5" />,
  "risk-low": null,
  "risk-medium": <AlertTriangle className="w-3 h-3" />,
  "risk-high": <AlertCircle className="w-3 h-3" />,
  "status-published": null,
  "status-processing": null,
  "status-error": null,
  "status-neutral": null,
  tag: null,
  category: null,
  live: null,
  "http-get": null,
  "http-post": null,
  "http-put": null,
  "http-delete": null,
  "http-patch": null,
  "origin-ai": <Shield className="w-2.5 h-2.5" />,
  "origin-community": <Globe className="w-2.5 h-2.5" />,
  "origin-pending": <AlertTriangle className="w-2.5 h-2.5" />,
  "trigger-manual": null,
  "trigger-auto": null,
  popular: null,
};

const defaultLabel: Record<BadgeVariant, string> = {
  "ai-verified": "VERIFIED",
  community: "COMMUNITY",
  "risk-low": "LOW",
  "risk-medium": "MEDIUM",
  "risk-high": "HIGH",
  "status-published": "PUBLISHED",
  "status-processing": "PROCESSING",
  "status-error": "ERROR",
  "status-neutral": "NEUTRAL",
  tag: "",
  category: "",
  live: "LIVE AI FEED",
  "http-get": "GET",
  "http-post": "POST",
  "http-put": "PUT",
  "http-delete": "DELETE",
  "http-patch": "PATCH",
  "origin-ai": "AI VERIFIED",
  "origin-community": "COMMUNITY",
  "origin-pending": "PENDING REVIEW",
  "trigger-manual": "MANUAL",
  "trigger-auto": "AUTO",
  popular: "MOST POPULAR",
};

export function Badge({ variant, label, className, children }: BadgeProps) {
  // If children is provided, use it instead of default content
  if (children) {
    return (
      <span className={cn(variantStyles[variant], "flex items-center gap-1 shrink-0", className)}>
        {children}
      </span>
    );
  }

  const displayLabel = label ?? defaultLabel[variant];
  const icon = variantIcon[variant];

  return (
    <span className={cn(variantStyles[variant], "flex items-center gap-1 shrink-0", className)}>
      {icon}
      {displayLabel}
    </span>
  );
}

/** Badge de risco dinâmico — recebe nível como string */
export function RiskBadge({ level, className }: { level: string; className?: string }) {
  const variant: BadgeVariant =
    level === "low" ? "risk-low" : level === "medium" ? "risk-medium" : "risk-high";
  return <Badge variant={variant} className={className} />;
}

/** Badge de status dinâmico — recebe status como string */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant: BadgeVariant =
    status === "published"
      ? "status-published"
      : status === "processing"
        ? "status-processing"
        : status === "error"
          ? "status-error"
          : "status-neutral";
  return <Badge variant={variant} className={className} />;
}

/** Badge de origem (source) dinâmico */
export function OriginBadge({
  verified,
  source,
  isActive,
  className,
}: {
  verified?: boolean;
  source?: string;
  isActive?: boolean;
  className?: string;
}) {
  let variant: BadgeVariant = "origin-community";
  if (verified && source !== "github") variant = "ai-verified";
  else if (source === "github" && !verified) variant = "origin-community";
  else if (verified && source === "github") variant = "ai-verified";
  else if (isActive === false) variant = "origin-pending";

  return <Badge variant={variant} className={className} />;
}
