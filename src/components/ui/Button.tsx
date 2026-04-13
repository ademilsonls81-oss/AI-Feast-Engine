import React from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon-success" | "icon-danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-neon-purple text-white font-bold rounded-full neon-glow-purple hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all",
  secondary:
    "bg-white/5 border border-white/10 text-gray-100 font-bold rounded-full hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  "icon-success":
    "p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all",
  "icon-danger":
    "p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
