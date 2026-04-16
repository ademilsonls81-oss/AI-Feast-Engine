import React from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "danger" | "outline" | "icon-success" | "icon-danger" | "link";
export type ButtonSize = "default" | "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  primary: "bg-neon-purple text-white font-bold rounded-full neon-glow-purple hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all",
  secondary: "bg-white/5 border border-white/10 text-gray-100 font-bold rounded-full hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5 font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
  "icon-success": "p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all",
  "icon-danger": "p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
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
        "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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