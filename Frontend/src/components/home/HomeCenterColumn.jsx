import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sparkles,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils.js";
import SearchInput from "@ui/SearchInput.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import VibesFeed from "../vibes/VibeFeed.jsx";
import StoryAvatarRing from "../story/StoryAvatarRing.jsx";
import { fetchFeedStories, openStoryViewer } from "@/redux/features/story/storySlice.js";
import StoryViewerModal from "../story/StoryViewerModal.jsx";
import PostCard from "@/components/post/PostCard.jsx";
import {
  fetchFeedPosts,
  fetchMoreFeedPosts,
  removeFeedPost,
} from "@/redux/features/feed/feedSlice.js";

function PostSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/70 bg-surface/40 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-border/50 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-border/60" />
          <div className="h-2.5 w-16 rounded bg-border/40" />
        </div>
      </div>
      <div className="aspect-[4/5] w-full rounded-lg bg-border/40" />
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-border/50" />
          <div className="h-7 w-7 rounded-full bg-border/50" />
        </div>
        <div className="h-7 w-7 rounded-full bg-border/50" />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2.5 w-3/4 rounded bg-border/40" />
        <div className="h-2.5 w-1/2 rounded bg-border/30" />
      </div>
    </div>
  );
}

export default function HomeCenterColumn({
  initialTab = "home",
  activeTab: propActiveTab,
  onTabChange,
  onOpenCreate,
  className,
}) {
  const dispatch = useDispatch();
  const [internalTab, setInternalTab] = useState(initialTab);
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab;
  const [searchValue, setSearchValue] = useState("");

  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;
  const feedStoryGroups = useSelector((s) => s.story?.feedStoryGroups || []);

  const {
    posts,
    page,
    totalPages,
    hasMore,
    loading,
    loadingMore,
    error,
    initialLoaded,
  } = useSelector((s) => s.feed);

  // Sentinel ref for infinite scrolling
  const sentinelRef = useRef(null);

  // Scroll container ref & active video playback manager
  const scrollContainerRef = useRef(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const videoCardsMap = useRef(new Map());
  const videoRatiosMap = useRef(new Map());

  const registerVideoElement = useCallback((postId, el) => {
    if (el) {
      videoCardsMap.current.set(postId, el);
    } else {
      videoCardsMap.current.delete(postId);
      videoRatiosMap.current.delete(postId);
    }
  }, []);

  // IntersectionObserver to auto-select the single active video closest to viewport center
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    if (activeTab !== "home") {
      setActiveVideoId(null);
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.getAttribute("data-video-post-id");
          if (postId) {
            videoRatiosMap.current.set(postId, {
              ratio: entry.intersectionRatio,
              target: entry.target,
            });
          }
        });

        const containerRect = container.getBoundingClientRect();
        const containerCenterY = containerRect.top + containerRect.height / 2;

        let bestCandidateId = null;
        let minDistance = Infinity;

        for (const [id, info] of videoRatiosMap.current.entries()) {
          // Video must be at least 45% visible to qualify for autoplay
          if (info.ratio >= 0.45) {
            const rect = info.target.getBoundingClientRect();
            const elementCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(containerCenterY - elementCenterY);
            if (distance < minDistance) {
              minDistance = distance;
              bestCandidateId = id;
            }
          }
        }

        setActiveVideoId(bestCandidateId);
      },
      {
        root: container,
        threshold: [0, 0.25, 0.45, 0.6, 0.75, 0.9, 1.0],
      }
    );

    videoCardsMap.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [activeTab, posts]);

  // Pause when browser tab/window is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setActiveVideoId(null);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const accessToken = useSelector((s) => s.auth?.accessToken) || localStorage.getItem("accessToken");

  // Fetch stories & feed posts on initial load
  useEffect(() => {
    if (accessToken) {
      dispatch(fetchFeedStories());
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (activeTab === "home" && accessToken && !initialLoaded && !loading) {
      dispatch(fetchFeedPosts({ page: 1, limit: 10 }));
    }
  }, [activeTab, accessToken, initialLoaded, loading, dispatch]);

  // Infinite scrolling observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          dispatch(fetchMoreFeedPosts());
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchFeedPosts({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Determine logged in user's story group
  const myStoryGroupIndex = feedStoryGroups.findIndex(
    (g) => currentUserId && String(g.user?._id) === String(currentUserId)
  );
  const myStoryGroup = myStoryGroupIndex >= 0 ? feedStoryGroups[myStoryGroupIndex] : null;
  const hasMyStory = Boolean(myStoryGroup && myStoryGroup.stories?.length > 0);
  const myStoryHasUnseen = hasMyStory && myStoryGroup.stories.some((s) => !s.isViewed);

  const handleMyStoryAvatarClick = () => {
    if (hasMyStory) {
      dispatch(
        openStoryViewer({
          groups: feedStoryGroups,
          groupIndex: myStoryGroupIndex,
          storyIndex: 0,
        })
      );
    } else {
      onOpenCreate && onOpenCreate("story");
    }
  };

  const handleMyStoryPlusClick = () => {
    onOpenCreate && onOpenCreate("story");
  };

  const handleOtherStoryClick = (groupIndex) => {
    dispatch(
      openStoryViewer({
        groups: feedStoryGroups,
        groupIndex,
        storyIndex: 0,
      })
    );
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-1 flex-col border-x border-border-subtle/70 bg-paper",
        className
      )}
    >
      {/* Story Viewer Modal */}
      <StoryViewerModal />

      {activeTab === "reels" ? (
        <div className="relative flex h-full w-full min-h-0 min-w-0">
          <VibesFeed />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="mx-auto flex w-full max-w-[620px] min-w-0 flex-1 flex-col overflow-y-auto custom-scrollbar"
        >
          <div
            role="tabpanel"
            id={`tab-panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="flex min-h-0 flex-1 flex-col gap-6 px-3 pb-28 pt-4 sm:px-5 lg:pt-6 lg:pb-6"
          >
            {activeTab === "home" && (
              <>
                {/* Story Feed Bar */}
                <div className="-mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-start gap-4 px-1 pb-1 pt-1">
                    {/* Your Story */}
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <StoryAvatarRing
                        src={currentUser?.avatar || lightIconCircle}
                        size={64}
                        hasActiveStory={hasMyStory}
                        hasUnseen={myStoryHasUnseen}
                        isYou={true}
                        showPlusBadge={true}
                        onClick={handleMyStoryAvatarClick}
                        onPlusClick={handleMyStoryPlusClick}
                        fallbackLetter={currentUser?.name || currentUser?.username || "U"}
                      />
                      <span className="max-w-[68px] truncate text-[11px] font-medium leading-4 text-ink">
                        Your Story
                      </span>
                    </div>

                    {/* Other Users' Stories */}
                    {feedStoryGroups.map((group, idx) => {
                      if (myStoryGroupIndex >= 0 && idx === myStoryGroupIndex) return null;

                      return (
                        <div key={group.user?._id || idx} className="flex flex-col items-center gap-1.5 shrink-0">
                          <StoryAvatarRing
                            src={group.user?.avatar}
                            size={64}
                            hasActiveStory={true}
                            hasUnseen={group.hasUnseen}
                            onClick={() => handleOtherStoryClick(idx)}
                            fallbackLetter={group.user?.name || group.user?.username || "U"}
                          />
                          <span
                            className={cn(
                              "max-w-[68px] truncate text-[11px] leading-4",
                              group.hasUnseen ? "text-ink font-medium" : "text-text-subtle"
                            )}
                          >
                            @{group.user?.username || "user"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-pink/30 bg-pink-soft/40 p-4 text-xs text-pink">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle size={16} className="shrink-0" />
                      <span className="truncate">{error}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="flex items-center gap-1.5 rounded-lg bg-pink px-3 py-1.5 font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                  </div>
                )}

                {/* Loading Initial Skeleton */}
                {loading && !initialLoaded && (
                  <div className="flex flex-col gap-6">
                    <PostSkeleton />
                    <PostSkeleton />
                  </div>
                )}

                {/* Feed Posts */}
                {posts.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {posts.map((post, idx) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        postsList={posts}
                        postIndex={idx}
                        isActiveVideo={activeTab === "home" && activeVideoId === post._id}
                        onRegisterVideoElement={registerVideoElement}
                        onDeleted={(deletedId) => dispatch(removeFeedPost(deletedId))}
                      />
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!loading && initialLoaded && posts.length === 0 && !error && (
                  <div className="my-8 flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-surface/50 p-8 text-center shadow-xs">
                    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-soft text-indigo shadow-inner">
                      <Sparkles size={28} />
                    </div>
                    <h3 className="text-base font-bold text-ink">Welcome to your Feed</h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">
                      Your home feed only shows your own posts and eligible posts from accounts you follow.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenCreate && onOpenCreate("post")}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-hover transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        Share Your First Post
                      </button>
                      <button
                        type="button"
                        onClick={() => onTabChange && onTabChange("search")}
                        className="flex items-center gap-1.5 rounded-xl border border-border bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-overlay cursor-pointer transition-colors"
                      >
                        <Users size={14} />
                        Find People to Follow
                      </button>
                    </div>
                  </div>
                )}

                {/* Pagination Sentinel & Loading More Indicator */}
                <div ref={sentinelRef} className="py-2 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-xs text-muted py-4">
                      <Loader2 size={16} className="animate-spin text-indigo" />
                      Loading more posts…
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && !loading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted/70 py-6">
                      <CheckCircle2 size={14} className="text-muted/60" />
                      You're all caught up!
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "search" && (
              <div className="grid flex-1 place-items-center px-2 pb-20 pt-8">
                <div className="w-full max-w-md space-y-4">
                  <SearchInput
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="Search people, tags, posts…"
                    size="lg"
                    variant="elevated"
                    autoFocus
                  />
                  <p className="text-center text-[13px] leading-5 text-text-subtle">
                    Explore view — search for friends and public accounts.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "create" && (
              <div className="grid flex-1 place-items-center pb-20 pt-8">
                <div className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-6 text-center">
                  <p className="text-[15px] font-semibold text-ink">
                    Create Content
                  </p>
                  <p className="text-xs text-text-subtle">
                    Publish a new Post, Vibe video clip, or Story.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenCreate && onOpenCreate("post")}
                    className="mt-2 rounded-xl bg-indigo px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all cursor-pointer"
                  >
                    Open Content Creator
                  </button>
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="grid flex-1 place-items-center pb-20 pt-8">
                <p className="text-[13px] leading-5 text-text-subtle">
                  Profile view — demo placeholder.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
