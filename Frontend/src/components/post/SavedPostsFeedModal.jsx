import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, X, Check, Bookmark } from "lucide-react";
import { useDispatch } from "react-redux";
import PostCard from "./PostCard.jsx";
import VibeCard from "./VibeCard.jsx";
import {
  fetchSavedPosts,
  fetchSavedVibes,
} from "@/redux/features/profile/profileSlice.js";

/**
 * SavedPostsFeedModal
 * ───────────────────
 * Full-screen, normal post-view experience for Saved Posts:
 * - Opens at the clicked post (e.g. 3rd post out of 10)
 * - Enables smooth vertical scrolling in existing order (3rd -> 4th -> ... -> last)
 * - Reuses existing full PostCard & VibeCard components with complete interactive support
 * - Unsaving a post updates backend & Redux state immediately without breaking the scroll layout
 * - Explicit end-of-content banner at the end of saved posts (no looping or unrelated posts)
 */
export default function SavedPostsFeedModal({
  isOpen,
  initialIndex = 0,
  items = [],
  onClose,
}) {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [feedItems, setFeedItems] = useState([]);
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);
  const [hasUnsavedAny, setHasUnsavedAny] = useState(false);

  // Initialize stable feed items when modal opens
  useEffect(() => {
    if (isOpen) {
      setFeedItems(Array.isArray(items) ? [...items] : []);
      setHasScrolledToInitial(false);
      setHasUnsavedAny(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, items]);

  // Scroll to the selected initialIndex upon opening
  useEffect(() => {
    if (isOpen && !hasScrolledToInitial && feedItems.length > 0) {
      const targetIdx = Math.max(0, Math.min(initialIndex, feedItems.length - 1));
      
      const scrollToItem = () => {
        const el = itemRefs.current[targetIdx];
        if (el) {
          el.scrollIntoView({ block: "start", behavior: "auto" });
          setHasScrolledToInitial(true);
        }
      };

      // Try immediate, and fallback with small timeout to allow layout calculation
      scrollToItem();
      const timer = setTimeout(scrollToItem, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialIndex, feedItems.length, hasScrolledToInitial]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (hasUnsavedAny) {
      // Refresh saved posts & vibes in Redux so grid reflects changes
      dispatch(fetchSavedPosts());
      dispatch(fetchSavedVibes());
    }
    onClose && onClose();
  }, [hasUnsavedAny, dispatch, onClose]);

  // Track if any post is unsaved or deleted
  const handleItemUnsavedOrDeleted = useCallback((itemId) => {
    setHasUnsavedAny(true);
  }, []);

  if (!isOpen) return null;

  const validItems = feedItems.filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-paper text-ink overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Saved posts viewer"
    >
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink hover:bg-overlay cursor-pointer transition-colors"
            aria-label="Back to saved list"
            title="Back to saved list"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-indigo fill-indigo/20 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-ink leading-tight">Saved Posts</h2>
              <p className="text-[11px] text-muted">
                {validItems.length} {validItems.length === 1 ? "saved item" : "saved items"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink hover:bg-overlay cursor-pointer transition-colors"
          aria-label="Close"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </header>

      {/* Vertically Scrollable Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 py-6"
      >
        <div className="mx-auto max-w-[580px] w-full space-y-6">
          {validItems.map((item, index) => {
            const isVibe = item._type === "vibe" || item._kind === "vibe";
            const itemId = item._id || String(index);

            return (
              <div
                key={`${isVibe ? "vibe" : "post"}-${itemId}`}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="scroll-mt-16"
              >
                {isVibe ? (
                  <VibeCard
                    vibe={item}
                    vibesList={validItems.filter((i) => i._type === "vibe" || i._kind === "vibe")}
                    vibeIndex={index}
                  />
                ) : (
                  <PostCard
                    post={item}
                    postsList={validItems.filter((i) => !(i._type === "vibe" || i._kind === "vibe"))}
                    postIndex={index}
                    onDeleted={handleItemUnsavedOrDeleted}
                  />
                )}
              </div>
            );
          })}

          {/* End-of-Content State */}
          <div className="py-14 px-4 text-center select-none border-t border-border/40 mt-8">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-surface-elevated border border-border text-indigo">
              <Check size={22} strokeWidth={2.5} />
            </div>
            <h4 className="text-sm font-bold text-ink">You're all caught up</h4>
            <p className="mt-1 text-xs text-muted max-w-xs mx-auto leading-relaxed">
              You've reached the end of your saved posts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
