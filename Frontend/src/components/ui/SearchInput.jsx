import React, { forwardRef, useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils.js";

const SearchInput = forwardRef(function SearchInput(
  {
    value,
    onChange,
    onSubmit,
    onClear,
    placeholder = "Search…",
    size = "md",
    variant = "surface",
    showClearButton = true,
    className,
    inputClassName,
    disabled = false,
    autoFocus = false,
    id,
    name,
    ariaLabel,
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = useMemo(
    () => typeof value === "string" && value.length > 0,
    [value]
  );

  const sizeTokens = {
    sm: "h-9 gap-1.5 px-3 text-[13px] leading-5",
    md: "h-11 gap-2 px-4 text-[14px] leading-6",
    lg: "h-12 gap-2.5 px-5 text-[15px] leading-6",
  };

  const clearSize = {
    sm: "h-5 w-5",
    md: "h-[22px] w-[22px]",
    lg: "h-6 w-6",
  };
  const clearIconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  const variantTokens = {
    surface:
      "bg-surface text-ink placeholder:text-text-placeholder border border-border hover:border-border-strong",
    elevated:
      "bg-surface-elevated text-ink placeholder:text-text-placeholder border border-transparent hover:border-border-strong",
    ghost:
      "bg-overlay text-ink placeholder:text-text-placeholder border border-transparent hover:bg-overlay-hover",
  };

  const focusTokens =
    "focus-within:border-indigo focus-within:ring-[3px] focus-within:ring-[rgba(107,91,255,0.28)] focus-within:shadow-[0_0_0_3px_rgba(107,91,255,0.28)]";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(typeof value === "string" ? value.trim() : "");
  };

  const handleClear = (e) => {
    e.preventDefault();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        "relative flex w-full items-center rounded-lg transition-all duration-120 ease-out select-none",
        sizeTokens[size],
        variantTokens[variant],
        focusTokens,
        isFocused && "shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
        disabled && "opacity-60 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <Search
        aria-hidden="true"
        className="shrink-0 text-text-subtle"
        size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
        strokeWidth={2}
      />
      <input
        ref={ref}
        id={id}
        name={name}
        type="search"
        autoComplete="off"
        spellCheck="false"
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        value={value ?? ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
  
  "w-full min-w-0 bg-transparent border-0 outline-none p-0",
  "font-normal leading-[inherit] text-[inherit]",
  "placeholder:font-normal placeholder:font-variation-settings-[\"wght\"_400,\"wdth\"_100]",
  "font-optical-sizing-none font-variation-settings-[\"wght\"_400,\"wdth\"_100]",
  "caret-color-[color:color-mix(in_oklab,var(--color-ink)_55%,transparent)]",

          "focus:outline-none focus:ring-0 focus:shadow-none",
          "search-cancel:appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none",
          inputClassName
        )}
      />

      {showClearButton && hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          tabIndex={-1}
          className={cn(
            "ml-1 grid shrink-0 place-items-center rounded-[7px] cursor-pointer transition-all duration-120 ease-out active:scale-[0.92]",
            clearSize[size],
            "hover:bg-overlay-strong",
            "text-[color:var(--search-clear-color,color-mix(in_oklab,var(--color-ink)_92%,var(--color-paper)))]"
          )}
          style={{
            // Theme-aware clear icon color:
            // Dark mode (default / prefers-color-scheme dark)  → white-ish (ink)
            // Light mode (prefers-color-scheme light)         → black-ish (paper)
            // [data-theme="light"] / [data-theme="dark"] attribute override also supported
            ["--search-clear-color"]:
              "var(--color-text, color-mix(in_oklab, var(--color-ink) 92%, var(--color-paper)))",
          }}
        >
          <X
            size={clearIconSize}
            strokeWidth={2.4}
            aria-hidden="true"
            className="block"
          />
        </button>
      )}
    </form>
  );
});

export default SearchInput;
