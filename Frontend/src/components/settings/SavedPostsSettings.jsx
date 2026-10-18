import React, { useState, useEffect, useCallback } from "react";
import { Bookmark, Grid3x3, Film, Heart, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSavedPosts,
  fetchSavedVibes,
} from "@/redux/features/profile/profileSlice.js";
import api from "@/api/axios.js";
import SavedPostsFeedModal from "@/components/post/SavedPostsFeedModal.jsx";
import VideoThumbnail from "@/components/ui/VideoThumbnail.jsx";
import { isVideoMedia } from "@/utils/videoUtils.js";

function Skeleton({ className }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-overlay/70 ${className || ""}`}
    />
  );
}

export default function SavedPostsSettings() {
  const dispatch = useDispatch();
  const {
    savedPosts,
    savedVibes,
    savedPostsLoading,
    savedVibesLoading,
  } = useSelector((s) => s.profile || {});

  const [activeFilter, setActiveFilter] = useState("all");
  const [unsavingId, setUnsavingId] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);

  // Fetch on mount
  useEffect(() => {
    if (!hasFetched) {
      dispatch(fetchSavedPosts());
      dispatch(fetchSavedVibes());
      setHasFetched(true);
    }
  }, [dispatch, hasFetched]);

  const isLoading = savedPostsLoading || savedVibesLoading;

  // Merge and filter
  const allSavedItems = React.useMemo(() => {
    const posts = (Array.isArray(savedPosts) ? savedPosts : []).map((p) => ({
      ...p,
      _type: "post",
    }));
    const vibes = (Array.isArray(savedVibes) ? savedVibes : []).map((v) => ({
      ...v,
      _type: "vibe",
    }));

    let merged = [...posts, ...vibes];

    // Sort by creation date, newest first
    merged.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    if (activeFilter === "posts") {
      return merged.filter((item) => item._type === "post");
    }
    if (activeFilter === "vibes") {
      return merged.filter((item) => item._type === "vibe");
    }
    return merged;
  }, [savedPosts, savedVibes, activeFilter]);

  const handleUnsave = useCallback(
    async (item) => {
      if (unsavingId) return;
      setUnsavingId(item._id);
      try {
        if (item._type === "vibe") {
          await api.post(`/vibes/${item._id}/save`);
        } else {
          await api.post(`/posts/${item._id}/save`);
        }
        // Refetch to get updated lists
        dispatch(fetchSavedPosts());
        dispatch(fetchSavedVibes());
      } catch (err) {
        console.error("Unsave failed:", err);
      } finally {
        setUnsavingId(null);
      }
    },
    [dispatch, unsavingId]
  );

  const getItemMedia = (item) => {
    return item.media || item.videoUrl || item.thumbnail || item.imageUrl || null;
  };

  const getItemCaption = (item) => {
    return item.caption || item.description || "";
  };

  const getItemLikes = (item) => {
    return item.likesCount || (Array.isArray(item.like) ? item.like.length : 0);
  };

  const getItemDate = (item) => {
    if (!item.createdAt) return "";
    const date = new Date(item.createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filterTabs = [
    { id: "all", label: "All Saved", icon: Grid3x3 },
    { id: "posts", label: "Posts", icon: Grid3x3 },
    { id: "vibes", label: "Vibes", icon: Film },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-indigo-400 fill-indigo-400" />
          Saved Posts
        </h3>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-indigo text-white shadow-sm"
                  : "bg-surface-elevated text-muted hover:text-ink hover:bg-overlay"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      ) : allSavedItems.length > 0 ? (
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
          {allSavedItems.map((item, index) => {
            const media = getItemMedia(item);
            const caption = getItemCaption(item);
            const likes = getItemLikes(item);
            const date = getItemDate(item);
            const isVideo = isVideoMedia(item);
            const isUnsaving = unsavingId === item._id;

            return (
              <div
                key={`${item._type || "post"}-${item._id}`}
                onClick={() => {
                  setSelectedPostIndex(index);
                  setViewerOpen(true);
                }}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-surface-elevated border border-border/50 hover:border-border transition-colors duration-200 hover:shadow-md cursor-pointer"
              >
                {media ? (
                  isVideo ? (
                    <VideoThumbnail
                      src={media}
                      poster={item.thumbnail}
                      alt={caption || "Saved video"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={media}
                      alt={caption || "Saved post"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-overlay/30">
                    {isVideo ? (
                      <Film size={26} className="text-muted" />
                    ) : (
                      <Grid3x3 size={26} className="text-muted" />
                    )}
                  </div>
                )}

                {/* Video indicator badge */}
                {isVideo && (
                  <div className="absolute top-2.5 right-2.5 z-10 rounded-lg bg-black/60 backdrop-blur-md px-1.5 py-1 text-white shadow-sm pointer-events-none group-hover:opacity-0 transition-opacity">
                    <Film size={12} strokeWidth={2.2} />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-3 sm:p-3.5 flex flex-col justify-between text-white z-20">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnsave(item);
                      }}
                      disabled={isUnsaving}
                      className="rounded-full bg-red-500/85 hover:bg-red-500 p-1.5 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                      title="Remove from Saved"
                    >
                      {isUnsaving ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Bookmark size={13} className="fill-current" />
                      )}
                    </button>
                  </div>
                  <div>
                    {caption && (
                      <p className="text-xs line-clamp-2 text-white/95 font-medium leading-relaxed">
                        {caption}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/70">
                      <span className="flex items-center gap-1 font-medium">
                        <Heart
                          size={11}
                          className="text-pink-400 fill-pink-400"
                        />
                        {likes}
                      </span>
                      {date && <span>{date}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center rounded-2xl border border-dashed border-border/70 bg-surface/40">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-elevated text-muted">
            <Bookmark size={22} />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">
            {activeFilter === "all"
              ? "No Saved Items"
              : activeFilter === "posts"
              ? "No Saved Posts"
              : "No Saved Vibes"}
          </p>
          <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
            {activeFilter === "all"
              ? "When you save posts or vibes, they will show up here."
              : activeFilter === "posts"
              ? "When you save posts, they will show up here."
              : "When you save vibes, they will show up here."}
          </p>
        </div>
      )}

      {/* Fullscreen Vertical Scrolling Saved Posts Viewer */}
      <SavedPostsFeedModal
        isOpen={viewerOpen}
        initialIndex={selectedPostIndex}
        items={allSavedItems}
        onClose={() => {
          setViewerOpen(false);
          dispatch(fetchSavedPosts());
          dispatch(fetchSavedVibes());
        }}
      />
    </div>
  );
}
