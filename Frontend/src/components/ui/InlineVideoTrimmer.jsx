import React from "react";
import { Scissors, Clock } from "lucide-react";
import { formatTime } from "@/utils/videoUtils";
import { cn } from "@/lib/utils";

export default function InlineVideoTrimmer({
  duration = 0,
  startTime = 0,
  endTime = 0,
  maxDuration = 60,
  onTimeChange,
  onSeek,
  className,
}) {
  const effectiveEnd = endTime || Math.min(duration, maxDuration);
  const clipDuration = Math.max(0, effectiveEnd - startTime);

  const handleStartChange = (e) => {
    const val = parseFloat(e.target.value);
    const newStart = Math.min(val, Math.max(0, effectiveEnd - 1));
    let newEnd = effectiveEnd;
    if (newEnd - newStart > maxDuration) {
      newEnd = newStart + maxDuration;
    }
    onTimeChange && onTimeChange({ start: newStart, end: newEnd });
    onSeek && onSeek(newStart);
  };

  const handleEndChange = (e) => {
    const val = parseFloat(e.target.value);
    const newEnd = Math.max(val, startTime + 1);
    let newStart = startTime;
    if (newEnd - newStart > maxDuration) {
      newStart = Math.max(0, newEnd - maxDuration);
    }
    onTimeChange && onTimeChange({ start: newStart, end: newEnd });
    onSeek && onSeek(Math.max(newStart, newEnd - 0.1));
  };

  if (!duration || duration <= 0) return null;

  return (
    <div className={cn("flex w-full flex-col gap-2 rounded-2xl bg-surface p-3.5 border border-border/80 shadow-sm", className)}>
      {/* Header bar: duration info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          <Scissors size={14} className="text-indigo shrink-0" />
          <span>Adjust Duration</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-indigo-soft/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo">
          <Clock size={12} />
          <span>
            {formatTime(clipDuration)} / {formatTime(Math.min(duration, maxDuration))}
          </span>
        </div>
      </div>

      {/* Sliders Container */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Start Slider */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11px] font-medium text-text-subtle shrink-0">Start</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, duration - 1)}
            step={0.1}
            value={startTime}
            onChange={handleStartChange}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface-elevated accent-indigo focus:outline-none"
          />
          <span className="w-12 text-right text-[11px] font-mono text-ink font-semibold shrink-0">
            {formatTime(startTime)}
          </span>
        </div>

        {/* End Slider */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-[11px] font-medium text-text-subtle shrink-0">End</span>
          <input
            type="range"
            min={1}
            max={duration}
            step={0.1}
            value={effectiveEnd}
            onChange={handleEndChange}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface-elevated accent-indigo focus:outline-none"
          />
          <span className="w-12 text-right text-[11px] font-mono text-ink font-semibold shrink-0">
            {formatTime(effectiveEnd)}
          </span>
        </div>
      </div>
    </div>
  );
}
