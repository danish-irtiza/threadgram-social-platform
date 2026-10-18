import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Eye } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { updateReel, toggleReelLike, toggleReelSave, toggleReelFollow, recordReelView } from "@/redux/features/reels/reelsSlice.js";
import { acceptFollowRequest } from "@/redux/features/profile/profileSlice.js";
import { patchCurrentUser } from "@/redux/features/auth/authSlice.js";

const truncateCaption = (text, maxWords = 6) => {
  if (!text) return { short: "", full: "", needsTruncation: false };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { short: text, full: text, needsTruncation: false };
  return { short: words.slice(0, maxWords).join(" ") + "...", full: text, needsTruncation: true };
};

function formatCount(n) {
  if (n == null) return "0";
  const num = Number(n);
  if (!isFinite(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + "K";
  return String(num);
}

export default function VibesItem({
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

  const [sending, setSending] = useState({ like: false, save: false, follow: false });
  const [captionOpen, setCaptionOpenLocal] = useState(false);
  const captionExpanded = isCaptionExpanded ?? captionOpen;

  const author = reel?.author || {};
  const authorId = author?._id;
  const isSelf = currentUserId && String(currentUserId) === String(authorId);

  const isAcceptState = !!author.isReceivedPendingRequest;
  const isFollowingState = !!author.isFollowing;
  const isRequestedState = !!author.isFollowRequested;
  const isFollowbackState = !isAcceptState && !isFollowingState && !isRequestedState && !!author.isFollower;
  const initiating = isAcceptState || isFollowbackState || (!isFollowingState && !isRequestedState);

  const followLabel = sending.follow
    ? "..."
    : isAcceptState ? "Accept"
      : isFollowingState ? "Following"
        : isRequestedState ? "Requested"
          : isFollowbackState ? "Follow Back"
            : "Follow";

  const { short, full, needsTruncation } = truncateCaption(reel?.caption || "", 6);

  const toggleCaption = () => {
    const next = !captionExpanded;
    setCaptionOpenLocal(next);
    onCaptionExpandStateChange?.(next ? reel._id : null);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.muted = !!globalMuted;
      const tryPlay = () => {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => { });
      };
      if (el.readyState >= 2) tryPlay();
      else el.addEventListener("loadeddata", tryPlay, { once: true });
    } else {
      el.pause();
    }
  }, [isActive, globalMuted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !!globalMuted;
  }, [globalMuted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.loop = true;
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }, []);

  useEffect(() => {
    if (!isActive || viewedRef.current) return;
    viewedRef.current = true;
    if (reel?._id) {
      if (reel.viewsCount == null) {
        dispatch(updateReel({ reelId: reel._id, viewsCount: reel.viewsCount || 0 }));
      }
      dispatch(recordReelView(reel._id));
    }
  }, [isActive, reel?._id, dispatch, reel?.viewsCount]);

  const handleLike = async () => {
    if (!currentUserId || !reel?._id || sending.like) return;
    setSending((s) => ({ ...s, like: true }));
    try { await dispatch(toggleReelLike(reel._id)).unwrap(); }
    finally { setSending((s) => ({ ...s, like: false })); }
  };

  const handleSave = async () => {
    if (!currentUserId || !reel?._id || sending.save) return;
    setSending((s) => ({ ...s, save: true }));
    try { await dispatch(toggleReelSave(reel._id)).unwrap(); }
    finally { setSending((s) => ({ ...s, save: false })); }
  };

  const handleFollow = async () => {
    if (isSelf || !authorId || !currentUserId || sending.follow) return;
    setSending((s) => ({ ...s, follow: true }));
    try {
      if (isAcceptState) {
        const result = await dispatch(acceptFollowRequest({ requesterId: authorId })).unwrap();
        const ownerFollowerCount = result?.data?.data?.ownerFollowerCount;
        if (typeof ownerFollowerCount === "number") {
          dispatch(patchCurrentUser({ followerCount: ownerFollowerCount }));
        }
      } else {
        const result = await dispatch(
          toggleReelFollow({ reelId: reel._id, authorId, isFollowing: isFollowingState, isFollowRequested: isRequestedState })
        ).unwrap();
        if (typeof result?.viewerFollowingCount === "number") {
          dispatch(patchCurrentUser({ followingCount: result.viewerFollowingCount }));
        }
      }
    } catch (err) {
      console.error(`[VibesItem] handleFollow failed:`, err);
    } finally {
      setSending((s) => ({ ...s, follow: false }));
    }
  };

  const handleOpenComments = () => onOpenComments?.(reel._id);

  const goProfile = (e) => {
    e.stopPropagation();
    if (author?.username) navigate(`/${author.username}`);
  };

  return (
    <div
      ref={(el) => {
        viewRef.current = el;
        if (currentViewRef) currentViewRef.current = el;
      }}
      data-index={index}
      className="reel-page snap-start shrink-0 h-screen w-full bg-black overflow-hidden flex items-center justify-center select-none"
    >
      {/* ── Main Reel Flex Row Container ── */}
      <div className="h-full flex items-center justify-center relative max-w-full">

        {/* ── 1. Video Player Container ── */}
        <div
          className="relative h-full flex items-center justify-center overflow-hidden bg-black shadow-2xl"
          style={{ width: "min(calc(100vw - 72px), 420px)" }}
        >
          <video
            ref={videoRef}
            src={reel?.media}
            poster={reel?.thumbnail || ""}
            className="h-full w-full object-contain bg-black cursor-pointer"
            preload="metadata"
            playsInline
            muted={!!globalMuted}
            loop
            onClick={() => onToggleGlobalMute?.()}
          />

          {/* Gradients for high text visibility */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* User Profile & Caption Overlay (Bottom-Left inside video) */}
          <div className="absolute left-4 bottom-4 right-14 z-20 flex flex-col gap-2.5 pointer-events-auto text-left">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={goProfile}
                className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity cursor-pointer group text-left min-w-0"
              >
                <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-surface shrink-0 shadow-md">
                  {author?.avatar ? (
                    <img src={author.avatar} alt={author.username || ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-indigo text-white grid place-items-center text-xs font-bold">
                      {(author.name || author.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-[13px] font-bold text-white drop-shadow-md truncate leading-tight flex items-center gap-1">
                    @{author?.username || "user"}
                  </span>
                  {author?.name && (
                    <span className="text-[11px] text-white/75 drop-shadow-sm truncate leading-tight">
                      {author.name}
                    </span>
                  )}
                </div>
              </button>

              {!isSelf && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                  disabled={sending.follow}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 border drop-shadow-md",
                    initiating
                      ? "bg-indigo text-white border-indigo hover:bg-indigo-hover active:scale-95"
                      : "bg-white/15 text-white border-white/30 backdrop-blur-sm hover:bg-white/25 active:scale-95"
                  )}
                >
                  {followLabel}
                </button>
              )}
            </div>

            {(short || full) && (
              <div className="text-[13px] text-white/95 drop-shadow-md leading-snug">
                <span className={cn(!captionExpanded && needsTruncation && "line-clamp-2")}>
                  {captionExpanded ? full : short}
                </span>
                {needsTruncation && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleCaption(); }}
                    className="ml-1.5 text-[12px] font-semibold text-white/75 hover:text-white underline cursor-pointer"
                  >
                    {captionExpanded ? "less" : "more"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mute/Unmute Button (Bottom-Right inside video) */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleGlobalMute?.(); }}
            aria-label={globalMuted ? "Unmute" : "Mute"}
            className="absolute bottom-4 right-3 z-30 p-2 text-white/90 hover:text-white drop-shadow-md transition-all duration-150 cursor-pointer active:scale-90"
          >
            {globalMuted ? (
              <VolumeX size={20} strokeWidth={2.2} />
            ) : (
              <Volume2 size={20} strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* ── 2. Right Action Column (Snug adjacent to video) ── */}
        <div className="h-full flex flex-col justify-end gap-5 pb-16 pl-3.5 pr-1 w-14 shrink-0 z-20">
          {/* Like */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className="group flex flex-col items-center text-white cursor-pointer active:scale-90 transition-transform"
            aria-label={reel?.isLiked ? "Unlike" : "Like"}
          >
            <div className={cn(
              "p-2 rounded-full transition-colors drop-shadow-lg",
              reel?.isLiked ? "text-rose-500" : "text-white group-hover:text-rose-400"
            )}>
              <Heart size={26} fill={reel?.isLiked ? "currentColor" : "none"} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-white drop-shadow-md -mt-1">
              {formatCount(reel?.likesCount ?? 0)}
            </span>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleOpenComments(); }}
            className="group flex flex-col items-center text-white cursor-pointer active:scale-90 transition-transform"
            aria-label="Comments"
          >
            <div className="p-2 rounded-full text-white group-hover:text-sky-400 transition-colors drop-shadow-lg">
              <MessageCircle size={26} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-white drop-shadow-md -mt-1">
              {formatCount(reel?.commentsCount ?? 0)}
            </span>
          </button>

          {/* Save */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            className="group flex flex-col items-center text-white cursor-pointer active:scale-90 transition-transform"
            aria-label={reel?.isSaved ? "Unsave" : "Save"}
          >
            <div className={cn(
              "p-2 rounded-full transition-colors drop-shadow-lg",
              reel?.isSaved ? "text-amber-400" : "text-white group-hover:text-amber-300"
            )}>
              <Bookmark size={26} fill={reel?.isSaved ? "currentColor" : "none"} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-white drop-shadow-md -mt-1">
              {formatCount(reel?.savesCount ?? 0)}
            </span>
          </button>

          {/* Views */}
          <div className="flex flex-col items-center text-white/90">
            <div className="p-2 text-white/80 drop-shadow-lg">
              <Eye size={24} strokeWidth={2} />
            </div>
            <span className="text-[11px] font-medium text-white drop-shadow-md -mt-1">
              {formatCount(reel?.viewsCount ?? 0)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
