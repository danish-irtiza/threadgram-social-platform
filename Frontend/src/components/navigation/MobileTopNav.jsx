import React from "react";
import { Bell,  Plus } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { useTheme } from "@/context/ThemeContext.jsx";
import lightWordmark from "@/assets/logo/thredgram-wordmark-light-theme-removebg-preview.png";
import darkWordmark from "@/assets/logo/thredgram-wordmark-dark-theme-removebg-preview.png";

export default function MobileTopNav({
  onStoryCreateClick,
  onNotificationsClick,
  onLikesClick,
  className,
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const wordmark = isDark ? darkWordmark : lightWordmark;

  return (
    <header
      role="banner"
      className={cn(
        "fixed inset-x-0 top-0 z-40 lg:hidden",
        "bg-paper/90 backdrop-blur-[12px]",
        "border-b border-border-subtle/70",
        "pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      <div className="grid h-14 grid-cols-3 items-center px-3 sm:px-4">
        <div className="flex min-w-0 items-center justify-self-start">
          <button
            type="button"
            onClick={() => onStoryCreateClick && onStoryCreateClick()}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-all duration-120 ease-out hover:bg-overlay-hover hover:text-ink active:scale-[0.96]"
            )}
            aria-label="Create story"
            title="Create story"
          >
            <Plus size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-w-0 items-center justify-self-center justify-center px-2">
          <img
            src={wordmark}
            alt="Threadgram"
            className="h-7 max-w-full shrink-0 select-none brightness-110 contrast-125 filter"
            draggable={false}
          />
        </div>

        <div className="flex min-w-0 items-center justify-self-end gap-1">
          <button
            type="button"
            onClick={() => onNotificationsClick && onNotificationsClick()}
            className={cn(
              "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-all duration-120 ease-out hover:bg-overlay-hover hover:text-ink active:scale-[0.96]"
            )}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={20} strokeWidth={2} />
          </button>
          
        </div>
      </div>
    </header>
  );
}
