import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, MessageCircle, Bookmark, MoreHorizontal, Send,
  Trash2, Pencil, X, ChevronDown, ChevronUp, CornerDownRight,
  Film, Check, AlertCircle, Volume2, VolumeX, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import api from "@/api/axios";
import {
  removePostFromProfile,
  updatePostInProfile,
  updateVibeInProfile,
  removeVibeFromProfile,
} from "@/redux/features/profile/profileSlice.js";

export const CONTENT_TYPE = {
  POST: "post",
  VIBE: "vibe",
};

const CONTENT_CONFIG = {
  [CONTENT_TYPE.POST]: {
    apiPrefix: "/posts",
    savedField: "savedPost",
    likeField: "like",
    commentField: "comment",
    hasReplies: true,
  },
  [CONTENT_TYPE.VIBE]: {
    apiPrefix: "/vibes",
    savedField: "savedVibe",
    likeField: "like",
    commentField: "comment",
    hasReplies: false,
  },
};

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

export function MediaAvatar({ src, size = 34, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-elevated ring-1 ring-border/60 transition-opacity",
        onClick && "cursor-pointer hover:opacity-90",
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-indigo-soft">
          <span className="text-indigo font-semibold" style={{ fontSize: size * 0.38 }}>?</span>
        </div>
      )}
    </div>
  );
}

export function MediaDropdown({ items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 min-w-[140px] overflow-hidden rounded-xl border border-border/80 bg-paper shadow-sm animate-in fade-in zoom-in-95 duration-100">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={() => { item.onClick(); onClose(); }}
          className={cn("flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors hover:bg-overlay", item.danger ? "text-pink" : "text-ink")}>
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  );
}

export function MediaToast({ message, type = "error", onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200",
      type === "error" ? "bg-pink-soft text-pink border border-pink/20" : "bg-success-soft text-success border border-success/20")}>
      {type === "error" ? <AlertCircle size={14} /> : <Check size={14} />}
      {message}
    </div>
  );
}

function renderFormattedText(text) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_\-]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <span
          key={index}
          className="font-semibold text-indigo hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/profile/${username}`;
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

function ReplyItem({ reply, contentId, commentId, contentAuthorId, contentType, onReplyUpdated, onReplyDeleted, onReplyToUser }) {
  const config = CONTENT_CONFIG[contentType] || CONTENT_CONFIG[CONTENT_TYPE.POST];
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const isReplyOwner = currentUserId && reply.user?._id && String(reply.user._id) === String(currentUserId);
  const isContentOwner = currentUserId && String(contentAuthorId) === String(currentUserId);
  const canDelete = isReplyOwner || isContentOwner;
  const canEdit = isReplyOwner && !reply.isEdited;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleEdit = async () => {
    const text = editText.trim();
    if (!text || text === reply.text) { setEditing(false); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`${config.apiPrefix}/${contentId}/comment/${commentId}/reply/${reply._id}`, { comment: text });
      onReplyUpdated(data.data.comment);
      setEditing(false);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to edit reply."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      const { data } = await api.delete(`${config.apiPrefix}/${contentId}/comment/${commentId}/reply/${reply._id}`);
      onReplyDeleted(data.data.comment);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to delete reply."); }
  };

  const menuItems = [];
  if (canEdit) menuItems.push({ label: "Edit", icon: <Pencil size={13} />, onClick: () => setEditing(true) });
  if (canDelete) menuItems.push({ label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: handleDelete });

  return (
    <div className="flex items-start gap-2 pl-8">
      <MediaAvatar src={reply.user?.avatar} size={22} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[11px] font-bold text-ink truncate cursor-pointer hover:underline">@{reply.user?.username}</span>
            {reply.isEdited && <span className="text-[9px] font-medium text-muted bg-overlay px-1 py-0.5 rounded">edited</span>}
            <span className="text-[9px] text-muted shrink-0">{timeAgo(reply.createdAt)}</span>
          </div>
          {menuItems.length > 0 && (
            <div className="relative shrink-0">
              <button type="button" onClick={() => setMenuOpen((v) => !v)} className="grid h-5 w-5 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors">
                <MoreHorizontal size={12} />
              </button>
              {menuOpen && <MediaDropdown items={menuItems} onClose={() => setMenuOpen(false)} />}
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1 flex items-center gap-1">
            <input ref={inputRef} value={editText} onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 rounded-lg border border-indigo/50 bg-surface px-2 py-0.5 text-[11px] text-ink focus:outline-none focus:border-indigo" maxLength={500} />
            <button onClick={handleEdit} disabled={saving} className="text-indigo hover:text-indigo-hover cursor-pointer"><Check size={12} /></button>
            <button onClick={() => setEditing(false)} className="text-muted hover:text-ink cursor-pointer"><X size={12} /></button>
          </div>
        ) : (
          <p className="mt-0.5 text-[11px] leading-4 text-ink/90 break-words">{renderFormattedText(reply.text)}</p>
        )}
        {currentUserId && !editing && (
          <button type="button" onClick={() => onReplyToUser && onReplyToUser(reply.user?.username)}
            className="flex items-center gap-1 text-[10px] font-medium text-muted hover:text-indigo cursor-pointer transition-colors mt-0.5">
            <CornerDownRight size={10} />Reply
          </button>
        )}
        {err && <p className="mt-0.5 text-[10px] text-pink">{err}</p>}
      </div>
    </div>
  );
}

