import React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StoryAvatarRing({
  src,
  size = 56,
  hasActiveStory = false,
  hasUnseen = false,
  isYou = false,
  onClick,
  onPlusClick,
  fallbackLetter,
  className,
  showPlusBadge = false,
}) {
  const s = typeof size === "number" ? `${size}px` : size;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer flex shrink-0 flex-col items-center gap-1 focus:outline-none",
        className
      )}
    >
      <div
        className={cn(
          "relative grid shrink-0 place-items-center rounded-full p-[2px] transition-transform duration-150 ease-out active:scale-95",
          hasActiveStory
            ? hasUnseen
              ? "bg-gradient-to-br from-indigo via-pink to-yellow shadow-md"
              : "bg-surface-elevated ring-2 ring-border-strong opacity-80"
            : "bg-transparent"
        )}
        style={{ width: s, height: s }}
      >
        <div className="h-full w-full rounded-full overflow-hidden bg-paper p-[2px] flex items-center justify-center">
          <div className="h-full w-full rounded-full overflow-hidden bg-surface flex items-center justify-center">
            {src ? (
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover select-none"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full bg-indigo text-white grid place-items-center text-xs font-bold">
                {(fallbackLetter || "U").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {isYou && showPlusBadge && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick && onPlusClick();
            }}
            className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-paper bg-indigo text-white shadow-md hover:bg-indigo/90 transition-colors cursor-pointer z-10"
          >
            <Plus size={12} strokeWidth={2.5} />
          </span>
        )}
      </div>
    </button>
  );
}
