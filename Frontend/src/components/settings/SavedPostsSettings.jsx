import React, { useState } from "react";
import { Bookmark, Grid3x3, Film, Heart, ExternalLink } from "lucide-react";
import { colors, shadow } from "@doc/designSystem.js";

const DEMO_SAVED_POSTS = [
  {
    id: "s1",
    mediaType: "image",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    caption: "Modern abstract architecture & minimal design vibes ✨",
    likesCount: 142,
    savedAt: "2 days ago",
  },
  {
    id: "s2",
    mediaType: "image",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
    caption: "Color theory and UI design explorations",
    likesCount: 98,
    savedAt: "5 days ago",
  },
  {
    id: "s3",
    mediaType: "video",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    caption: "Setup tour 2026: Minimalist tech space",
    likesCount: 310,
    savedAt: "1 week ago",
  },
];

export default function SavedPostsSettings() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [savedPosts, setSavedPosts] = useState(DEMO_SAVED_POSTS);

  const filteredPosts = savedPosts.filter((post) => {
    if (activeFilter === "photos") return post.mediaType === "image";
    if (activeFilter === "videos") return post.mediaType === "video";
    return true;
  });

  const handleUnsave = (id) => {
    setSavedPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header & Subtitle */}
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-indigo-400 fill-indigo-400" />
          Saved Posts
        </h3>

      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        {[
          { id: "all", label: "All Posts", icon: Grid3x3 },
          { id: "photos", label: "Photos", icon: Grid3x3 },
          { id: "videos", label: "Reels", icon: Film },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${isActive
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

      {/* Posts Grid */}
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-surface-elevated border border-border/50 transition-all duration-200 hover:shadow-md"
            >
              <img
                src={post.imageUrl}
                alt={post.caption}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Media type indicator */}
              {post.mediaType === "video" && (
                <div className="absolute top-2 right-2 rounded-md bg-black/60 backdrop-blur-sm p-1 text-white">
                  <Film size={12} />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3 flex flex-col justify-between text-white">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUnsave(post.id)}
                    className="rounded-full bg-red-500/80 hover:bg-red-500 p-1.5 text-white transition-colors"
                    title="Remove from Saved"
                  >
                    <Bookmark size={13} className="fill-current" />
                  </button>
                </div>
                <div>
                  <p className="text-xs line-clamp-2 text-white/90 font-medium">{post.caption}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/70">
                    <span className="flex items-center gap-1">
                      <Heart size={11} className="text-pink-400 fill-pink-400" />
                      {post.likesCount}
                    </span>
                    <span>{post.savedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center rounded-2xl border border-dashed border-border/70 bg-surface/40">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-elevated text-muted">
            <Bookmark size={22} />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">No Saved Posts</p>
          <p className="mt-1 text-xs text-muted max-w-xs mx-auto">
            When you save posts, photos, or reels, they will show up here.
          </p>
        </div>
      )}
    </div>
  );
}