function CommentItem({ comment, contentId, contentAuthorId, contentType, onCommentUpdated, onCommentDeleted }) {
  const config = CONTENT_CONFIG[contentType] || CONTENT_CONFIG[CONTENT_TYPE.POST];
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const isCommentOwner = currentUserId && comment.user?._id && String(comment.user._id) === String(currentUserId);
  const isContentOwner = currentUserId && String(contentAuthorId) === String(currentUserId);
  const canDelete = isCommentOwner || isContentOwner;
  const canEdit = isCommentOwner && !comment.isEdited;

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [err, setErr] = useState(null);
  const editRef = useRef(null);
  const replyRef = useRef(null);

  const replies = config.hasReplies && Array.isArray(comment.replies) ? comment.replies : [];

  useEffect(() => { if (editing && editRef.current) editRef.current.focus(); }, [editing]);
  useEffect(() => { if (replying && replyRef.current) replyRef.current.focus(); }, [replying]);

  const handleEdit = async () => {
    const text = editText.trim();
    if (!text || text === comment.text) { setEditing(false); return; }
    setSaving(true);
    try {
      const { data } = await api.put(`${config.apiPrefix}/${contentId}/comment/${comment._id}`, { comment: text });
      onCommentUpdated(data.data.comment);
      setEditing(false);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to edit comment."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`${config.apiPrefix}/${contentId}/comment/${comment._id}`);
      onCommentDeleted(comment._id);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to delete comment."); }
  };

  const handleReplyToUser = (targetUsername) => {
    setShowReplies(true);
    setReplying(true);
    if (targetUsername) {
      setReplyText(`@${targetUsername} `);
    }
    setTimeout(() => {
      if (replyRef.current) replyRef.current.focus();
    }, 50);
  };

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    setSendingReply(true);
    try {
      const { data } = await api.post(`${config.apiPrefix}/${contentId}/comment/${comment._id}/reply`, { comment: text });
      onCommentUpdated(data.data.comment);
      setReplyText("");
      setReplying(false);
      setShowReplies(true);
    } catch (e) { setErr(e?.response?.data?.message || "Failed to add reply."); }
    finally { setSendingReply(false); }
  };

  const menuItems = [];
  if (canEdit) menuItems.push({ label: "Edit", icon: <Pencil size={13} />, onClick: () => setEditing(true) });
  if (canDelete) menuItems.push({ label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: handleDelete });

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <MediaAvatar src={comment.user?.avatar} size={28} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="text-[12px] font-bold text-ink truncate cursor-pointer hover:underline">@{comment.user?.username}</span>
              {comment.isEdited && (
                <span className="text-[9px] font-medium text-muted bg-overlay px-1.5 py-0.5 rounded-full">edited</span>
              )}
              <span className="text-[10px] text-muted shrink-0">{timeAgo(comment.createdAt)}</span>
            </div>
            {menuItems.length > 0 && (
              <div className="relative shrink-0">
                <button type="button" onClick={() => setMenuOpen((v) => !v)}
                  className="grid h-5 w-5 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors" aria-label="Comment options">
                  <MoreHorizontal size={13} />
                </button>
                {menuOpen && <MediaDropdown items={menuItems} onClose={() => setMenuOpen(false)} />}
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input ref={editRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditing(false); }}
                className="flex-1 rounded-lg border border-indigo/50 bg-surface px-2.5 py-1 text-[12px] text-ink focus:outline-none focus:border-indigo" maxLength={500} />
              <button onClick={handleEdit} disabled={saving} className="text-indigo hover:text-indigo-hover cursor-pointer"><Check size={14} /></button>
              <button onClick={() => setEditing(false)} className="text-muted hover:text-ink cursor-pointer"><X size={14} /></button>
            </div>
          ) : (
            <p className="mt-0.5 text-[12px] leading-[1.4] text-ink/90 break-words">{renderFormattedText(comment.text)}</p>
          )}

          {err && <p className="mt-0.5 text-[10px] text-pink">{err}</p>}

          <div className="mt-1 flex items-center gap-3">
            {config.hasReplies && currentUserId && (
              <button type="button" onClick={() => handleReplyToUser(comment.user?.username)}
                className="flex items-center gap-1 text-[10px] font-medium text-muted hover:text-indigo cursor-pointer transition-colors">
                <CornerDownRight size={10} />Reply
              </button>
            )}
            {replies.length > 0 && (
              <button type="button" onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo hover:text-indigo-hover cursor-pointer transition-colors">
                {showReplies ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                {showReplies ? "Hide" : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {config.hasReplies && replying && (
        <div className="flex items-center gap-2 pl-8">
          <MediaAvatar src={currentUser?.avatar} size={22} />
          <div className="flex-1 flex items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 py-1 focus-within:border-indigo/60 transition-colors">
            <input ref={replyRef} value={replyText} onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleReply(); if (e.key === "Escape") setReplying(false); }}
              placeholder="Write a reply…" className="flex-1 bg-transparent text-[11px] text-ink placeholder:text-muted focus:outline-none" maxLength={500} />
            <button type="button" onClick={handleReply} disabled={!replyText.trim() || sendingReply}
              className={cn("cursor-pointer transition-colors", replyText.trim() ? "text-indigo hover:text-indigo-hover" : "text-muted")}>
              <Send size={12} />
            </button>
          </div>
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <div className="space-y-2 pt-0.5">
          {replies.map((reply) => (
            <ReplyItem key={reply._id} reply={reply} contentId={contentId} commentId={comment._id}
              contentAuthorId={contentAuthorId}
              contentType={contentType}
              onReplyToUser={handleReplyToUser}
              onReplyUpdated={(updatedComment) => onCommentUpdated(updatedComment)}
              onReplyDeleted={(updatedComment) => onCommentUpdated(updatedComment)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentsModal({ contentId, content, commentsCount: initialCount, contentType = CONTENT_TYPE.POST, onClose, onCommentCountChange }) {
  const config = CONTENT_CONFIG[contentType] || CONTENT_CONFIG[CONTENT_TYPE.POST];
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const dispatch = useDispatch();

  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(initialCount || 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [toast, setToast] = useState(null);

  const commentInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fetchingRef = useRef(false);
  const totalCommentsRef = useRef(initialCount || 0);
  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const showToast = useCallback((message, type = "error") => setToast({ message, type }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const { data } = await api.get(`${config.apiPrefix}/${contentId}/comments?page=${pageNum}&limit=20`);
      const resData = data.data || {};
      const newComments = resData.comments || [];
      const total = resData.totalComments ?? totalCommentsRef.current;
      const more = resData.hasMore ?? false;

      if (append) {
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => String(c._id)));
          const uniqueNew = newComments.filter((c) => !existingIds.has(String(c._id)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setComments(newComments);
      }

      setTotalComments(total);
      totalCommentsRef.current = total;
      setHasMore(more);
      setPage(pageNum);
      if (onCommentCountChangeRef.current) onCommentCountChangeRef.current(total);
    } catch (err) {
      console.error("Fetch comments error:", err);
      setError(err?.response?.data?.message || "Failed to load comments.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [contentId, config.apiPrefix]);

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !fetchingRef.current) {
      fetchComments(page + 1, true);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      handleLoadMore();
    }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (!currentUserId) { showToast("Please log in to comment."); return; }
    setSendingComment(true);
    try {
      const { data } = await api.post(`${config.apiPrefix}/${contentId}/comment`, { comment: text });
      const createdComment = data.data.comment;
      
      setComments((prev) => [createdComment, ...prev]);
      const newTotal = totalCommentsRef.current + 1;
      setTotalComments(newTotal);
      totalCommentsRef.current = newTotal;
      setCommentText("");
      if (onCommentCountChangeRef.current) onCommentCountChangeRef.current(newTotal);
      const updateAction = contentType === CONTENT_TYPE.VIBE ? updateVibeInProfile : updatePostInProfile;
      dispatch(updateAction({ _id: contentId, commentsCount: newTotal }));
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to add comment.");
    } finally {
      setSendingComment(false);
    }
  };

  const handleCommentUpdated = useCallback((updatedComment) => {
    setComments((prev) => prev.map((c) => String(c._id) === String(updatedComment._id) ? updatedComment : c));
  }, []);

  const handleCommentDeleted = useCallback((commentId) => {
    setComments((prev) => {
      const next = prev.filter((c) => String(c._id) !== String(commentId));
      const newTotal = Math.max(0, totalCommentsRef.current - 1);
      setTotalComments(newTotal);
      totalCommentsRef.current = newTotal;
      if (onCommentCountChangeRef.current) onCommentCountChangeRef.current(newTotal);
      const updateAction = contentType === CONTENT_TYPE.VIBE ? updateVibeInProfile : updatePostInProfile;
      dispatch(updateAction({ _id: contentId, commentsCount: newTotal }));
      return next;
    });
  }, [dispatch, contentId, contentType]);

  const authorAvatar = content?.author?.avatar;
  const authorUsername = content?.author?.username;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full h-full sm:h-[85vh] sm:max-w-lg rounded-none sm:rounded-2xl border-0 sm:border border-border/80 bg-paper shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/40 bg-surface/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <MediaAvatar src={authorAvatar} size={32} />
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-ink leading-tight truncate">
                Comments ({formatCount(totalComments)})
              </h3>
              <p className="text-[11px] text-muted leading-tight truncate">
                {contentType === CONTENT_TYPE.VIBE ? "Vibe" : "Post"} by @{authorUsername}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors"
            aria-label="Close comments"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {content?.caption && (
            <div className="flex items-start gap-2.5 pb-3 border-b border-border/30">
              <MediaAvatar src={authorAvatar} size={30} />
              <div className="flex-1 min-w-0 text-[12px] leading-relaxed text-ink">
                <span className="font-bold mr-1.5 cursor-pointer hover:underline">@{authorUsername}</span>
                {content.caption}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-surface-elevated animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-surface-elevated animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-surface-elevated animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-muted">
              <AlertCircle size={28} className="mx-auto mb-2 text-pink opacity-80" />
              <p className="text-xs font-medium text-pink">{error}</p>
              <button
                type="button"
                onClick={() => fetchComments(1, false)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-overlay text-ink cursor-pointer border border-border transition-colors"
              >
                Retry
              </button>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  contentId={contentId}
                  contentAuthorId={content?.author?._id || content?.author}
                  contentType={contentType}
                  onCommentUpdated={handleCommentUpdated}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))}

              {loadingMore && (
                <div className="py-3 text-center text-muted">
                  <span className="text-[11px] animate-pulse">Loading more comments…</span>
                </div>
              )}

              {!hasMore && comments.length > 5 && (
                <div className="py-3 text-center text-muted text-[10px]">
                  No more comments
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-muted">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No comments yet</p>
              <p className="text-[11px] opacity-70 mt-0.5">Be the first to comment on this {contentType === CONTENT_TYPE.VIBE ? "vibe" : "post"}!</p>
            </div>
          )}
        </div>

        {currentUserId && (
          <div className="p-3 border-t border-border/40 bg-surface/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <MediaAvatar src={currentUser?.avatar} size={26} />
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 focus-within:border-indigo/50 transition-colors">
                <input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent text-[12px] text-ink placeholder:text-muted focus:outline-none caret-color-auto"
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
                  maxLength={500}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || sendingComment}
                  className={cn("shrink-0 cursor-pointer transition-colors", commentText.trim() ? "text-indigo hover:text-indigo-hover" : "text-muted")}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <MediaToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
      </div>
    </div>
  );
}

export function FullscreenMediaViewer({ mediaList = [], initialIndex = 0, contentType = CONTENT_TYPE.POST, onClose }) {
  const config = CONTENT_CONFIG[contentType] || CONTENT_CONFIG[CONTENT_TYPE.POST];
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const dispatch = useDispatch();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const item = mediaList[currentIndex] || mediaList[0];

  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemMenuOpen, setItemMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const commentInputRef = useRef(null);

  useEffect(() => {
    if (!item) return;
    const commentArr = Array.isArray(item[config.commentField]) ? item[config.commentField] : [];
    setComments(commentArr);
    const likeArr = Array.isArray(item[config.likeField]) ? item[config.likeField] : [];
    setLiked(
      currentUserId && likeArr.some((id) => String(id?._id || id) === String(currentUserId))
    );
    setLikesCount(
      item.likesCount ?? likeArr.length
    );
    const savedArr = Array.isArray(item[config.savedField]) ? item[config.savedField] : [];
    setSaved(
      currentUserId && savedArr.some((id) => String(id?._id || id) === String(currentUserId))
    );
    setCommentText("");
    setItemMenuOpen(false);
  }, [currentIndex, item, currentUserId, config.commentField, config.likeField, config.savedField]);

  const showToast = useCallback((message, type = "error") => setToast({ message, type }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      } else if (e.key === "ArrowRight") {
        if (currentIndex < mediaList.length - 1) setCurrentIndex((i) => i + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, mediaList.length, onClose]);

  const handleCommentUpdated = useCallback((updatedComment) => {
    setComments((prev) => prev.map((c) => String(c._id) === String(updatedComment._id) ? updatedComment : c));
  }, []);

  const currentItemId = item?._id;
  const handleCommentDeleted = useCallback((commentId) => {
    setComments((prev) => {
      const next = prev.filter((c) => String(c._id) !== String(commentId));
      if (currentItemId) {
        const updateAction = contentType === CONTENT_TYPE.VIBE ? updateVibeInProfile : updatePostInProfile;
        dispatch(updateAction({ _id: currentItemId, commentsCount: next.length }));
      }
      return next;
    });
  }, [dispatch, currentItemId, contentType]);

  if (!item) return null;

  const isOwner = currentUserId && item?.author &&
    String(item.author._id || item.author) === String(currentUserId);

  const handleLike = async () => {
    if (!currentUserId) { showToast(`Please log in to like ${contentType === CONTENT_TYPE.VIBE ? "vibes" : "posts"}.`); return; }
    if (liking) return;
    setLiking(true);
    const prevLiked = liked; const prevCount = likesCount;
    setLiked(!prevLiked); setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const { data } = await api.post(`${config.apiPrefix}/${item._id}/like`);
      setLiked(data.isLiked); setLikesCount(data.likesCount);
    } catch { setLiked(prevLiked); setLikesCount(prevCount); showToast("Failed to update like."); }
    finally { setLiking(false); }
  };

  const handleSave = async () => {
    if (!currentUserId) { showToast(`Please log in to save ${contentType === CONTENT_TYPE.VIBE ? "vibes" : "posts"}.`); return; }
    if (savingMedia) return;
    setSavingMedia(true);
    const prevSaved = saved; setSaved(!prevSaved);
    try { const { data } = await api.post(`${config.apiPrefix}/${item._id}/save`); setSaved(data.isSaved); }
    catch { setSaved(prevSaved); showToast("Failed to update save."); }
    finally { setSavingMedia(false); }
  };

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    if (!currentUserId) { showToast("Please log in to comment."); return; }
    setSendingComment(true);
    try {
      const { data } = await api.post(`${config.apiPrefix}/${item._id}/comment`, { comment: text });
      const newComments = [...comments, data.data.comment];
      setComments(newComments); setCommentText("");
      const updateAction = contentType === CONTENT_TYPE.VIBE ? updateVibeInProfile : updatePostInProfile;
      dispatch(updateAction({ _id: item._id, comment: newComments, commentsCount: newComments.length }));
    } catch (e) { showToast(e?.response?.data?.message || "Failed to add comment."); }
    finally { setSendingComment(false); }
  };

  const handleDeleteItem = async () => {
    setDeleting(true);
    try {
      await api.delete(`${config.apiPrefix}/${item._id}`);
      const removeAction = contentType === CONTENT_TYPE.VIBE ? removeVibeFromProfile : removePostFromProfile;
      dispatch(removeAction(item._id));
      setDeleteModal(false);
      onClose();
    } catch (e) { showToast(e?.response?.data?.message || `Failed to delete ${contentType === CONTENT_TYPE.VIBE ? "vibe" : "post"}.`); setDeleting(false); }
  };

  const itemMenuItems = isOwner
    ? [{ label: `Delete ${contentType === CONTENT_TYPE.VIBE ? "Vibe" : "Post"}`, icon: <Trash2 size={13} />, danger: true, onClick: () => setDeleteModal(true) }]
    : [];

  const authorAvatar = item?.author?.avatar;
  const authorUsername = item?.author?.username;
  const authorName = item?.author?.name;

  const isVideo = item?.mediaType === "video" || contentType === CONTENT_TYPE.VIBE;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="absolute left-2 sm:left-6 z-30 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {currentIndex < mediaList.length - 1 && (
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="absolute right-2 sm:right-6 z-30 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
          aria-label="Next"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <div className="relative z-20 w-[95vw] md:w-[85vw] lg:w-[65vw] xl:w-[60vw] h-[85vh] md:h-[80vh] max-w-[1100px] rounded-2xl border border-border/80 bg-paper shadow-lg overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-150">
        
        <div className="w-full md:w-[40%] lg:w-[38%] bg-black relative flex items-center justify-center overflow-hidden h-64 md:h-full shrink-0">
          {item?.media ? (
            isVideo ? (
              <video
                key={item._id}
                src={item.media}
                className="h-full w-full object-contain cursor-pointer"
                autoPlay
                loop
                playsInline
                muted={isMuted}
              />
            ) : (
              <img
                key={item._id}
                src={item.media}
                alt={item?.caption || "Media"}
                className="h-full w-full object-contain cursor-pointer"
              />
            )
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted bg-gradient-to-br from-indigo-soft to-surface-elevated">
              <Film size={36} strokeWidth={1.5} />
            </div>
          )}

          {isVideo && (
            <button
              type="button"
              onClick={() => setIsMuted((v) => !v)}
              className="absolute bottom-3 right-3 z-30 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition-colors border border-white/20 cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
        </div>

        <div className="w-full md:w-[60%] lg:w-[62%] flex flex-col h-full bg-paper min-w-0 border-l border-border/40">
          
          <div className="flex items-center justify-between gap-2 p-3.5 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <MediaAvatar src={authorAvatar} size={34} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-bold text-ink leading-tight truncate cursor-pointer hover:underline">
                    {authorName || `@${authorUsername}`}
                  </span>
                  <span className="text-[11px] text-muted leading-tight truncate cursor-pointer hover:underline">
                    @{authorUsername}
                  </span>
                  <span className="text-[11px] text-muted">•</span>
                  <span className="text-[11px] font-medium text-muted shrink-0">
                    {timeAgo(item?.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {itemMenuItems.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setItemMenuOpen((v) => !v)}
                    className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors"
                    aria-label="Options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {itemMenuOpen && (
                    <MediaDropdown items={itemMenuItems} onClose={() => setItemMenuOpen(false)} />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors ml-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {item?.caption && (
              <div className="flex items-start gap-2.5 pb-3 border-b border-border/30">
                <MediaAvatar src={authorAvatar} size={30} />
                <div className="flex-1 min-w-0 text-[12px] leading-relaxed text-ink">
                  <span className="font-bold mr-1.5 cursor-pointer hover:underline">@{authorUsername}</span>
                  {item.caption}
                </div>
              </div>
            )}

            {comments.length > 0 ? (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    contentId={item._id}
                    contentAuthorId={item.author?._id || item.author}
                    contentType={contentType}
                    onCommentUpdated={handleCommentUpdated}
                    onCommentDeleted={handleCommentDeleted}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted">
                <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">No comments yet</p>
                <p className="text-[11px] opacity-70 mt-0.5">Start the conversation!</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border/40 bg-surface/30 shrink-0">
            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              aria-pressed={liked}
              className={cn("inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-semibold leading-none cursor-pointer transition-all duration-150 select-none",
                liked ? "text-pink bg-pink-soft/70 hover:bg-pink-soft" : "text-muted hover:text-pink hover:bg-pink-soft/40")}
            >
              <Heart size={16} strokeWidth={2} fill={liked ? "currentColor" : "none"} className={cn("shrink-0 transition-transform", liked && "scale-110")} />
              <span className="leading-none">{formatCount(likesCount)}</span>
            </button>

            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-semibold text-muted hover:text-indigo hover:bg-indigo-soft/40 cursor-pointer transition-all duration-150 select-none"
            >
              <MessageCircle size={16} strokeWidth={2} className="shrink-0" />
              <span className="leading-none">{formatCount(comments.length)}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={savingMedia}
              aria-pressed={saved}
              className={cn("ml-auto inline-flex items-center justify-center h-8 w-8 rounded-full text-muted hover:text-indigo hover:bg-indigo-soft/40 cursor-pointer transition-all duration-150 select-none",
                saved && "text-indigo bg-indigo-soft/70 hover:bg-indigo-soft")}
            >
              <Bookmark size={16} strokeWidth={2} fill={saved ? "currentColor" : "none"} className={cn("shrink-0 transition-transform", saved && "scale-110")} />
            </button>
          </div>

          {currentUserId && (
            <div className="p-3 border-t border-border/40 bg-surface/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <MediaAvatar src={currentUser?.avatar} size={26} />
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5 focus-within:border-indigo/50 transition-colors">
                  <input
                    ref={commentInputRef}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
                    placeholder="Add a comment…"
                    className="flex-1 bg-transparent text-[12px] text-ink placeholder:text-muted focus:outline-none caret-color-auto"
                    style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
                    maxLength={500}
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || sendingComment}
                    className={cn("shrink-0 cursor-pointer transition-colors", commentText.trim() ? "text-indigo hover:text-indigo-hover" : "text-muted")}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-paper p-5 text-center shadow-md animate-in zoom-in-95 duration-150">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pink-soft text-pink">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-ink">Delete this {contentType === CONTENT_TYPE.VIBE ? "vibe" : "post"}?</h3>
            <p className="mt-1 text-xs text-muted">This will permanently remove the {contentType === CONTENT_TYPE.VIBE ? "vibe" : "post"} and all its comments.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setDeleteModal(false)} disabled={deleting}
                className="flex-1 rounded-xl border border-border bg-surface py-2 text-xs font-semibold text-ink hover:bg-overlay cursor-pointer transition-colors">Cancel</button>
              <button type="button" onClick={handleDeleteItem} disabled={deleting}
                className="flex-1 rounded-xl bg-pink py-2 text-xs font-semibold text-white hover:bg-pink-hover cursor-pointer transition-colors disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <MediaToast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}
