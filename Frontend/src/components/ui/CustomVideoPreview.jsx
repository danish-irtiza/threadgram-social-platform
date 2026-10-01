import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "@/utils/videoUtils";
import { cn } from "@/lib/utils";

export default function CustomVideoPreview({
  src,
  className,
  showControls = true,
  hideFullscreen = false,
  autoPlay = false,
  loop = true,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkAndSetDuration = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      } else if (video.seekable && video.seekable.length > 0) {
        const seekableEnd = video.seekable.end(video.seekable.length - 1);
        if (isFinite(seekableEnd) && seekableEnd > 0) {
          setDuration(seekableEnd);
        }
      }
    };

    // Immediate check if metadata already loaded
    checkAndSetDuration();

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (loop) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    const onTimeUpdate = () => {
      if (!isSeeking && video) {
        setCurrentTime(video.currentTime);
        checkAndSetDuration();
      }
    };

    const onLoadedMetadata = () => {
      checkAndSetDuration();
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", checkAndSetDuration);
    video.addEventListener("durationchange", checkAndSetDuration);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", checkAndSetDuration);
      video.removeEventListener("durationchange", checkAndSetDuration);
    };
  }, [src, autoPlay, loop, isSeeking]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    const video = videoRef.current;
    if (video) {
      video.currentTime = val;
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
    const video = videoRef.current;
    if (video && isPlaying) {
      video.play().catch(() => {});
    }
  };

  const validDuration = isFinite(duration) && duration > 0 ? duration : 0;
  const progressPercent = validDuration > 0 ? Math.min(100, (currentTime / validDuration) * 100) : 0;

  return (
    <div
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-2xl bg-black select-none",
        className
      )}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted={isMuted}
        className="h-full w-full object-contain pointer-events-none"
      />

      {/* Center Big Play/Pause Button Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-200 pointer-events-none",
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        )}
      >
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 border border-white/25 text-white shadow-2xl backdrop-blur-md pointer-events-auto hover:bg-black/60 hover:border-white/40 hover:scale-110 active:scale-95 transition-all duration-200"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={24} className="fill-white text-white" />
          ) : (
            <Play size={24} className="ml-0.5 fill-white text-white" />
          )}
        </button>
      </div>

      {/* Custom Bottom Player Control Bar */}
      {showControls && (
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress / Seek Bar */}
          <div className="relative flex items-center w-full group/slider">
            <input
              type="range"
              min={0}
              max={validDuration || 100}
              step={0.01}
              value={currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/30 accent-indigo focus:outline-none"
              style={{
                background: `linear-gradient(to right, #6366f1 ${progressPercent}%, rgba(255, 255, 255, 0.3) ${progressPercent}%)`,
              }}
            />
          </div>

          {/* Time & Audio Controls */}
          <div className="flex items-center justify-between text-[11px] font-medium text-white/90 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="hover:text-white transition-colors"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <span>
                {formatTime(currentTime)} / {validDuration > 0 ? formatTime(validDuration) : "--:--"}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              className="hover:text-white transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
