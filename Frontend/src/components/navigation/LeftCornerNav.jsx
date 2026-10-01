import React from "react";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  PlusSquare,
  PlaySquare,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils.js";

export const LEFT_NAV_TABS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
  { id: "create", label: "Create", Icon: PlusSquare, isPrimary: true },
  { id: "reels", label: "Reels", Icon: PlaySquare },
  { id: "profile", label: "Profile", Icon: User },
];

export default function LeftCornerNav({
  activeId = "home",
  onChange,
  tabs = LEFT_NAV_TABS,
  className,
  desktopClassName,
  mobileClassName,
}) {
  return (
    <>
      <nav
        role="tablist"
        aria-label="Primary"
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen w-[72px] shrink-0 flex-col items-center gap-2 border-r border-border-subtle/70 bg-paper px-2 py-4 lg:flex",
          "xl:w-[84px] xl:px-3 xl:py-5",
          desktopClassName,
          className
        )}
      >
        <ul className="flex min-h-0 w-full flex-1 flex-col items-center gap-1.5">
          {tabs.map(({ id, label, Icon, isPrimary }) => {
            const active = activeId === id;
            return (
              <li key={id} className="w-full">
                <button
                  role="tab"
                  aria-selected={active}
                  aria-label={label}
                  type="button"
                  onClick={() => onChange && onChange(id)}
                  className={cn(
                    "group relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 transition-all duration-120 ease-out active:scale-[0.96]",
                    active
                      ? "text-indigo bg-indigo-soft/60"
                      : "text-text-subtle hover:text-ink hover:bg-overlay"
                  )}
                >
                  <span
                    className={cn(
                      "grid place-items-center transition-all duration-120 ease-out",
                      isPrimary
                        ? cn(
                            "h-11 w-11 rounded-full",
                            active
                              ? "bg-indigo text-white shadow-[0_6px_18px_-6px_rgba(107,91,255,0.55)]"
                              : "bg-indigo/95 text-white shadow-[0_6px_18px_-6px_rgba(107,91,255,0.40)] group-hover:bg-indigo"
                          )
                        : "h-10 w-10 rounded-xl"
                    )}
                  >
                    <Icon size={isPrimary ? 24 : 22} strokeWidth={2} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold leading-3 uppercase tracking-[0.06em]",
                      isPrimary ? "text-text-subtle mt-0.5" : ""
                    )}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        role="tablist"
        aria-label="Primary"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
          "pb-[env(safe-area-inset-bottom)]",
          mobileClassName,
          className
        )}
      >
        <div
          className={cn(
            "mx-auto grid max-w-[620px] grid-cols-5 items-stretch border-t border-border bg-paper/90 backdrop-blur-[12px] px-2 py-2 sm:px-4"
          )}
        >
          {tabs.map(({ id, label, Icon, isPrimary }) => {
            const active = activeId === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                aria-label={label}
                type="button"
                onClick={() => onChange && onChange(id)}
                className={cn(
                  "group relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-120 ease-out active:scale-[0.96] touch-manipulation min-h-[56px]",
                  active
                    ? "text-indigo"
                    : "text-text-subtle hover:text-ink hover:bg-overlay"
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center rounded-full transition-all duration-120 ease-out",
                    isPrimary
                      ? cn(
                          "h-12 w-12 -mt-1",
                          active
                            ? "bg-indigo text-white shadow-[0_6px_16px_-6px_rgba(107,91,255,0.55)]"
                            : "bg-indigo/95 text-white shadow-[0_6px_16px_-6px_rgba(107,91,255,0.40)] group-hover:bg-indigo"
                        )
                      : "h-9 w-9"
                  )}
                >
                  <Icon size={isPrimary ? 24 : 22} strokeWidth={2} />
                </span>
                {!isPrimary && (
                  <span className="text-[10px] font-medium leading-3 uppercase tracking-[0.08em] -mt-0.5">
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
