import React from "react";
import { cn } from "../../lib/utils";
import { LucideIcon, Search, FileText, BarChart3, History, Shield, Database, Users } from "lucide-react";

export type EmptyStateContext = "skills" | "feed" | "dashboard" | "logs" | "posts" | "users" | "generic";

const contextIcons: Record<EmptyStateContext, LucideIcon> = {
  skills: Shield,
  feed: Search,
  dashboard: BarChart3,
  logs: History,
  posts: FileText,
  users: Users,
  generic: Database,
};

const defaultContent: Record<
  EmptyStateContext,
  { title: string; description: string }
> = {
  skills: {
    title: "No skills found",
    description: "Try adjusting your filters or search terms.",
  },
  feed: {
    title: "No matching insights found",
    description: "Try a different category or search term.",
  },
  dashboard: {
    title: "No usage data yet",
    description: "Make API requests to see metrics.",
  },
  logs: {
    title: "No API calls recorded yet",
    description: "Use your API key to make requests and logs will appear here.",
  },
  posts: {
    title: "No recent processing jobs",
    description: "New posts will show up here when processed.",
  },
  users: {
    title: "No users yet",
    description: "Users will appear here when they sign up.",
  },
  generic: {
    title: "Nothing here yet",
    description: "Content will appear when available.",
  },
};

export interface EmptyStateProps {
  context?: EmptyStateContext;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  onAction?: () => void;
  ctaLabel?: string;
  className?: string;
}

const defaultCta: Record<EmptyStateContext, string> = {
  skills: "Explore skills",
  feed: "Browse feed",
  dashboard: "View API docs",
  logs: "Make your first call",
  posts: "Check back soon",
  users: "Invite users",
  generic: "Get started",
};

export function EmptyState({
  context = "generic",
  icon: CustomIcon,
  title,
  description,
  action,
  onAction,
  ctaLabel,
  className,
}: EmptyStateProps) {
  const Icon = CustomIcon ?? contextIcons[context];
  const content = defaultContent[context];
  const displayLabel = ctaLabel ?? defaultCta[context];

  return (
    <div className={cn("text-center py-12", className)}>
      <Icon className="w-10 h-10 text-gray-600 mx-auto mb-3 opacity-30" />
      <div className="text-xs text-gray-500 mb-2 font-medium">{title ?? content.title}</div>
      <div className="text-[10px] text-gray-600 mb-3">{description ?? content.description}</div>
      {action}
      {!action && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 rounded-lg text-xs font-bold hover:bg-neon-cyan/20 transition-all"
        >
          {displayLabel}
        </button>
      )}
    </div>
  );
}
