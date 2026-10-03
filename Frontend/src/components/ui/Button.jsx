import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.js";

/**
 * Reusable Button component for consistent action button sizing,
 * squarish shape (rounded-xl), loading states, and variants.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className,
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all duration-120 ease-out active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none select-none shrink-0 cursor-pointer rounded-xl";

  const variants = {
    primary:
      "bg-indigo hover:bg-indigo-hover text-white",
    secondary:
      "bg-overlay hover:bg-overlay-hover text-ink border border-border",
    outline:
      "border border-border bg-transparent hover:bg-overlay text-ink",
    ghost:
      "bg-transparent hover:bg-overlay text-ink",
    danger:
      "bg-white hover:bg-surface-elevated text-[#C62828] border-2 border-[#C62828] font-black tracking-wide",
  };

  const sizes = {
    sm: "h-8 px-3.5 text-xs gap-1.5 min-w-[76px]",
    md: "h-9 px-4 text-xs sm:text-sm gap-1.5 min-w-[88px]",
    lg: "h-10 px-5 text-sm gap-2 min-w-[100px]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
