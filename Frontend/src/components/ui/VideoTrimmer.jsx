import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Scissors, Clock } from "lucide-react";
import { MAX_VIBE_DURATION, formatTime, trimVideoFile } from "@/utils/videoUtils";
import { cn } from "@/lib/utils";

export default function VideoTrimmer({
  file,
  initialDuration = 0,
  onTrimComplete,
  onCancel,
  className,
}) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(initialDuration);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(
    Math.min(initialDuration || MAX_VIBE_DURATION, MAX_VIBE_DURATION)
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [error, setError] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // Create and revoke object URL cleanly
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Sync isPlaying with actual browser events — avoids stale state desync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("play",  onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play",  onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [objectUrl]); // re-attach when objectUrl changes (new file)

  // Loop playback within [startTime, endTime]
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.pause();
        video.currentTime = startTime;
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTime, endTime]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const d = video.duration;
    setDuration(d);
    setStartTime(0);
    setEndTime(Math.min(d, MAX_VIBE_DURATION));
    video.currentTime = 0;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (
        video.currentTime < startTime ||
        video.currentTime >= endTime
      ) {
        video.currentTime = startTime;
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleStartChange = (e) => {
    const val = parseFloat(e.target.value);
    const newStart = Math.min(val, endTime - 1);
    setStartTime(newStart);
    if (endTime - newStart > MAX_VIBE_DURATION) {
      setEndTime(newStart + MAX_VIBE_DURATION);
    }
    const video = videoRef.current;
    if (video) video.currentTime = newStart;
  };

  const handleEndChange = (e) => {
    const val = parseFloat(e.target.value);
    const newEnd = Math.max(val, startTime + 1);
    if (newEnd - startTime > MAX_VIBE_DURATION) {
      setStartTime(Math.max(0, newEnd - MAX_VIBE_DURATION));
    }
    setEndTime(newEnd);
    const video = videoRef.current;
    if (video) video.currentTime = Math.max(startTime, newEnd - 0.1);
  };

  const clipDuration = Math.max(0, endTime - startTime);

  const handleTrim = async () => {
    if (isTrimming) return;
    setError(null);
    setIsTrimming(true);
    setTrimProgress(0);

    const video = videoRef.current;
    if (video) video.pause();

    try {
      const trimmedFile = await trimVideoFile(
        file,
        startTime,
        endTime,
        (progress) => setTrimProgress(progress)
      );
      setIsTrimming(false);
      if (onTrimComplete) onTrimComplete(trimmedFile);
    } catch (err) {
      console.error("Video trimming error:", err);
      setError(err.message || "Failed to trim video. Please try again.");
      setIsTrimming(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-4 py-2", className)}>
      {/* Video Preview */}
      <div className="relative flex aspect-[9/16] max-h-[360px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-lg">
        {objectUrl && (
          <video
            ref={videoRef}
            src={objectUrl}
            onLoadedMetadata={handleLoadedMetadata}
            playsInline
            className="h-full w-full object-contain"
          />
        )}

        {/* Play / Pause overlay */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={isTrimming}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
          className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 border border-white/25 text-white shadow-2xl backdrop-blur-md hover:bg-black/60 hover:scale-110 active:scale-95 transition-all duration-200">
            {isPlaying ? (
              <Pause size={24} className="fill-white text-white" />
            ) : (
              <Play size={24} className="ml-0.5 fill-white text-white" />
            )}
          </div>
        </button>

        {/* Duration badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[12px] font-medium text-white backdrop-blur">
          <Clock size={14} />
          <span>{formatTime(clipDuration)} / 01:00</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-md rounded-xl bg-pink-soft/80 p-3 text-center text-xs font-medium text-pink">
          {error}
        </div>
      )}

      {/* Trimming Progress */}
      {isTrimming && (
        <div className="w-full max-w-md space-y-2 rounded-xl bg-surface p-4 border border-border">
          <div className="flex justify-between text-xs font-semibold text-ink">
            <span>Trimming video</span>
            <span>{trimProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full bg-indigo transition-all duration-150"
              style={{ width: `${trimProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Trim Controls */}
      {!isTrimming && (
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-subtle">
            <span>Start: {formatTime(startTime)}</span>
            <span className="font-bold text-indigo">
              Clip: {formatTime(clipDuration)} (Max 60s)
            </span>
            <span>End: {formatTime(endTime)}</span>
          </div>

          {/* Start Time Slider */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
              Start Position
            </label>
            <input
              type="range"
              min={0}
              max={Math.max(0, duration - 1)}
              step={0.1}
              value={startTime}
              onChange={handleStartChange}
              className="w-full accent-indigo cursor-pointer"
            />
          </div>

          {/* End Time Slider */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
              End Position
            </label>
            <input
              type="range"
              min={Math.min(1, startTime + 1)}
              max={duration || MAX_VIBE_DURATION}
              step={0.1}
              value={endTime}
              onChange={handleEndChange}
              className="w-full accent-indigo cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 cursor-pointer rounded-xl border border-border bg-paper py-2.5 text-xs font-semibold text-ink hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleTrim}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all active:scale-[0.98]"
            >
              <Scissors size={16} />
              <span>Continue</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
