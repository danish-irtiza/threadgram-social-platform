import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Menu as MenuIcon,
  PlusSquare,
  Settings as SettingsIcon,
  X,
  Grid3x3,
  Film,
  Lock,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Bell,
  Search,
  Loader2,
  UserMinus,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { cn } from "@/lib/utils.js";
import { colors, motion, radius, shadow, fontSize, letterSpacing } from "@doc/designSystem.js";
import {
  fetchProfile,
  resetProfile,
  toggleFollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  fetchFollowers,
  fetchFollowing,
  fetchUserVibes,
} from "@/redux/features/profile/profileSlice.js";
import {
  logout as logoutThunk,
  clearAuth,
  patchCurrentUser,
} from "@/redux/features/auth/authSlice.js";
import { useTheme } from "@/context/ThemeContext.jsx";
import LeftCornerNav from "@components/navigation/LeftCornerNav.jsx";
import MobileTopNav from "@components/navigation/MobileTopNav.jsx";
import SettingsPanel from "@/components/settings/SettingsPanel.jsx";
import { useCreateModal } from "@/context/CreateModalContext.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import PostCard from "@/components/post/PostCard.jsx";
import VibeCard from "@/components/post/VibeCard.jsx";
import AuthPromptModal from "@/components/model/AuthPromptModal.jsx";
import UnfollowConfirmModal from "@/components/model/UnfollowConfirmModal.jsx";
import Button from "@/components/ui/Button.jsx";

/**
 * FollowPill — pill button using reusable Button component.
 * States: accept | following | requested | followback | idle
 */
function FollowPill({ state = "idle", onClick, className, loading, size = "md" }) {
  const variantMap = {
    idle: "primary",
    followback: "primary",
    accept: "primary",
    following: "secondary",
    requested: "secondary",
  };

  const labels = {
    idle: "Follow",
    followback: "Follow Back",
    accept: "Accept",
    following: "Following",
    requested: "Requested",
  };

  const isFollowing = state === "following";

  return (
    <Button
      variant={variantMap[state] || "primary"}
      size={size}
      onClick={onClick}
      loading={loading}
      className={className}
    >
      <span>{labels[state] || "Follow"}</span>
      {isFollowing && <ChevronDown size={14} className="ml-0.5 shrink-0" />}
    </Button>
  );
}

function Avatar({ src, size = 50, ringed = false, className, fallback }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-elevated flex items-center justify-center",
        ringed &&
        "p-[2px] bg-gradient-to-br from-indigo via-pink to-yellow",
        className
      )}
      style={{ width: s, height: s }}
    >
      <div className="h-full w-full rounded-full overflow-hidden bg-surface flex items-center justify-center">
        {src ? (
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover select-none"
            draggable={false}
          />
        ) : (
          fallback || (
            <UserIcon
              className="h-1/2 w-1/2 text-muted"
              strokeWidth={1.75}
            />
          )
        )}
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-overlay/70",
        className
      )}
    />
  );
}



function FollowListModal({
  isOpen,
  onClose,
  title,
  users,
  isLoading,
  onUserClick,
  currentUserId,
  onFollowToggle,
  onAccept,
  onReject,
  loadingUserId,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    user: null,
    type: "unfollow",
  });

  if (!isOpen) return null;

  const filteredUsers = (users || []).filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(term);
    const usernameMatch = u.username?.toLowerCase().includes(term);
    return nameMatch || usernameMatch;
  });

  // Priority order: accept > following > requested > followback > idle
  const getRowState = (u) => {
    if (u.isReceivedPendingRequest) return "accept";
    if (u.isFollowing) return "following";
    if (u.isRequested) return "requested";
    if (u.isFollower) return "followback";
    return "idle";
  };

  const handlePillClick = (u, rowState) => {
    if (rowState === "following") {
      if (u.isPrivate) {
        setConfirmModal({ open: true, user: u, type: "unfollow" });
      } else {
        onFollowToggle && onFollowToggle(u);
      }
    } else if (rowState === "requested") {
      setConfirmModal({ open: true, user: u, type: "cancelRequest" });
    } else {
      // "idle" | "followback"
      onFollowToggle && onFollowToggle(u);
    }
  };

  const handleConfirmAction = async () => {
    const targetUser = confirmModal.user;
    setConfirmModal({ open: false, user: null, type: "unfollow" });
    if (targetUser) {
      await (onFollowToggle && onFollowToggle(targetUser));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface text-ink p-5 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                onClose();
              }}
              className="p-1 rounded-full text-muted hover:text-ink hover:bg-overlay cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Input */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search`}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-surface-elevated text-ink placeholder:text-muted focus:outline-none focus:border-indigo transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute cursor-pointer right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="mt-3 max-h-[340px] overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="space-y-3 pt-1">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelf =
                  currentUserId && String(currentUserId) === String(u._id);
                const rowState = getRowState(u);
                const loading = String(loadingUserId || "") === String(u._id);

                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-overlay transition-colors"
                  >
                    <div
                      onClick={() => {
                        setSearchTerm("");
                        onClose();
                        onUserClick(u.username);
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <Avatar src={u.avatar} size={40} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {u.name || u.username}
                        </p>
                        <p className="text-xs text-muted truncate">
                          @{u.username}
                        </p>
                      </div>
                    </div>
                    {!isSelf && (
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {rowState === "accept" ? (
                          <>
                            <FollowPill
                              state="accept"
                              loading={loading}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAccept && onAccept(u);
                              }}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={loading}
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject && onReject(u);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <FollowPill
                            state={rowState}
                            loading={loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePillClick(u, rowState);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-muted py-8">
                {searchTerm
                  ? `No users matching "${searchTerm}"`
                  : `No ${title.toLowerCase()} found.`}
              </p>
            )}
          </div>
        </div>
      </div>

      <UnfollowConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null, type: "unfollow" })}
        onConfirm={handleConfirmAction}
        user={confirmModal.user}
        type={confirmModal.type}
        isLoading={String(loadingUserId || "") === String(confirmModal.user?._id || "")}
      />
    </>
  );
}

