import { useEffect, useRef, useState } from "react";
import {
  Heart, MessageCircle, Bookmark, Volume2, VolumeX,
  Eye, UserPlus, UserMinus, Loader2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { updateReel, toggleReelLike, toggleReelSave, toggleReelFollow, recordReelView } from "@/redux/features/reels/reelsSlice.js";
import { acceptFollowRequest } from "@/redux/features/profile/profileSlice.js";
import { patchCurrentUser } from "@/redux/features/auth/authSlice.js";

const truncateCaption = (text, maxWords = 4) => {
  if (!text) return { short: "", full: "", needsTruncation: false };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { short: text, full: text, needsTruncation: false };
  return { short: words.slice(0, maxWords).join(" ") + " ...", full: text, needsTruncation: true };
};

export default function ReelItem({
  reel,
  isActive,
  globalMuted,
  onToggleGlobalMute,
  onOpenComments,
  onCaptionExpandStateChange,
  isCaptionExpanded,
  currentViewRef,
  index,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;

  const videoRef = useRef(null);
  const viewRef = useRef(null);
  const viewedRef = useRef(false);
  const prevActiveRef = useRef(false);

  const [sending, setSending] = useState({ like: false, save: false, follow: false });
  const [captionOpen, setCaptionOpenLocal] = useState(false);
  const captionExpanded = isCaptionExpanded ?? captionOpen;

  const author = reel?.author || {};
  const authorId = author?._id;
  const isSelf = currentUserId && String(currentUserId) === String(authorId);

  const toggleCaption = () => {
    const next = !captionExpanded;
    setCaptionOpenLocal(next);
    if (onCaptionExpandStateChange) onCaptionExpandStateChange(next ? reel._id : null);
  };

  // Intersection-observer style play/pause via the `isActive` prop (controlled by parent)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.muted = !!globalMuted;
      const tryPlay = () => {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      if (el.readyState >= 2) tryPlay();
      else el.addEventListener("loadeddata", tryPlay, { once: true });
    } else {
      el.pause();
    }
    prevActiveRef.current = isActive;
  }, [isActive, globalMuted]);

  // Keep muted state in sync without affecting play/pause
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !!globalMuted;
  }, [globalMuted]);

  // Loop safely
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.loop = true;
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }, []);

  // When this reel becomes "active" AND we have a user: record view once per mount
  useEffect(() => {
    if (!isActive) return;
    if (viewedRef.current) return;
    viewedRef.current = true;
    if (reel?._id) {
      if (reel.viewsCount == null) {
        dispatch(updateReel({ reelId: reel._id, viewsCount: (reel.viewsCount || 0) }));
      }
      dispatch(recordReelView(reel._id));
    }
  }, [isActive, reel?._id, dispatch, reel.viewsCount]);

  const handleLike = async () => {
    if (!currentUserId || !reel?._id) return;
    if (sending.like) return;
    setSending((s) => ({ ...s, like: true }));
    try {
      await dispatch(toggleReelLike(reel._id)).unwrap();
    } finally {
      setSending((s) => ({ ...s, like: false }));
    }
  };

  const handleSave = async () => {
    if (!currentUserId || !reel?._id) return;
    if (sending.save) return;
    setSending((s) => ({ ...s, save: true }));
    try {
      await dispatch(toggleReelSave(reel._id)).unwrap();
    } finally {
      setSending((s) => ({ ...s, save: false }));
    }
  };

  const handleFollow = async () => {
    if (isSelf || !authorId || !currentUserId) return;
    if (sending.follow) return;

    // Derive state with same priority order: accept > following > requested > followback > idle
    const isReceivedPendingRequest = !!author.isReceivedPendingRequest;
    const isFollowing = !!author.isFollowing;
    const isFollowRequested = !!author.isFollowRequested;
    const isFollower = !!author.isFollower;
    let reelFollowState = "idle";
    if (isReceivedPendingRequest) reelFollowState = "accept";
    else if (isFollowing) reelFollowState = "following";
    else if (isFollowRequested) reelFollowState = "requested";
    else if (isFollower) reelFollowState = "followback";

    console.log(
      `[ReelItem] handleFollow author=@${author?.username}` +
      ` state=${reelFollowState}` +
      ` isFollower=${isFollower} isFollowing=${isFollowing}` +
      ` isRequested=${isFollowRequested} isReceivedPendingRequest=${isReceivedPendingRequest}`
    );

    setSending((s) => ({ ...s, follow: true }));
    try {
      if (reelFollowState === "accept") {
        const result = await dispatch(
          acceptFollowRequest({ requesterId: authorId })
        ).unwrap();
        const ownerFollowerCount = result?.data?.data?.ownerFollowerCount;
        if (typeof ownerFollowerCount === "number") {
          dispatch(patchCurrentUser({ followerCount: ownerFollowerCount }));
        }
      } else {
        const result = await dispatch(
          toggleReelFollow({
            reelId: reel._id,
            authorId,
            isFollowing,
            isFollowRequested,
          })
        ).unwrap();
        // toggleReelFollow returns custom object { viewerFollowingCount, ... }
        const viewerFollowingCount = result?.viewerFollowingCount;
        if (typeof viewerFollowingCount === "number") {
          dispatch(patchCurrentUser({ followingCount: viewerFollowingCount }));
        }
      }
    } catch (err) {
      console.error(`[ReelItem] handleFollow failed for author=${authorId}:`, err);
    } finally {
      setSending((s) => ({ ...s, follow: false }));
    }
  };

  const handleOpenComments = () => {
    if (onOpenComments) onOpenComments(reel._id);
  };

  const goProfile = (e) => {
    e.stopPropagation();
    if (author?.username) navigate(`/${author.username}`);
  };

  const { short, full, needsTruncation } = truncateCaption(reel?.caption || "", 4);

  return (
    <div
      ref={(el) => {
        viewRef.current = el;
        if (currentViewRef) currentViewRef.current = el;
      }}
      data-index={index}
      className="reel-page snap-start shrink-0 relative h-full w-full flex items-center justify-center bg-black overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel?.media}
        poster={reel?.thumbnail || ""}
        className="absolute inset-0 h-full w-full object-contain bg-black"
        preload="metadata"
        playsInline
        muted={!!globalMuted}
        loop
      />

      {/* Top / bottom gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Global mute/unmute button (top-right) */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleGlobalMute?.(); }}
        aria-label={globalMuted ? "Unmute" : "Mute"}
        className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors border border-white/10 cursor-pointer"
      >
        {globalMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Right rail: Like / Comment / Save / Follow */}
      <div className="absolute right-3 bottom-40 z-30 flex flex-col items-center gap-5 sm:right-5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className="group grid place-items-center text-white cursor-pointer"
          aria-label={reel?.isLiked ? "Unlike" : "Like"}
        >
          <span className={cn(
            "grid h-12 w-12 place-items-center rounded-full transition-colors",
            reel?.isLiked ? "text-rose-500" : "text-white group-hover:text-rose-400"
          )}>
            {sending.like ? <Loader2 size={26} className="animate-spin" /> : <Heart size={26} fill={reel?.isLiked ? "currentColor" : "none"} strokeWidth={2} />}
          </span>
          <span className="mt-0.5 text-[12px] font-medium text-white/90 drop-shadow">
            {formatCount(reel?.likesCount ?? 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleOpenComments(); }}
          className="group grid place-items-center text-white cursor-pointer"
          aria-label="Comments"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full text-white group-hover:text-sky-400 transition-colors">
            <MessageCircle size={26} strokeWidth={2} />
          </span>
          <span className="mt-0.5 text-[12px] font-medium text-white/90 drop-shadow">
            {formatCount(reel?.commentsCount ?? 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleSave(); }}
          className="group grid place-items-center text-white cursor-pointer"
          aria-label={reel?.isSaved ? "Unsave" : "Save"}
        >
          <span className={cn(
            "grid h-12 w-12 place-items-center rounded-full transition-colors",
            reel?.isSaved ? "text-amber-400" : "text-white group-hover:text-amber-300"
          )}>
            {sending.save ? <Loader2 size={26} className="animate-spin" /> : <Bookmark size={26} fill={reel?.isSaved ? "currentColor" : "none"} strokeWidth={2} />}
          </span>
          <span className="sr-only">Save</span>
        </button>

        <div className="grid place-items-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goProfile(e); }}
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-surface overflow-hidden cursor-pointer"
            aria-label="Open creator profile"
          >
            {author?.avatar ? (
              <img src={author.avatar} alt={author.name || author.username || ""} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center bg-indigo text-white text-sm font-semibold">
                {(author.name || author.username || "U").charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          {!isSelf && (() => {
            // Priority order for display styling
            const isAcceptState = !!author.isReceivedPendingRequest;
            const isFollowingState = !!author.isFollowing;
            const isRequestedState = !!author.isFollowRequested;
            const isFollowbackState =
              !isAcceptState && !isFollowingState && !isRequestedState && !!author.isFollower;
            // action type is initiating new follow if followback/idle
            const initiating = isAcceptState || isFollowbackState || (!isFollowingState && !isRequestedState);
            const ariaLabel = isAcceptState
              ? "Accept follow request"
              : isFollowingState
              ? "Unfollow"
              : isRequestedState
              ? "Cancel follow request"
              : isFollowbackState
              ? "Follow back"
              : "Follow";
            return (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                aria-label={ariaLabel}
                disabled={sending.follow}
                className={cn(
                  "mt-1 grid h-6 w-6 place-items-center rounded-full border transition-colors cursor-pointer disabled:opacity-60",
                  initiating
                    ? "bg-indigo text-white border-indigo hover:bg-indigo-hover"
                    : "bg-white text-ink border-white hover:bg-white/90"
                )}
              >
                {sending.follow
                  ? <Loader2 size={14} className="animate-spin" />
                  : isFollowingState || isRequestedState
                  ? <UserMinus size={14} />
                  : <UserPlus size={14} />}
              </button>
            );
          })()}
        </div>

        <div className="grid place-items-center text-white/80">
          <Eye size={22} strokeWidth={2} />
          <span className="mt-0.5 text-[12px] font-medium text-white/90 drop-shadow">
            {formatCount(reel?.viewsCount ?? 0)}
          </span>
        </div>
      </div>

      {/* Bottom-left: creator username + caption + follow button */}
      <div
        className={cn(
          "absolute left-4 right-28 z-30 flex flex-col gap-2 transition-all duration-300",
          captionExpanded
            ? "bottom-[calc(40vh+80px)]"
            : "bottom-6"
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goProfile}
            className="flex items-center gap-2 text-white hover:opacity-90 cursor-pointer"
          >
            <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-white/20 bg-surface">
              {author?.avatar ? (
                <img src={author.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-white bg-indigo h-full w-full grid place-items-center">
                  {(author.name || author.username || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="text-left leading-tight">
              <div className="text-[13px] font-semibold text-white drop-shadow">
                @{author?.username || "user"}
              </div>
              <div className="text-[11px] text-white/70 drop-shadow">
                {author?.name || ""}
              </div>
            </div>
          </button>
          {!isSelf && (() => {
            const isAcceptState = !!author.isReceivedPendingRequest;
            const isFollowingState = !!author.isFollowing;
            const isRequestedState = !!author.isFollowRequested;
            const isFollowbackState =
              !isAcceptState && !isFollowingState && !isRequestedState && !!author.isFollower;
            const isInitiating = isAcceptState || isFollowbackState || (!isFollowingState && !isRequestedState);
            const label = sending.follow
              ? "..."
              : isAcceptState
              ? "Accept"
              : isFollowingState
              ? "Following"
              : isRequestedState
              ? "Requested"
              : isFollowbackState
              ? "Follow Back"
              : "Follow";
            return (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                disabled={sending.follow}
                className={cn(
                  "ml-2 shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60 border",
                  isInitiating
                    ? "bg-indigo text-white border-indigo hover:bg-indigo-hover"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                )}
              >
                {label}
              </button>
            );
          })()}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); needsTruncation ? toggleCaption() : undefined; }}
          className={cn(
            "text-left max-w-full text-[13px] leading-5 text-white/95 drop-shadow cursor-default",
            needsTruncation ? "cursor-pointer hover:text-white" : ""
          )}
        >
          {captionExpanded ? full : short}
        </button>
      </div>
    </div>
  );
}

function formatCount(n) {
  if (n == null) return "0";
  const num = Number(n);
  if (!isFinite(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "K";
  return String(num);
}
