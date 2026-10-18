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

  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef(null);
  const progressTimerRef = useRef(null);
  const elapsedRef = useRef(0);

  const currentGroup = groups[groupIndex] || null;
  const currentStoryList = currentGroup?.stories || [];
  const currentStory = currentStoryList[storyIndex] || null;
  const author = currentGroup?.user || currentStory?.author || {};

  const isOwner = currentUserId && String(currentUserId) === String(author._id);
  const isVideo = currentStory?.mediaType === "video" || currentStory?.media?.match(/\.(mp4|webm|mov)$/i);

  // Whether the timer should be paused (menu or viewers sheet open)
  const isPaused = showMenu || showViewersSheet;

  // Close viewer
  const handleClose = useCallback(() => {
    dispatch(closeStoryViewer());
    setShowViewersSheet(false);
    setShowMenu(false);
    setProgress(0);
    elapsedRef.current = 0;
  }, [dispatch]);

  // Navigate next story / next group
  const handleNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIndex < currentStoryList.length - 1) {
      dispatch(setActiveViewerIndexes({ groupIndex, storyIndex: storyIndex + 1 }));
    } else if (groupIndex < groups.length - 1) {
      dispatch(setActiveViewerIndexes({ groupIndex: groupIndex + 1, storyIndex: 0 }));
    } else {
      handleClose();
    }
  }, [storyIndex, currentStoryList.length, groupIndex, groups.length, dispatch, handleClose]);

  // Navigate prev story / prev group
  const handlePrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
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
  }, [storyIndex, groupIndex, groups, dispatch]);

  // Mark story as viewed
  useEffect(() => {
    if (!isOpen || !currentStory?._id) return;
    if (isOwner) {
      // Owner viewing own story — mark viewed locally in Redux only
      if (!currentStory.isViewed) {
        dispatch(markStoryViewedLocally(currentStory._id));
      }
    } else if (!currentStory.isViewed) {
      dispatch(markStoryViewed(currentStory._id));
    }
  }, [isOpen, currentStory?._id, isOwner, dispatch]);

  // Progress timer for Image stories (with pause/resume support)
  useEffect(() => {
    if (!isOpen || !currentStory || isVideo) return;

    const DURATION = 5000;
    const INTERVAL = 50;

    // Reset on new story
    elapsedRef.current = 0;
    setProgress(0);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    progressTimerRef.current = setInterval(() => {
      elapsedRef.current += INTERVAL;
      const pct = Math.min(100, (elapsedRef.current / DURATION) * 100);
      setProgress(pct);
      if (elapsedRef.current >= DURATION) {
        clearInterval(progressTimerRef.current);
        handleNext();
      }
    }, INTERVAL);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, currentStory?._id, isVideo, handleNext]);

  // Pause / Resume timer when menu or viewers sheet is open
  useEffect(() => {
    if (!isOpen || !currentStory) return;

    if (isPaused) {
      // Pause: clear the interval and pause video
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (isVideo && videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      // Resume
      if (isVideo && videoRef.current) {
        videoRef.current.play().catch(() => {});
      } else if (!isVideo) {
        // Resume image timer from where it left off
        const DURATION = 5000;
        const INTERVAL = 50;

        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        progressTimerRef.current = setInterval(() => {
          elapsedRef.current += INTERVAL;
          const pct = Math.min(100, (elapsedRef.current / DURATION) * 100);
          setProgress(pct);
          if (elapsedRef.current >= DURATION) {
            clearInterval(progressTimerRef.current);
            handleNext();
          }
        }, INTERVAL);
      }
    }

    return () => {
      // Cleanup only when effect re-runs, not when pausing
    };
  }, [isPaused]);

  // Video time update handler
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    if (duration > 0) {
      const pct = (currentTime / duration) * 100;
      setProgress(pct);
    }
  };

  // Video ended handler
  const handleVideoEnded = () => {
    handleNext();
  };

  // Fetch viewers list when owner opens viewers sheet
  const handleOpenViewersSheet = () => {
    if (!currentStory?._id || !isOwner) return;
    dispatch(fetchStoryViewers(currentStory._id));
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
            let widthPct = 0;
            if (idx < storyIndex) widthPct = 100;
            else if (idx === storyIndex) widthPct = progress;

            return (
              <div key={st._id || idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-sm">
                <div
                  className="h-full bg-indigo transition-all duration-75"
                  style={{ width: `${widthPct}%` }}
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
                  setIsMuted((m) => !m);
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
            <video
              ref={videoRef}
              key={currentStory._id}
              src={currentStory.media}
              className="h-full w-full object-contain bg-black"
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
            />
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
          <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col max-h-[70%] rounded-t-3xl border-t border-border bg-paper p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-indigo" />
                <h4 className="text-sm font-bold text-ink">
                  Story Views ({currentViewersInfo?.totalViewers ?? currentStory.viewsCount ?? 0})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowViewersSheet(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-text-subtle hover:bg-surface-elevated hover:text-ink transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Viewers List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
              {currentViewersInfo?.viewers?.length > 0 ? (
                currentViewersInfo.viewers.map((viewer) => (
                  <div
                    key={viewer._id}
                    onClick={() => {
                      setShowViewersSheet(false);
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
        )}

      </div>
    </div>
  );
}
