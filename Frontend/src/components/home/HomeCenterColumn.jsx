import { useEffect, useState } from "react";
import {
  Bookmark,
  MessageCircle,
  Heart,
  Music2,
  Volume2,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils.js";
import SearchInput from "@ui/SearchInput.jsx";
import { Avatar, FollowPill } from "./HomeLeftSidebar.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import VibesFeed from "../vibes/VibeFeed.jsx";
import StoryAvatarRing from "../story/StoryAvatarRing.jsx";
import { fetchFeedStories, openStoryViewer } from "@/redux/features/story/storySlice.js";
import StoryViewerModal from "../story/StoryViewerModal.jsx";

const CENTER_DEMO_POSTS = [
  {
    id: "p1",
    author: {
      username: "aditya123",
      avatar: lightIconCircle,
    },
    followState: "idle",
    caption: "background",
    likes: 2,
    comments: 4,
    audioLabel: "Original audio — aditya123",
    mediaLabel: "grid • red vignette",
  },
];

function PostCard({ post, onLike, onFollow, className }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article
      className={cn(
        "relative w-full max-w-full overflow-hidden rounded-[10px]",
        className
      )}
    >
      <header className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 sm:px-5 sm:py-4">
        <Avatar src={post.author.avatar} size={40} ringed />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-5 text-ink">
            @{post.author.username}
          </p>
        </div>
        <FollowPill state={post.followState} onClick={() => onFollow && onFollow(post)} />
      </header>

      <div className="relative bg-surface-elevated">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden bg-surface"
          aria-label={post.mediaLabel}
        >
          <div
            className="absolute inset-0 opacity-[0.95]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(34,34,44,0) 0%, rgba(15,15,20,0.92) 100%), radial-gradient(circle at 20% 20%, rgba(107,91,255,0.08), transparent 40%), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 40px), linear-gradient(180deg, #22222C 0%, #2A1820 62%, #3A1018 100%)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-2xl border border-border-strong bg-surface-elevated/60 px-4 py-2 backdrop-blur">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-text-subtle">
                {post.mediaLabel}
              </p>
            </div>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2 text-[12px] text-white/80">
            <Music2 size={14} className="text-white/90" strokeWidth={2} />
            <span className="truncate">{post.audioLabel}</span>
            <span className="ml-auto">
              <Volume2 size={14} strokeWidth={2} />
            </span>
          </div>
        </div>
      </div>

      <footer className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setLiked((v) => !v);
              onLike && onLike(post);
            }}
            className={cn(
              "grid h-9 cursor-pointer w-9 place-items-center rounded-full transition-all duration-120 ease-out hover:bg-overlay-hover",
              liked ? "text-pink" : "text-ink"
            )}
            aria-pressed={liked}
            aria-label="Like post"
          >
            <Heart
              size={20}
              strokeWidth={2}
              fill={liked ? "currentColor" : "none"}
            />
          </button>
          <span className="text-[13px] text-ink select-none">
            <b className="font-semibold">{liked ? post.likes + 1 : post.likes}</b>
          </span>

          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors duration-120 ease-out hover:bg-overlay-hover cursor-pointer"
            aria-label="Comment"
          >
            <MessageCircle size={20} strokeWidth={2} />
          </button>
          <div className="h-6 bg-border" />
          <span className="text-[13px] text-ink select-none">
            <b className="font-semibold">{post.comments}</b>
          </span>
          <button
            type="button"
            onClick={() => setSaved((v) => !v)}
            aria-pressed={saved}
            aria-label="Save post"
            className={cn(
              "ml-auto grid h-10 w-10 place-items-center rounded-full transition-all duration-120 ease-out hover:bg-overlay-hover",
              saved ? "text-ink" : "text-subtle"
            )}
          >
            <Bookmark
              size={20}
              strokeWidth={2}
              fill={saved ? "currentColor" : "none"}
            />
          </button>
        </div>

        <p className="text-[14px] leading-6 text-ink">
          <b className="font-semibold mr-1.5">@{post.author.username}</b>
          {post.caption}
        </p>
      </footer>
    </article>
  );
}

export default function HomeCenterColumn({
  posts = CENTER_DEMO_POSTS,
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

  useEffect(() => {
    dispatch(fetchFeedStories());
  }, [dispatch]);

  // Determine logged in user's story group
  const myStoryGroupIndex = feedStoryGroups.findIndex(
    (g) => currentUserId && String(g.user?._id) === String(currentUserId)
  );
  const myStoryGroup = myStoryGroupIndex >= 0 ? feedStoryGroups[myStoryGroupIndex] : null;
  const hasMyStory = Boolean(myStoryGroup && myStoryGroup.stories?.length > 0);
  // Compute hasUnseen from isViewed flags (backend doesn't set hasUnseen for own stories)
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
        <div className="mx-auto flex w-full max-w-[720px] min-w-0 flex-1 flex-col">
          <div
            role="tabpanel"
            id={`tab-panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="flex min-h-0 flex-1 flex-col gap-5 px-3 pb-28 pt-4 sm:px-5 lg:pt-6 lg:pb-6"
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

                <div className="flex flex-col gap-6">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
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
                    Explore view — data layer will be connected later.
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

export { PostCard, CENTER_DEMO_POSTS };
