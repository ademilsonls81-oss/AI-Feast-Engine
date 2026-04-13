import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, success, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={cn(
            "w-full bg-black/40 border rounded-xl px-4 py-3 text-sm outline-none transition-all",
            "focus:border-neon-purple",
            error && "border-red-500/50 focus:border-red-500",
            success && "border-green-500/50 focus:border-green-500",
            !error && !success && "border-white/10",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

/** Textarea com os mesmos estilos de Input */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none min-h-[100px]",
            "focus:border-neon-purple",
            error && "border-red-500/50 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

/** Select com os mesmos estilos */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none transition-all",
        "focus:border-neon-purple",
        className
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";
