import { useState, useRef, useCallback } from "react";
import {
  Heart, MessageCircle, Bookmark, Trash2, Pencil, Film,
  Volume2, VolumeX, MoreHorizontal, X, Check, AlertCircle,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import api from "@/api/axios";
import { removeVibeFromProfile, updateVibeInProfile } from "@/redux/features/profile/profileSlice.js";
import { getVideoPosterUrl } from "@/utils/videoUtils.js";
import {
  FullscreenMediaViewer,
  CommentsModal,
  MediaDropdown,
  CONTENT_TYPE,
} from "./MediaViewer.jsx";

function formatCount(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
}

function timeAgo(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function VibeCard({ vibe: initialVibe, vibesList, vibeIndex = 0, onMediaClick }) {
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const dispatch = useDispatch();

  const [vibe, setVibe] = useState(initialVibe);
  const [isMuted, setIsMuted] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [commentsCount, setCommentsCount] = useState(() =>
    initialVibe?.commentsCount ?? (Array.isArray(initialVibe?.comment) ? initialVibe.comment.length : 0)
  );

  const [fullscreenModal, setFullscreenModal] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);

  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState(initialVibe?.caption || "");
  const [isSavingCaption, setIsSavingCaption] = useState(false);

  const videoRef = useRef(null);

  const isOwner =
    currentUserId &&
    vibe?.author?._id &&
    String(vibe.author._id) === String(currentUserId);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const [isLiking, setIsLiking] = useState(false);
  const handleLike = async () => {
    if (!currentUserId) return showToast("Sign in to like vibes.");
    if (isLiking) return;
    setIsLiking(true);
    const prev = { isLiked: vibe.isLiked, likesCount: vibe.likesCount };
    const optimistic = vibe.isLiked
      ? { isLiked: false, likesCount: Math.max(0, (vibe.likesCount || 0) - 1) }
      : { isLiked: true, likesCount: (vibe.likesCount || 0) + 1 };
    setVibe((v) => ({ ...v, ...optimistic }));
    try {
      const { data } = await api.post(`/vibes/${vibe._id}/like`);
      const update = {
        _id: vibe._id,
        isLiked: data.isLiked,
        likesCount: data.likesCount,
      };
      setVibe((v) => ({ ...v, ...update }));
      dispatch(updateVibeInProfile(update));
    } catch {
      setVibe((v) => ({ ...v, ...prev }));
      showToast("Failed to like vibe.");
    } finally {
      setIsLiking(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (!currentUserId) return showToast("Sign in to save vibes.");
    if (isSaving) return;
    setIsSaving(true);
    const prev = { isSaved: vibe.isSaved };
    const optimistic = { isSaved: !vibe.isSaved };
    setVibe((v) => ({ ...v, ...optimistic }));
    try {
      const { data } = await api.post(`/vibes/${vibe._id}/save`);
      const update = {
        _id: vibe._id,
        isSaved: data.isSaved,
      };
      setVibe((v) => ({ ...v, ...update }));
      dispatch(updateVibeInProfile(update));
      showToast(data.isSaved ? "Vibe saved." : "Vibe unsaved.", "success");
    } catch {
      setVibe((v) => ({ ...v, ...prev }));
      showToast("Failed to save vibe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCaption = async () => {
    if (!isOwner || isSavingCaption) return;
    setIsSavingCaption(true);
    try {
      const { data } = await api.put(`/vibes/${vibe._id}`, {
        caption: editCaptionText.trim(),
      });
      const newCaption = data.data?.vibe?.caption ?? editCaptionText.trim();
      setVibe((v) => ({ ...v, caption: newCaption }));
      dispatch(updateVibeInProfile({ _id: vibe._id, caption: newCaption }));
      setIsEditingCaption(false);
      showToast("Caption updated.", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to update caption.");
    } finally {
      setIsSavingCaption(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/vibes/${vibe._id}`);
      dispatch(removeVibeFromProfile(vibe._id));
      showToast("Vibe deleted.", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to delete vibe.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenFullscreen = () => {
    setFullscreenModal(true);
  };

  const handleOpenComments = (e) => {
    e?.stopPropagation?.();
    setCommentsModalOpen(true);
  };

  const menuItems = [];
  if (isOwner) {
    menuItems.push({
      label: "Edit Caption",
      icon: <Pencil size={13} />,
      onClick: () => {
        setEditCaptionText(vibe.caption || "");
        setIsEditingCaption(true);
      },
    });
    menuItems.push({
      label: isDeleting ? "Deleting…" : "Delete",
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: handleDelete,
    });
  }

  if (!vibe) return null;

  const effectiveList = vibesList && vibesList.length > 0 ? vibesList : [initialVibe];

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
        <header className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0 h-8 w-8 overflow-hidden rounded-full bg-surface-elevated ring-1 ring-border/60">
              {vibe.author?.avatar ? (
                <img
                  src={vibe.author.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-indigo-soft">
                  <span className="text-indigo font-semibold text-xs">?</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-ink leading-4">
                {vibe.author?.name || vibe.author?.username || "Unknown"}
              </p>
              <p className="text-[10px] text-muted leading-3">
                @{vibe.author?.username} · {timeAgo(vibe.createdAt)}
              </p>
            </div>
          </div>

          {menuItems.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors"
                aria-label="Vibe options"
              >
                <MoreHorizontal size={15} />
              </button>
              {menuOpen && (
                <MediaDropdown items={menuItems} onClose={() => setMenuOpen(false)} />
              )}
            </div>
          )}
        </header>

        <div
          className="relative w-full bg-black overflow-hidden cursor-pointer"
          style={{ aspectRatio: "9/16", maxHeight: 320 }}
          onClick={() => {
            if (onMediaClick) {
              onMediaClick();
            } else {
              handleOpenFullscreen();
            }
          }}
        >
          {vibe.media ? (
            <video
              ref={videoRef}
              src={vibe.media.includes("#t=") ? vibe.media : `${vibe.media}#t=0.1`}
              poster={getVideoPosterUrl(vibe.media) || undefined}
              className="h-full w-full object-cover cursor-pointer"
              preload="metadata"
              loop
              muted={isMuted}
              playsInline
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted bg-gradient-to-br from-indigo-soft to-surface-elevated">
              <Film size={32} strokeWidth={1.5} />
            </div>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsMuted((m) => !m); }}
            className="absolute bottom-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors cursor-pointer"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-black/50 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white translate-x-0.5">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {isEditingCaption ? (
          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5">
            <input
              value={editCaptionText}
              onChange={(e) => setEditCaptionText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveCaption(); if (e.key === "Escape") setIsEditingCaption(false); }}
              className="flex-1 rounded-lg border border-indigo/50 bg-surface px-2.5 py-1 text-[12px] text-ink focus:outline-none focus:border-indigo"
              placeholder="Write caption…"
              maxLength={500}
            />
            <button onClick={handleSaveCaption} disabled={isSavingCaption} className="text-indigo hover:text-indigo-hover cursor-pointer">
              <Check size={14} />
            </button>
            <button onClick={() => setIsEditingCaption(false)} className="text-muted hover:text-ink cursor-pointer">
              <X size={14} />
            </button>
          </div>
        ) : (
          vibe.caption ? (
            <p className="px-3 pt-2 pb-1 text-[12px] leading-4 text-ink/90 line-clamp-2 break-words">
              {vibe.caption}
            </p>
          ) : null
        )}

        <div className="flex items-center gap-4 px-3 pt-1.5 pb-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center gap-1.5 cursor-pointer group/like"
            aria-label={vibe.isLiked ? "Unlike" : "Like"}
          >
            <Heart
              size={17}
              strokeWidth={2}
              className={cn(
                "transition-all duration-150",
                vibe.isLiked
                  ? "fill-pink text-pink scale-110"
                  : "text-muted group-hover/like:text-pink"
              )}
            />
            <span className={cn("text-[11px] font-medium tabular-nums", vibe.isLiked ? "text-pink" : "text-muted")}>
              {formatCount(vibe.likesCount || 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenComments}
            className="flex items-center gap-1.5 cursor-pointer group/comment"
            aria-label="Comment"
          >
            <MessageCircle
              size={17}
              strokeWidth={2}
              className="text-muted group-hover/comment:text-indigo transition-all duration-150"
            />
            <span className="text-[11px] font-medium tabular-nums text-muted group-hover/comment:text-indigo transition-all duration-150">
              {formatCount(commentsCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto flex items-center gap-1.5 cursor-pointer group/save"
            aria-label={vibe.isSaved ? "Unsave" : "Save"}
          >
            <Bookmark
              size={17}
              strokeWidth={2}
              className={cn(
                "transition-all duration-150",
                vibe.isSaved
                  ? "fill-indigo text-indigo"
                  : "text-muted group-hover/save:text-indigo"
              )}
            />
          </button>
        </div>

        {toast && (
          <div
            className={cn(
              "fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200",
              toast.type === "error"
                ? "bg-pink-soft text-pink border border-pink/20"
                : "bg-success-soft text-success border border-success/20"
            )}
          >
            {toast.type === "error" ? <AlertCircle size={14} /> : <Check size={14} />}
            {toast.message}
          </div>
        )}
      </article>

      {commentsModalOpen && (
        <CommentsModal
          contentId={vibe._id}
          content={vibe}
          contentType={CONTENT_TYPE.VIBE}
          commentsCount={commentsCount}
          onClose={() => setCommentsModalOpen(false)}
          onCommentCountChange={(newCount) => {
            setCommentsCount(newCount);
            setVibe((v) => ({ ...v, commentsCount: newCount }));
            dispatch(updateVibeInProfile({ _id: vibe._id, commentsCount: newCount }));
          }}
        />
      )}

      {fullscreenModal && (
        <FullscreenMediaViewer
          mediaList={effectiveList}
          initialIndex={vibeIndex}
          contentType={CONTENT_TYPE.VIBE}
          onClose={() => setFullscreenModal(false)}
        />
      )}
    </>
  );
}
