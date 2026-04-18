import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

export type TooltipContext = "skills" | "dashboard" | "feed";

interface OnboardingTooltipProps {
  context: TooltipContext;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onDismiss: () => void;
}

const tooltipContent: Record<
  TooltipContext,
  { message: string; ctaLabel: string }
> = {
  skills: {
    message:
      "Browse and install AI-powered skills with one command. Click any card to see details.",
    ctaLabel: "Explore skills",
  },
  dashboard: {
    message:
      "Manage your API key, monitor usage, and track processing status. Everything you need is here.",
    ctaLabel: "View docs",
  },
  feed: {
    message:
      "Real-time AI feed with summaries and translations. Filter by category or search for topics.",
    ctaLabel: "Browse feed",
  },
};

export default function OnboardingTooltip({
  context,
  message,
  ctaLabel: ctaLabelProp,
  onCta,
  onDismiss,
}: OnboardingTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delayed appearance for smooth UX
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const content = tooltipContent[context];
  const displayMessage = message ?? content.message;
  const displayCta = ctaLabelProp ?? content.ctaLabel;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative mt-4 mb-6"
        >
          <div className="p-4 bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-gray-300">{displayMessage}</p>
              {onCta && (
                <button
                  onClick={onCta}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-neon-cyan hover:underline"
                >
                  {displayCta} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onDismiss, 200);
              }}
              className="p-1 hover:bg-white/5 rounded transition-colors text-gray-500 hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
