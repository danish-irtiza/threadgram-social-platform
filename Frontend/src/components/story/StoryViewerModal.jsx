import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Eye, Heart, Trash2, Volume2, VolumeX, ChevronLeft, ChevronRight, Loader2, MoreHorizontal } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  closeStoryViewer,
  setActiveViewerIndexes,
  markStoryViewed,
  toggleLikeStory,
  deleteStory,
  fetchStoryViewers,
  markStoryViewedLocally,
} from "@/redux/features/story/storySlice";
import { cn } from "@/lib/utils";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
};

export default function StoryViewerModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;

  const { activeViewer, storyViewersData } = useSelector((s) => s.story || {});
  const { isOpen, groupIndex = 0, storyIndex = 0, groups = [] } = activeViewer || {};

  const [isMuted, setIsMuted] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [isSheetClosing, setIsSheetClosing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const videoRef = useRef(null);
  const activeProgressBarRef = useRef(null);
  const waitingTimerRef = useRef(null);
  const imageAnimRef = useRef(null);
  const lastTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const prevStoryIdRef = useRef(null);

  const currentGroup = groups[groupIndex] || null;
  const currentStoryList = currentGroup?.stories || [];
  const currentStory = currentStoryList[storyIndex] || null;
  const author = currentGroup?.user || currentStory?.author || {};

  const isOwner = currentUserId && String(currentUserId) === String(author._id);
  const isVideo =
    currentStory?.mediaType === "video" ||
    Boolean(currentStory?.media?.match(/\.(mp4|webm|mov|mkv|m4v)(\?.*)?$/i)) ||
    Boolean(currentStory?.media?.includes("/video/upload/"));

  // Whether the timer should be paused (menu or viewers sheet open)
  const isPaused = showMenu || showViewersSheet;

  // Smoothly close the viewers bottom sheet with exit animation
  const handleCloseViewersSheet = useCallback(() => {
    if (isSheetClosing) return;
    setIsSheetClosing(true);
    setTimeout(() => {
      setShowViewersSheet(false);
      setIsSheetClosing(false);
    }, 220);
  }, [isSheetClosing]);

  // Close viewer
  const handleClose = useCallback(() => {
    dispatch(closeStoryViewer());
    setShowViewersSheet(false);
    setIsSheetClosing(false);
    setShowMenu(false);
    elapsedRef.current = 0;
    if (activeProgressBarRef.current) {
      activeProgressBarRef.current.style.width = "0%";
    }
  }, [dispatch]);

  // Navigate next story / next group
  const handleNext = useCallback(() => {
    if (showViewersSheet) {
      setShowViewersSheet(false);
      setIsSheetClosing(false);
    }
    elapsedRef.current = 0;
    if (activeProgressBarRef.current) {
      activeProgressBarRef.current.style.width = "0%";
    }
    if (storyIndex < currentStoryList.length - 1) {
      dispatch(setActiveViewerIndexes({ groupIndex, storyIndex: storyIndex + 1 }));
    } else if (groupIndex < groups.length - 1) {
      dispatch(setActiveViewerIndexes({ groupIndex: groupIndex + 1, storyIndex: 0 }));
    } else {
      handleClose();
    }
  }, [showViewersSheet, storyIndex, currentStoryList.length, groupIndex, groups.length, dispatch, handleClose]);

  // Navigate prev story / prev group
  const handlePrev = useCallback(() => {
    if (showViewersSheet) {
      setShowViewersSheet(false);
      setIsSheetClosing(false);
    }
    elapsedRef.current = 0;
    if (activeProgressBarRef.current) {
      activeProgressBarRef.current.style.width = "0%";
    }
    if (storyIndex > 0) {
      dispatch(setActiveViewerIndexes({ groupIndex, storyIndex: storyIndex - 1 }));
    } else if (groupIndex > 0) {
      const prevGroupStories = groups[groupIndex - 1]?.stories || [];
      dispatch(
        setActiveViewerIndexes({
          groupIndex: groupIndex - 1,
          storyIndex: Math.max(0, prevGroupStories.length - 1),
        })
      );
    }
  }, [showViewersSheet, storyIndex, groupIndex, groups, dispatch]);

  // Reset progress and elapsed time whenever active story changes
  useEffect(() => {
    if (currentStory?._id !== prevStoryIdRef.current) {
      prevStoryIdRef.current = currentStory?._id;
      elapsedRef.current = 0;
      if (activeProgressBarRef.current) {
        activeProgressBarRef.current.style.width = "0%";
      }
    }
  }, [currentStory?._id]);

  // Mark story as viewed (both locally in Redux and persisted via backend API for all users)
  useEffect(() => {
    if (!isOpen || !currentStory?._id) return;
    if (!currentStory.isViewed) {
      dispatch(markStoryViewedLocally(currentStory._id));
      dispatch(markStoryViewed(currentStory._id));
    }
  }, [isOpen, currentStory?._id, currentStory?.isViewed, dispatch]);

  // Progress timer for Image stories (smooth 60fps rAF with pause/resume support)
  useEffect(() => {
    if (!isOpen || !currentStory || isVideo) return;

    if (activeProgressBarRef.current) {
      activeProgressBarRef.current.style.width = `${(elapsedRef.current / 5000) * 100}%`;
    }

    if (isPaused) {
      return;
    }

    const DURATION = 5000;
    lastTimeRef.current = performance.now();

    const tick = (now) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      elapsedRef.current += delta;

      const pct = Math.min(100, (elapsedRef.current / DURATION) * 100);
      if (activeProgressBarRef.current) {
        activeProgressBarRef.current.style.width = `${pct}%`;
      }

      if (elapsedRef.current >= DURATION) {
        elapsedRef.current = 0;
        handleNext();
      } else {
        imageAnimRef.current = requestAnimationFrame(tick);
      }
    };

    imageAnimRef.current = requestAnimationFrame(tick);

    return () => {
      if (imageAnimRef.current) {
        cancelAnimationFrame(imageAnimRef.current);
        imageAnimRef.current = null;
      }
    };
  }, [isOpen, currentStory?._id, isVideo, isPaused, handleNext]);

  // Pause / Resume video when menu or viewers sheet is open
  useEffect(() => {
    if (!isOpen || !currentStory || !isVideo) return;

    if (isPaused) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else {
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, isVideo, isOpen, currentStory?._id]);

  // 60fps animation loop for video progress bar sync (direct DOM style update, no React re-render thrashing)
  useEffect(() => {
    if (!isOpen || !currentStory || !isVideo || isPaused) return;

    let animId;
    const syncVideoProgress = () => {
      const video = videoRef.current;
      if (
        video &&
        !video.paused &&
        !video.ended &&
        isFinite(video.duration) &&
        video.duration > 0
      ) {
        const pct = Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100));
        if (activeProgressBarRef.current) {
          activeProgressBarRef.current.style.width = `${pct}%`;
        }
      }
      if (isOpen && isVideo && !isPaused) {
        animId = requestAnimationFrame(syncVideoProgress);
      }
    };

    animId = requestAnimationFrame(syncVideoProgress);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isOpen, currentStory?._id, isVideo, isPaused]);

  // Auto-play video on story change with unmuted fallback
  useEffect(() => {
    if (!isOpen || !currentStory || !isVideo) return;

    const video = videoRef.current;
    if (!video) return;

    // If video is still buffering, debounce showing loader to avoid micro-stutter flashes
    if (video.readyState < 3) {
      if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = setTimeout(() => {
        setIsVideoLoading(true);
      }, 250);
    } else {
      setIsVideoLoading(false);
    }

    const playVideo = async () => {
      try {
        await video.play();
        if (waitingTimerRef.current) {
          clearTimeout(waitingTimerRef.current);
          waitingTimerRef.current = null;
        }
        setIsVideoLoading(false);
      } catch (err) {
        console.warn("Unmuted autoplay failed, muting video to enable playback:", err);
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
            if (waitingTimerRef.current) {
              clearTimeout(waitingTimerRef.current);
              waitingTimerRef.current = null;
            }
            setIsVideoLoading(false);
          } catch (retryErr) {
            console.error("Video play failed completely:", retryErr);
            setIsVideoLoading(false);
          }
        }
      }
    };

    playVideo();

    return () => {
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
    };
  }, [isOpen, currentStory?._id, isVideo]);

  // Video event handlers
  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (video && isFinite(video.duration) && video.duration > 0) {
      const pct = Math.min(100, Math.max(0, (video.currentTime / video.duration) * 100));
      if (activeProgressBarRef.current) {
        activeProgressBarRef.current.style.width = `${pct}%`;
      }
    }
  };

  const handleVideoPlaying = () => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setIsVideoLoading(false);
  };

  const handleVideoWaiting = () => {
    if (waitingTimerRef.current) clearTimeout(waitingTimerRef.current);
    // Debounce: only show loading spinner if buffering takes longer than 300ms
    waitingTimerRef.current = setTimeout(() => {
      setIsVideoLoading(true);
    }, 300);
  };

  const handleVideoEnded = () => {
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = null;
    }
    setIsVideoLoading(false);
    if (activeProgressBarRef.current) {
      activeProgressBarRef.current.style.width = "100%";
    }
    handleNext();
  };

  // Fetch viewers list when owner opens viewers sheet
  const handleOpenViewersSheet = () => {
    if (!currentStory?._id || !isOwner) return;
    dispatch(fetchStoryViewers(currentStory._id));
    setIsSheetClosing(false);
    setShowViewersSheet(true);
    setShowMenu(false);
  };

  // Toggle like handler
  const handleLike = (e) => {
    e.stopPropagation();
    if (currentStory?._id) {
      dispatch(toggleLikeStory(currentStory._id));
    }
  };

  // Delete story handler
  const handleDeleteStory = async () => {
    if (!currentStory?._id || !isOwner || isDeleting) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteStory(currentStory._id)).unwrap();
      setShowViewersSheet(false);
      setShowMenu(false);
    } catch (err) {
      console.error("[StoryViewerModal] Delete story error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !currentStory) return null;

  const currentViewersInfo = storyViewersData[currentStory._id] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-150 select-none">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Story Card Container */}
      <div className="relative flex h-full w-full max-w-[420px] max-h-[100vh] sm:max-h-[860px] flex-col overflow-hidden bg-black shadow-2xl sm:rounded-3xl z-10">

        {/* Top Progress Segment Bar */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5 pointer-events-none">
          {currentStoryList.map((st, idx) => {
            const isPast = idx < storyIndex;
            const isCurrent = idx === storyIndex;

            return (
              <div key={st._id || idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-sm">
                <div
                  ref={isCurrent ? activeProgressBarRef : null}
                  className="h-full bg-indigo transition-none"
                  style={{ width: isPast ? "100%" : "0%" }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header Row */}
        <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
          {/* Author Details */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
              if (author?.username) navigate(`/${author.username}`);
            }}
            className="flex items-center gap-2.5 text-white hover:opacity-90 transition-opacity cursor-pointer group text-left"
          >
            <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-surface shrink-0 shadow-md">
              {author?.avatar ? (
                <img src={author.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-indigo text-white grid place-items-center text-xs font-bold">
                  {(author.name || author.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-bold text-white drop-shadow-md truncate">
                @{author?.username || "user"}
              </span>
              <span className="text-[11px] text-white/75 drop-shadow-md">
                • {formatTimeAgo(currentStory.createdAt)}
              </span>
            </div>
          </button>

          {/* Action buttons top right */}
          <div className="flex items-center gap-1.5">
            {isVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => {
                    const next = !prev;
                    if (videoRef.current) {
                      videoRef.current.muted = next;
                    }
                    return next;
                  });
                }}
                className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}

            {/* 3-dot menu (owner only) */}
            {isOwner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu((v) => !v);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <MoreHorizontal size={20} />
                </button>

                {/* Dropdown menu */}
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-10 z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/15 bg-neutral-900/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory();
                        }}
                        disabled={isDeleting}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-semibold text-rose-400 hover:bg-white/8 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        <span>Delete Story</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Media Player Area */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black">
          {isVideo ? (
            <>
              <video
                ref={videoRef}
                key={currentStory._id}
                src={currentStory.media}
                className="h-full w-full object-contain bg-black"
                autoPlay
                playsInline
                preload="auto"
                muted={isMuted}
                onTimeUpdate={handleVideoTimeUpdate}
                onPlaying={handleVideoPlaying}
                onWaiting={handleVideoWaiting}
                onEnded={handleVideoEnded}
              />
              {isVideoLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                  <Loader2 size={36} className="animate-spin text-white/90" />
                </div>
              )}
            </>
          ) : (
            <img
              src={currentStory.media}
              alt="Story"
              className="h-full w-full object-contain bg-black"
            />
          )}

          {/* Touch Nav overlays */}
          <div
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            aria-label="Previous story"
          />
          <div
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-16 w-1/3 z-20 cursor-pointer"
            aria-label="Next story"
          />

          {/* Left / Right Arrow buttons */}
          {(groupIndex > 0 || storyIndex > 0) && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all cursor-pointer hidden sm:grid"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {(groupIndex < groups.length - 1 || storyIndex < currentStoryList.length - 1) && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all cursor-pointer hidden sm:grid"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Bottom Bar Controls */}
        <div className="absolute bottom-4 inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
          {isOwner ? (
            /* Owner: View count button opens Viewers Sheet */
            <button
              type="button"
              onClick={handleOpenViewersSheet}
              className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white hover:bg-black/70 transition-colors cursor-pointer border border-white/20"
            >
              <Eye size={16} />
              <span>{currentStory.viewsCount ?? 0} {currentStory.viewsCount === 1 ? "view" : "views"}</span>
            </button>
          ) : (
            /* Viewer: Like button */
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full transition-transform active:scale-90 cursor-pointer shadow-md",
                  currentStory.isLiked
                    ? "bg-rose-500 text-white"
                    : "bg-black/50 text-white hover:bg-black/70 backdrop-blur-md border border-white/20"
                )}
              >
                <Heart size={20} fill={currentStory.isLiked ? "currentColor" : "none"} />
              </button>
            </div>
          )}
        </div>

        {/* Real-Time Story Viewers Modal Sheet (Owner Only) */}
        {showViewersSheet && isOwner && (
          <>
            {/* Dim backdrop to focus on sheet and dismiss on click outside */}
            <div
              className={cn(
                "absolute inset-0 z-35 bg-black/60 backdrop-blur-[2px]",
                isSheetClosing ? "animate-sheet-backdrop-out" : "animate-sheet-backdrop-in"
              )}
              onClick={handleCloseViewersSheet}
            />

            {/* Bottom Sheet Card */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 z-40 flex flex-col max-h-[70%] rounded-t-3xl border-t border-border bg-paper p-5 shadow-2xl",
                isSheetClosing ? "animate-sheet-slide-out" : "animate-sheet-slide-in"
              )}
            >
              {/* Drag/Swipe Indicator Handle */}
              <div className="w-10 h-1 bg-border-strong rounded-full mx-auto mb-3 shrink-0" />

              <div className="flex items-center justify-between pb-3 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-indigo" />
                  <h4 className="text-sm font-bold text-ink">
                    Story Views ({currentViewersInfo?.totalViewers ?? currentStory.viewsCount ?? 0})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleCloseViewersSheet}
                  className="grid h-7 w-7 place-items-center rounded-full text-text-subtle hover:bg-surface-elevated hover:text-ink transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Viewers List */}
              <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {currentViewersInfo?.viewers?.length > 0 ? (
                  currentViewersInfo.viewers.map((viewer) => (
                    <div
                      key={viewer._id}
                      onClick={() => {
                        setShowViewersSheet(false);
                        setIsSheetClosing(false);
                        handleClose();
                        navigate(`/${viewer.username}`);
                      }}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full overflow-hidden border border-border bg-surface shrink-0">
                          {viewer.avatar ? (
                            <img src={viewer.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-indigo text-white grid place-items-center text-xs font-bold">
                              {(viewer.name || viewer.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate">
                            @{viewer.username}
                          </p>
                          <p className="text-[11px] text-text-subtle truncate">
                            {viewer.name || ""}
                          </p>
                        </div>
                      </div>

                      {viewer.hasLiked && (
                        <span className="text-rose-500">
                          <Heart size={16} fill="currentColor" />
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-text-subtle">
                    No views from other users yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
