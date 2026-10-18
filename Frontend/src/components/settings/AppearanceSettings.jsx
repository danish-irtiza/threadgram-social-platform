import React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext.jsx";

const THEME_OPTIONS = [
  {
    id: "light",
    label: "Light",
    description: "Clean, bright interface",
    icon: Sun,
    gradient: "from-amber-100 to-orange-100",
    activeRing: "ring-amber-400",
    iconColor: "text-amber-500",
    previewBg: "bg-white",
    previewBar: "bg-gray-200",
    previewAccent: "bg-indigo-500",
    previewText: "bg-gray-300",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Midnight mode for late scrolls",
    icon: Moon,
    gradient: "from-indigo-900 to-slate-900",
    activeRing: "ring-indigo-400",
    iconColor: "text-indigo-400",
    previewBg: "bg-[#1a1a2e]",
    previewBar: "bg-[#2a2a3e]",
    previewAccent: "bg-indigo-500",
    previewText: "bg-[#3a3a4e]",
  },

];

export default function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          {resolvedTheme === "dark" ? (
            <Moon className="h-5 w-5 text-indigo-400" />
          ) : (
            <Sun className="h-5 w-5 text-amber-500" />
          )}
          Switch Appearance
        </h3>
        <p className="mt-1 text-xs text-muted">
          Customize how Threadgram looks on your device.</p>
      </div>

      {/* Theme Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`group relative flex flex-col rounded-2xl border-2 p-3.5 text-left transition-all duration-200 cursor-pointer ${isActive
                ? `border-indigo ${opt.activeRing} ring-2 ring-offset-2 ring-offset-surface shadow-lg`
                : "border-border/60 hover:border-border hover:shadow-md"
                }`}
            >
              {/* Mini Preview */}
              <div
                className={`relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 ${opt.previewBg} border border-border/30`}
              >
                {/* Top bar */}
                <div
                  className={`h-3 w-full ${opt.previewBar} flex items-center px-1.5 gap-0.5`}
                >
                  <div className="h-1 w-1 rounded-full bg-red-400/70" />
                  <div className="h-1 w-1 rounded-full bg-yellow-400/70" />
                  <div className="h-1 w-1 rounded-full bg-green-400/70" />
                </div>

                {/* Content preview */}
                <div className="p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-indigo-soft" />
                    <div className={`h-1.5 w-10 rounded-full ${opt.previewText}`} />
                  </div>
                  <div className={`h-8 w-full rounded-lg ${opt.previewText} opacity-50`} />
                  <div className="flex gap-1">
                    <div className={`h-1.5 w-6 rounded-full ${opt.previewAccent} opacity-80`} />
                    <div className={`h-1.5 w-8 rounded-full ${opt.previewText} opacity-40`} />
                  </div>
                </div>

                {/* Active check */}
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-indigo grid place-items-center">
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex items-center gap-2">
                <div
                  className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${isActive
                    ? "bg-indigo text-white"
                    : "bg-surface-elevated text-muted group-hover:text-ink"
                    }`}
                >
                  <Icon size={14} strokeWidth={2.2} />
                </div>
                <div>
                  <p
                    className={`text-xs font-bold leading-tight ${isActive ? "text-ink" : "text-ink/80"
                      }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-muted leading-tight">
                    {opt.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-elevated/50 px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-soft text-indigo">
          {resolvedTheme === "dark" ? (
            <Moon size={16} strokeWidth={2} />
          ) : (
            <Sun size={16} strokeWidth={2} />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-ink">
            Currently using{" "}
            <span className="text-indigo capitalize">{resolvedTheme}</span> mode
          </p>
          <p className="text-[10px] text-muted">
            {theme === "system"
              ? "Automatically adapting to your device preferences"
              : `Manually set to ${theme} mode`}
          </p>
        </div>
      </div>
    </div>
  );
}