function formatCount(n) {
  const v = Number.isFinite(n) ? Number(n) : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(v);
}

const DESKTOP_TABS = [
  { id: "posts", label: "Posts", Icon: Grid3x3, countKey: "postCount" },
  { id: "photos", label: "Photos", Icon: Grid3x3, countKey: "photosCount" },
  { id: "videos", label: "Videos", Icon: Film, countKey: "videosCount" },
];

const MOBILE_TABS = [
  { id: "posts", label: "Posts", Icon: Grid3x3 },
  { id: "videos", label: "Videos", Icon: Film },
];


export default function ProfilePage() {
  const { username } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { openCreate } = useCreateModal();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconCircle = isDark ? darkIconCircle : lightIconCircle;

  const isMe = pathname === "/me" || pathname === "/me/";
  const accessToken = useSelector((s) => s.auth?.accessToken) || localStorage.getItem("accessToken");
  const currentUser = useSelector((s) => s.auth?.user);
  const currentUserId = currentUser?._id;

  const { profile, isLoading, isError, error, notFound } = useSelector(
    (s) => s.profile || {}
  );

  const { vibes, vibesLoading } = useSelector((s) => s.profile || {});

  const [desktopTab, setDesktopTab] = useState("posts");
  const [mobileTab, setMobileTab] = useState("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("profile");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [listActionLoadingUserId, setListActionLoadingUserId] = useState(null);

  useEffect(() => {
    const hasToken = Boolean(accessToken);
    if (isMe && !hasToken) {
      dispatch(resetProfile());
      dispatch(clearAuth());
      navigate("/login", { replace: true });
      return;
    }
    const profileKey = isMe ? "me" : String(username || "").toLowerCase();
    const currentKey = profileKey;
    dispatch(
      fetchProfile({
        isMe,
        username: isMe ? undefined : username,
      })
    ).then(() => { });
    return () => {
      // no-op, profile key handled in redux
    };
  }, [isMe, username, accessToken, dispatch, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const retry = useCallback(() => {
    dispatch(resetProfile());
    dispatch(
      fetchProfile({
        isMe,
        username: isMe ? undefined : username,
      })
    );
  }, [dispatch, isMe, username]);

  const visiblePosts = useMemo(() => {
    const all = Array.isArray(profile?.posts) ? profile.posts : [];
    if (desktopTab === "photos") {
      return all.filter((p) => p?.mediaType === "image");
    }
    if (desktopTab === "videos") {
      return all.filter((p) => p?.mediaType === "video");
    }
    return all;
  }, [profile, desktopTab]);

  const mobileVisiblePosts = useMemo(() => {
    const all = Array.isArray(profile?.posts) ? profile.posts : [];
    if (mobileTab === "videos") {
      return all.filter((p) => p?.mediaType === "video");
    }
    return all.filter((p) => p?.mediaType === "image" || !p?.mediaType);
  }, [profile, mobileTab]);

  // When the Videos (Vibes) tab is activated, lazy-fetch vibes for this profile
  useEffect(() => {
    if ((desktopTab === "videos" || mobileTab === "videos") && profile?._id) {
      dispatch(fetchUserVibes(profile._id));
    }
  }, [desktopTab, mobileTab, profile?._id, dispatch]);

  const tabCount = (tabId) => {
    if (!profile) return 0;
    if (tabId === "videos") {
      if (Array.isArray(vibes) && vibes.length > 0) {
        return vibes.length;
      }
      return Number.isFinite(profile.vibeCount)
        ? profile.vibeCount
        : Number.isFinite(profile.videosCount)
          ? profile.videosCount
          : 0;
    }
    const key = DESKTOP_TABS.find((t) => t.id === tabId)?.countKey;
    if (!key) return profile.postCount || 0;
    const n = profile[key];
    return Number.isFinite(n) ? n : 0;
  };

  const handleOpenSettings = useCallback(() => {
    setMenuOpen(false);
    setIsSettingsOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    dispatch(logoutThunk()).then(() => {
      dispatch(resetProfile());
      navigate("/login", { replace: true });
    });
  }, [dispatch, navigate]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [followModal, setFollowModal] = useState({ open: false, type: "followers" });
  const { followersList, followingList, isListLoading } = useSelector(
    (s) => s.profile || {}
  );

  const handleOpenFollowModal = useCallback((type) => {
    if (!profile?._id) return;
    setFollowModal({ open: true, type });
    if (type === "followers") {
      dispatch(fetchFollowers(profile._id));
    } else {
      dispatch(fetchFollowing(profile._id));
    }
  }, [dispatch, profile]);

  // Derived relationship state — declared BEFORE any handlers that reference it
  // (prevents JS Temporal Dead Zone reference error when useCallback deps read it)
  const followState = useMemo(() => {
    if (!profile) return "idle";
    // Priority order: accept > following > requested > followback > idle
    if (profile.isReceivedPendingRequest) return "accept";
    if (profile.isFollowing) return "following";
    if (profile.isRequested) return "requested";
    if (profile.isFollower) return "followback";
    return "idle";
  }, [profile]);

  const isOwner = !!profile?.isOwner;
  const postsRestricted = !!profile?.postsRestricted;

  const handleFollowToggle = useCallback(async () => {
    if (!accessToken) {
      setAuthPromptOpen(true);
      return;
    }
    if (!profile?._id) return;
    console.log(
      `[ProfilePage] handleFollowToggle` +
      ` isFollowing=${profile.isFollowing} isRequested=${profile.isRequested}` +
      ` followState=${followState}`
    );
    setFollowLoading(true);
    try {
      const result = await dispatch(
        toggleFollowUser({
          userId: profile._id,
          isFollowing: profile.isFollowing,
          isRequested: profile.isRequested,
        })
      ).unwrap();
      const viewerFollowingCount = result?.data?.data?.viewerFollowingCount;
      if (typeof viewerFollowingCount === "number") {
        console.log(
          `[ProfilePage] patching auth.user followingCount -> ${viewerFollowingCount}`
        );
        dispatch(patchCurrentUser({ followingCount: viewerFollowingCount }));
      }
    } catch (err) {
      console.error("[ProfilePage] handleFollowToggle error:", err);
    } finally {
      setFollowLoading(false);
    }
  }, [accessToken, dispatch, profile, followState]);

  const [profileConfirmModal, setProfileConfirmModal] = useState({
    open: false,
    type: "unfollow",
  });

  const onProfileFollowButtonClick = useCallback(() => {
    if (!accessToken) {
      setAuthPromptOpen(true);
      return;
    }
    if (followState === "following") {
      if (profile?.isPrivate) {
        setProfileConfirmModal({ open: true, type: "unfollow" });
      } else {
        handleFollowToggle();
      }
    } else if (followState === "requested") {
      setProfileConfirmModal({ open: true, type: "cancelRequest" });
    } else {
      handleFollowToggle();
    }
  }, [accessToken, followState, handleFollowToggle, profile?.isPrivate]);

  const handleConfirmProfileUnfollow = useCallback(async () => {
    setProfileConfirmModal((prev) => ({ ...prev, open: false }));
    await handleFollowToggle();
  }, [handleFollowToggle]);

  const handleAcceptRequest = useCallback(async () => {
    if (!accessToken) {
      setAuthPromptOpen(true);
      return;
    }
    if (!profile?._id) return;
    console.log(`[ProfilePage] handleAcceptRequest requester=${profile._id}`);
    setAcceptLoading(true);
    try {
      const result = await dispatch(
        acceptFollowRequest({ requesterId: profile._id })
      ).unwrap();
      const ownerFollowerCount = result?.data?.data?.ownerFollowerCount;
      if (typeof ownerFollowerCount === "number") {
        console.log(
          `[ProfilePage] patching auth.user followerCount -> ${ownerFollowerCount}`
        );
        dispatch(patchCurrentUser({ followerCount: ownerFollowerCount }));
      }
    } catch (err) {
      console.error("[ProfilePage] handleAcceptRequest error:", err);
    } finally {
      setAcceptLoading(false);
    }
  }, [accessToken, dispatch, profile?._id]);

  const handleRejectRequest = useCallback(async () => {
    if (!accessToken) {
      setAuthPromptOpen(true);
      return;
    }
    if (!profile?._id) return;
    console.log(`[ProfilePage] handleRejectRequest requester=${profile._id}`);
    setRejectLoading(true);
    try {
      await dispatch(rejectFollowRequest({ requesterId: profile._id })).unwrap();
    } catch (err) {
      console.error("[ProfilePage] handleRejectRequest error:", err);
    } finally {
      setRejectLoading(false);
    }
  }, [accessToken, dispatch, profile?._id]);

  const handleMessage = useCallback(() => {
    if (!profile) return;
    console.info("[demo] open message with:", profile.username);
  }, [profile]);

  // List-row action handlers for Followers / Following modal rows
  const handleListRowFollowToggle = useCallback(
    async (user) => {
      if (!accessToken || !user?._id) return;
      setListActionLoadingUserId(user._id);
      try {
        const result = await dispatch(
          toggleFollowUser({
            userId: user._id,
            isFollowing: !!user.isFollowing,
            isRequested: !!user.isRequested,
          })
        ).unwrap();
        const viewerFollowingCount = result?.data?.data?.viewerFollowingCount;
        if (typeof viewerFollowingCount === "number") {
          dispatch(patchCurrentUser({ followingCount: viewerFollowingCount }));
        }
      } catch (err) {
        console.error(`[ProfilePage] list follow toggle failed for ${user._id}:`, err);
      } finally {
        setListActionLoadingUserId(null);
      }
    },
    [accessToken, dispatch]
  );

  const handleListRowAccept = useCallback(
    async (user) => {
      if (!accessToken || !user?._id) return;
      setListActionLoadingUserId(user._id);
      try {
        const result = await dispatch(
          acceptFollowRequest({ requesterId: user._id })
        ).unwrap();
        const ownerFollowerCount = result?.data?.data?.ownerFollowerCount;
        if (typeof ownerFollowerCount === "number") {
          dispatch(patchCurrentUser({ followerCount: ownerFollowerCount }));
        }
      } catch (err) {
        console.error(`[ProfilePage] list accept failed for ${user._id}:`, err);
      } finally {
        setListActionLoadingUserId(null);
      }
    },
    [accessToken, dispatch]
  );

  const handleListRowReject = useCallback(
    async (user) => {
      if (!accessToken || !user?._id) return;
      setListActionLoadingUserId(user._id);
      try {
        await dispatch(rejectFollowRequest({ requesterId: user._id })).unwrap();
      } catch (err) {
        console.error(`[ProfilePage] list reject failed for ${user._id}:`, err);
      } finally {
        setListActionLoadingUserId(null);
      }
    },
    [accessToken, dispatch]
  );

  return (
    <div
      className={cn(
        "relative min-h-screen w-full bg-paper text-ink lg:pl-[72px] xl:pl-[84px]"
      )}
      style={{
        fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <LeftCornerNav
        activeId={activeNav}
        onChange={(id) => {
          if (id === "create") {
            openCreate("post");
            return;
          }
          setActiveNav(id);
          if (id === "home") navigate("/", { replace: false });
          else if (id === "reels") navigate("/reels", { replace: false });
          else if (id === "search") navigate("/search", { replace: false });
          else if (id === "profile") navigate("/me", { replace: false });
        }}
      />

      <MobileTopNav
        onStoryCreateClick={() => openCreate("story")}
        onNotificationsClick={() => console.info("[demo] notifications clicked")}
      />

      <main className="mx-auto w-full max-w-[1200px] pt-14 lg:pt-6 pb-20 lg:pb-10 px-4 sm:px-6 xl:px-8">
        <section className="w-full">

          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-14 z-30 -mx-4 sm:-mx-6 mb-2">
            <div
              className={cn(
                "grid grid-cols-3 items-center px-3 sm:px-4 py-2.5 border-b border-border bg-paper/90 backdrop-blur-[12px]"
              )}
              style={{ boxShadow: shadow.sm }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl text-text-subtle hover:text-ink hover:bg-overlay transition-all duration-120 ease-out active:scale-[0.96]"
                  )}
                  aria-label="Back"
                >
                  <ChevronLeft size={20} strokeWidth={2.1} />
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-ink hover:text-text-subtle transition-colors"
                  onClick={() => console.info("[demo] profile picker clicked")}
                >
                  <span
                    className="truncate max-w-[40vw]"
                    style={{
                      fontSize: fontSize.h3[0],
                      lineHeight: fontSize.h3[1],
                      letterSpacing: "-0.01em",
                      fontWeight: 700,
                    }}
                  >
                    {profile?.username ? `@${profile.username}` : "Profile"}
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-center" />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => console.info("[demo] mobile create clicked")}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl text-text-subtle hover:text-ink hover:bg-overlay transition-all duration-120 ease-out active:scale-[0.96]"
                  )}
                  aria-label="Create"
                >
                  <PlusSquare size={20} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl text-text-subtle hover:text-ink hover:bg-overlay transition-all duration-120 ease-out active:scale-[0.96]"
                  )}
                  aria-label="Open menu"
                >
                  <MenuIcon size={20} strokeWidth={2.1} />
                </button>
              </div>
            </div>
          </header>

          {/* Desktop main header row */}
          <div className="hidden lg:block relative z-10 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-6 flex-1 min-w-0">
                <Avatar
                  src={profile?.avatar || iconCircle}
                  size={120}
                  ringed
                  className={cn(
                    "shadow-[0_0_0_3px_rgba(107,91,255,0.12)]",
                    isLoading && "opacity-70"
                  )}
                />
                <div className="flex-1 min-w-0 pt-2">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-64 rounded-lg" />
                      <Skeleton className="h-5 w-40 rounded-lg" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                  ) : notFound ? null : isError ? null : (
                    <>
                      <div className="flex items-center gap-2">
                        <h1
                          className={cn("truncate")}
                          style={{
                            fontSize: fontSize.h2[0],
                            lineHeight: fontSize.h2[1],
                            letterSpacing: letterSpacing.h2,
                            fontWeight: 700,
                          }}
                        >
                          {profile?.name || "Untitled"}
                        </h1>
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-white shrink-0"
                          style={{ backgroundColor: colors.indigo.DEFAULT }}
                          aria-label="Verified"
                        >
                          <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3">
                            <path
                              fill="currentColor"
                              d="M13.03 4.22a.75.75 0 0 0-1.06-1.06L6.5 8.63 4.03 6.16a.75.75 0 0 0-1.06 1.06l2.999 3a.75.75 0 0 0 1.06 0l6.002-6z"
                            />
                          </svg>
                        </span>
                      </div>
                      <p
                        className="mt-1 text-muted"
                        style={{
                          fontSize: fontSize.body[0],
                          lineHeight: fontSize.body[1],
                        }}
                      >
                        @{profile?.username || "handle"}
                      </p>
                      {profile?.bio ? (
                        <p
                          className="mt-3 max-w-[640px] text-text-subtle whitespace-pre-wrap break-words"
                          style={{
                            fontSize: fontSize.body[0],
                            lineHeight: fontSize.body[1],
                          }}
                        >
                          {profile.bio}
                        </p>
                      ) : null}
                      <div
                        className={cn(
                          "mt-4 grid max-w-[260px] grid-cols-2 gap-2 rounded-xl border border-border bg-surface/60 p-3"
                        )}
                        style={{ boxShadow: shadow.sm }}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenFollowModal("followers")}
                          className="text-left hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <div
                            className="text-ink"
                            style={{
                              fontSize: fontSize.h3[0],
                              lineHeight: fontSize.h3[1],
                              fontWeight: 700,
                            }}
                          >
                            {formatCount(profile?.followerCount)}
                          </div>
                          <div
                            className="text-muted"
                            style={{
                              fontSize: fontSize.small[0],
                              lineHeight: fontSize.small[1],
                            }}
                          >
                            Followers
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenFollowModal("following")}
                          className="text-left hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <div
                            className="text-ink"
                            style={{
                              fontSize: fontSize.h3[0],
                              lineHeight: fontSize.h3[1],
                              fontWeight: 700,
                            }}
                          >
                            {formatCount(profile?.followingCount)}
                          </div>
                          <div
                            className="text-muted"
                            style={{
                              fontSize: fontSize.small[0],
                              lineHeight: fontSize.small[1],
                            }}
                          >
                            Following
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col items-end gap-3 min-w-[180px]">
                {isLoading ? (
                  <Skeleton className="h-10 w-40 rounded-xl" />
                ) : isOwner ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleOpenSettings}
                    >
                      <SettingsIcon size={16} strokeWidth={2} />
                      <span>Settings</span>
                    </Button>
                  </div>
                ) : profile ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleMessage}
                    >
                      Message
                    </Button>
                    {followState === "accept" ? (
                      <>
                        <FollowPill
                          state="accept"
                          onClick={handleAcceptRequest}
                          loading={acceptLoading}
                        />
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={handleRejectRequest}
                          loading={rejectLoading}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <FollowPill
                        state={followState}
                        onClick={onProfileFollowButtonClick}
                        loading={followLoading}
                      />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Mobile profile header (stats-above-bio layout) */}
          <section className="lg:hidden">
            {isLoading ? (
              <div className="pt-2 flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-[100px] w-[100px] rounded-full" />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                  </div>
                </div>
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : notFound ? null : isError ? null : profile ? (
              <>
                <div className="flex items-start gap-4 pt-2">
                  <Avatar
                    src={profile.avatar || iconCircle}
                    size={92}
                    ringed
                  />
                  <div className="flex-1 min-w-0 pt-1 grid grid-cols-3 gap-2 text-center">
                    {[
                      { k: "postCount", label: "Posts", onClick: () => setMobileTab("posts") },
                      { k: "followerCount", label: "Followers", onClick: () => handleOpenFollowModal("followers") },
                      { k: "followingCount", label: "Following", onClick: () => handleOpenFollowModal("following") },
                    ].map(({ k, label, onClick }) => (
                      <button
                        key={k}
                        type="button"
                        onClick={onClick}
                        className={cn(
                          "rounded-xl border border-border bg-surface/60 py-2 transition-all duration-120 ease-out hover:bg-overlay active:scale-[0.98] cursor-pointer"
                        )}
                      >
                        <div
                          className="text-ink"
                          style={{
                            fontSize: fontSize.h2[0],
                            lineHeight: "1.05",
                            fontWeight: 700,
                            letterSpacing: letterSpacing.h2,
                          }}
                        >
                          {formatCount(profile[k] ?? 0)}
                        </div>
                        <div
                          className="mt-1 text-muted"
                          style={{
                            fontSize: fontSize.small[0],
                            lineHeight: fontSize.small[1],
                          }}
                        >
                          {label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5">
                  <div
                    className="text-ink"
                    style={{
                      fontSize: fontSize.h2[0],
                      lineHeight: fontSize.h2[1],
                      letterSpacing: letterSpacing.h2,
                      fontWeight: 700,
                    }}
                  >
                    {profile?.name || "Untitled"}
                  </div>
                  {profile?.bio ? (
                    <p
                      className="mt-2 text-text-subtle whitespace-pre-wrap break-words"
                      style={{
                        fontSize: fontSize.body[0],
                        lineHeight: fontSize.body[1],
                      }}
                    >
                      {profile.bio}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center gap-2">
                    {isOwner ? (
                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleOpenSettings}
                        className="flex-1"
                      >
                        <SettingsIcon size={16} strokeWidth={2} />
                        <span>Settings</span>
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={handleMessage}
                          className="flex-1"
                        >
                          Message
                        </Button>
                        {followState === "accept" ? (
                          <>
                            <FollowPill
                              state="accept"
                              onClick={handleAcceptRequest}
                              loading={acceptLoading}
                              className="flex-1"
                            />
                            <Button
                              variant="secondary"
                              size="md"
                              onClick={handleRejectRequest}
                              loading={rejectLoading}
                              className="shrink-0"
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <FollowPill
                            state={followState}
                            onClick={onProfileFollowButtonClick}
                            loading={followLoading}
                            className="flex-1"
                          />
                        )}
                      </>
                    )}
                    {!isOwner && profile.isPrivate ? (
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted bg-surface/70"
                        title="Private account"
                      >
                        <Lock size={16} />
                      </span>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </section>

          {/* Tabs - Desktop */}
          <div className="hidden lg:block mt-2 border-t border-border pt-3">
            <div className="flex items-center gap-2 px-1 flex-wrap">
              {DESKTOP_TABS.map(({ id, label, countKey }) => {
                const active = desktopTab === id;
                const count = tabCount(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDesktopTab(id)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-xl px-4 h-10 transition-all duration-120 ease-out active:scale-[0.98]",
                      active
                        ? "text-ink bg-overlay-hover font-semibold"
                        : "text-muted hover:text-ink hover:bg-overlay font-medium"
                    )}
                    aria-pressed={active}
                  >
                    <span
                      style={{
                        fontSize: fontSize.body[0],
                        letterSpacing: "0.005em",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-[24px] items-center justify-center rounded-full px-2 text-[12px] font-semibold",
                        active
                          ? "bg-indigo text-white"
                          : "bg-overlay-hover text-muted"
                      )}
                    >
                      {formatCount(count)}
                    </span>
                    {active ? (
                      <span
                        className="absolute left-3 right-3 -bottom-3 h-[2px] rounded-full"
                        style={{ backgroundColor: colors.indigo.DEFAULT }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs - Mobile */}
          <div className="lg:hidden mt-5 border-t border-border">
            <div className="grid grid-cols-2">
              {MOBILE_TABS.map(({ id, label, Icon }) => {
                const active = mobileTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobileTab(id)}
                    aria-pressed={active}
                    className={cn(
                      "relative h-12 flex items-center justify-center gap-2 transition-all duration-120 ease-out",
                      active
                        ? "text-ink font-semibold"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    <Icon size={18} strokeWidth={2} />
                    <span style={{ fontSize: fontSize.small[0] }}>{label}</span>
                    {active ? (
                      <span
                        className="absolute left-6 right-6 -bottom-px h-[2px] rounded-full"
                        style={{ backgroundColor: colors.indigo.DEFAULT }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="mt-6 lg:mt-8">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden border border-border bg-surface/40">
                    <Skeleton className="h-[240px] w-full rounded-none" />
                    <Skeleton className="mx-3 my-3 h-8 rounded-full w-32" />
                  </div>
                ))}
              </div>
            ) : notFound ? (
              <EmptyState
                icon={<UserIcon size={22} strokeWidth={2} />}
                title="User not found"
                subtitle="The profile you are looking for doesn't exist or has been removed."
                actionLabel="Go to Home"
                onAction={() => navigate("/", { replace: true })}
              />
            ) : isError ? (
              <EmptyState
                title="Couldn't load profile"
                subtitle={error?.message || "Something went wrong on our end."}
                actionLabel="Retry"
                onAction={retry}
              />
            ) : (!accessToken || profile?.isGuest) ? (
              <div className="mx-auto my-6 w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface p-6 text-center shadow-xl animate-in fade-in duration-200">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-soft/60 text-indigo ring-4 ring-indigo/20">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <UserIcon size={32} />
                  )}
                </div>
                <h3 className="text-base font-bold text-ink">Want to see this?</h3>
                <p className="mt-1.5 text-xs text-text-subtle leading-relaxed">
                  Log in or sign up to see photos, videos, and updates from @{profile?.username || "this user"}.
                </p>
                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full rounded-xl bg-indigo py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="w-full rounded-xl border border-border bg-paper py-2.5 text-xs font-semibold text-ink hover:bg-surface-elevated transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            ) : postsRestricted ? (
              <EmptyState
                icon={<Lock size={22} strokeWidth={2} />}
                title="This account is private"
                subtitle="Follow to see their posts."
                actionLabel={
                  isOwner
                    ? undefined
                    : followState === "requested"
                      ? "Requested"
                      : followState === "followback"
                        ? "Follow Back"
                        : followState === "accept"
                          ? "Accept"
                          : "Follow"
                }
                onAction={
                  isOwner
                    ? undefined
                    : followState === "accept"
                      ? handleAcceptRequest
                      : handleFollowToggle
                }
              />
            ) : (desktopTab === "videos" || mobileTab === "videos") ? (
              vibesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-72 w-full rounded-2xl" />
                </div>
              ) : Array.isArray(vibes) && vibes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                  {vibes.map((vibe, idx) => (
                    <VibeCard
                      key={String(vibe?._id || Math.random())}
                      vibe={vibe}
                      vibesList={vibes}
                      vibeIndex={idx}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Film size={22} strokeWidth={2} />}
                  title="No vibes yet"
                  subtitle={
                    isOwner
                      ? "Share your first short video vibe!"
                      : `${profile?.name || "This user"} hasn't shared any vibes yet.`
                  }
                  actionLabel={isOwner ? "Create Vibe" : undefined}
                  onAction={isOwner ? () => openCreate("vibe") : undefined}
                />
              )
            ) : Array.isArray(profile?.posts) && profile.posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                subtitle={
                  isOwner
                    ? "Create your first post to start your feed."
                    : `${profile?.name || "This user"} hasn't posted anything yet.`
                }
                actionLabel={isOwner ? "Create Post" : undefined}
                onAction={
                  isOwner
                    ? () => openCreate("post")
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                {visiblePosts.map((post, index) => (
                  <PostCard
                    key={String(post?._id || Math.random())}
                    post={post}
                    postsList={visiblePosts}
                    postIndex={index}
                  />
                ))}
                {visiblePosts.length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      title={`No ${desktopTab} yet`}
                      subtitle="Nothing to show here yet."
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Mobile 3-line sheet */}
      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Profile menu"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={cn(
              "absolute right-0 top-0 h-full w-[82%] max-w-[360px] bg-paper border-l border-border shadow-lg flex flex-col"
            )}
            style={{
              animation: "slideIn 180ms ease-out",
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
            }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar src={profile?.avatar || iconCircle} size={34} ringed />
                <div className="min-w-0">
                  <div
                    className="truncate text-ink"
                    style={{
                      fontSize: fontSize.body[0],
                      lineHeight: fontSize.body[1],
                      fontWeight: 600,
                    }}
                  >
                    {profile?.name || "Profile"}
                  </div>
                  <div
                    className="truncate text-muted"
                    style={{
                      fontSize: fontSize.small[0],
                      lineHeight: fontSize.small[1],
                    }}
                  >
                    @{profile?.username || "handle"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl text-text-subtle hover:text-ink hover:bg-overlay cursor-pointer transition-all duration-120 ease-out active:scale-[0.96]"
                )}
              >
                <X size={18} strokeWidth={2.1} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
              <SheetRow
                icon={<SettingsIcon size={18} strokeWidth={2} />}
                label="Settings"
                onClick={handleOpenSettings}
                highlight
              />
              <SheetRow
                icon={
                  <Bell size={18} strokeWidth={2} />
                }
                label="Notifications"
                onClick={() => {
                  setMenuOpen(false);
                  console.info("[demo] notifications clicked");
                }}
              />
              <SheetRow
                icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
                label={isDark ? "Light mode" : "Dark mode"}
                onClick={() => {
                  setMenuOpen(false);
                  toggleTheme();
                }}
              />
              <div className="my-2 mx-3 h-px bg-border" />
              <SheetRow
                icon={<LogOut size={18} strokeWidth={2} />}
                label="Log out"
                onClick={handleLogout}
                danger
              />
            </nav>
          </div>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0.4; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </div>
      ) : null}

      {/* Settings Modal Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Followers / Following List Modal */}
      <FollowListModal
        isOpen={followModal.open}
        onClose={() => setFollowModal({ open: false, type: "followers" })}
        title={followModal.type === "followers" ? "Followers" : "Following"}
        users={followModal.type === "followers" ? followersList : followingList}
        isLoading={isListLoading}
        currentUserId={currentUserId}
        onFollowToggle={handleListRowFollowToggle}
        onAccept={handleListRowAccept}
        onReject={handleListRowReject}
        loadingUserId={listActionLoadingUserId}
        onUserClick={(uname) => {
          setFollowModal({ open: false, type: "followers" });
          navigate(`/${encodeURIComponent(uname)}`);
        }}
      />

      {/* Profile Unfollow / Cancel Confirmation Modal */}
      <UnfollowConfirmModal
        isOpen={profileConfirmModal.open}
        onClose={() => setProfileConfirmModal((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirmProfileUnfollow}
        user={profile}
        type={profileConfirmModal.type}
        isLoading={followLoading}
      />

      {/* Auth Prompt Modal (for unauthenticated guests) */}
      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        targetUser={profile}
      />
    </div>
  );
}

function SheetRow({ icon, label, onClick, highlight, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 h-11 transition-all duration-120 ease-out active:scale-[0.99] text-left",
        highlight
          ? "bg-yellow/10 text-yellow border border-yellow/30 hover:bg-yellow/20"
          : danger
            ? "text-error hover:bg-error-soft"
            : "text-ink hover:bg-overlay"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg",
          highlight
            ? "bg-yellow/20 text-yellow"
            : danger
              ? "bg-error-soft text-error"
              : "bg-overlay text-muted"
        )}
      >
        {icon}
      </span>
      <span
        className="font-medium"
        style={{
          fontSize: fontSize.body[0],
          lineHeight: fontSize.body[1],
        }}
      >
        {label}
      </span>
    </button>
  );
}



function MobilePostThumb({ post, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square overflow-hidden bg-surface-elevated border-b border-r last:border-r-0 even:border-r border-border text-left"
    >
      {post?.media ? (
        <img
          src={post.media}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <PlaceholderMedia mediaType={post?.mediaType} />
      )}
      {post?.mediaType === "video" ? (
        <div className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur-[2px]">
          <Film size={12} strokeWidth={2} />
        </div>
      ) : null}
    </button>
  );
}

function PlaceholderMedia({ mediaType }) {
  const isVideo = mediaType === "video";
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(107,91,255,0.20) 0%, rgba(255,92,114,0.16) 50%, rgba(255,210,77,0.16) 100%)",
      }}
    >
      <div
        className={cn(
          "grid h-14 w-14 place-items-center rounded-2xl bg-surface/70 border border-border text-muted"
        )}
      >
        {isVideo ? (
          <Film size={24} strokeWidth={2} />
        ) : (
          <Grid3x3 size={24} strokeWidth={2} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-border bg-surface/60 py-10 px-6 text-center">
      {icon ? (
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-overlay text-muted">
          {icon}
        </div>
      ) : null}
      <div
        className="text-ink"
        style={{
          fontSize: fontSize.h3[0],
          lineHeight: fontSize.h3[1],
          fontWeight: 700,
          letterSpacing: letterSpacing.h3,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <p
          className="mt-2 mx-auto max-w-[360px] text-muted"
          style={{
            fontSize: fontSize.body[0],
            lineHeight: fontSize.body[1],
          }}
        >
          {subtitle}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "mt-5 h-10 inline-flex items-center justify-center rounded-full px-5 text-[14px] font-semibold text-white transition-all duration-120 ease-out active:scale-[0.98]"
          )}
          style={{
            backgroundColor: colors.indigo.DEFAULT,
            boxShadow: shadow.button,
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
