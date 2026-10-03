import React, { useEffect, useState, useCallback } from "react";
import { Bell, LogOut, Moon, Plus, Sun, Loader2, ChevronDown } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { useTheme } from "@/context/ThemeContext.jsx";
import { logout as logoutThunk, patchCurrentUser } from "@/redux/features/auth/authSlice.js";
import api from "@/api/axios.js";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import darkIconCircle from "@/assets/logo/thread-icon-circle-darkmode-removebg-preview.png";
import lightWordmark from "@/assets/logo/thredgram-wordmark-light-theme-removebg-preview.png";
import darkWordmark from "@/assets/logo/thredgram-wordmark-dark-theme-removebg-preview.png";
import UnfollowConfirmModal from "@/components/model/UnfollowConfirmModal.jsx";
import Button from "@/components/ui/Button.jsx";

function FollowPill({ state = "idle", onClick, className, loading }) {
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
      size="sm"
      onClick={onClick}
      loading={loading}
      className={cn("min-w-[92px]", className)}
    >
      <span>{labels[state] || "Follow"}</span>
      {isFollowing && <ChevronDown size={14} className="ml-0.5 shrink-0" />}
    </Button>
  );
}

function Avatar({ src, size = 50, ringed = false, className }) {
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
      <div className="h-full w-full rounded-full overflow-hidden bg-surface">
        <img
          src={src || lightIconCircle}
          alt=""
          className="h-full w-full object-cover select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}



export default function HomeLeftSidebar({ className }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((state) => state.auth);

  const isDark = resolvedTheme === "dark";
  const iconCircle = isDark ? darkIconCircle : lightIconCircle;
  const wordmark = isDark ? darkWordmark : lightWordmark;

  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    user: null,
    type: "unfollow",
  });

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      setLoadingSuggestions(true);
      const res = await api.get("/users/suggest?limit=5");
      const users = res.data?.data?.users || [];
      const mapped = users.map((u) => {
        // Priority order: accept > mutual (message) > following > requested > followback > idle
        let followState = "idle";
        if (u.isReceivedPendingRequest) followState = "accept";
        else if (u.isFollowing && u.isFollower) followState = "message";
        else if (u.isFollowing) followState = "following";
        else if (u.isRequested) followState = "requested";
        else if (u.isFollower) followState = "followback";
        console.log(
          `[Suggestions] user=${u.username}` +
          ` isFollower=${u.isFollower} isFollowing=${u.isFollowing}` +
          ` isRequested=${u.isRequested} isReceivedPendingRequest=${u.isReceivedPendingRequest}` +
          ` → followState=${followState}`
        );
        return { ...u, followState };
      });
      setSuggestedUsers(mapped);
    } catch (err) {
      console.error("Error fetching suggested users:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  const executeFollowToggle = async (user) => {
    const userId = user._id;
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (user.followState === "idle" || user.followState === "followback") {
        // Follow / Follow Back → POST /follow/:id/follow
        console.log(`[Suggestions] ${user.followState.toUpperCase()} -> user=${user.username}`);
        const res = await api.post(`/follow/${userId}/follow`);
        const status = res.data?.data?.followStatus;
        const viewerFollowingCount = res.data?.data?.viewerFollowingCount;
        setSuggestedUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, followState: status === "pending" ? "requested" : "following" }
              : u
          )
        );
        // Patch auth.user.followingCount on accepted or even pending (viewer's outgoing side)
        if (typeof viewerFollowingCount === "number") {
          dispatch(patchCurrentUser({ followingCount: viewerFollowingCount }));
        }
      } else if (user.followState === "following") {
        console.log(`[Suggestions] UNFOLLOW -> user=${user.username}`);
        const res = await api.delete(`/follow/${userId}/unfollow`);
        const viewerFollowingCount = res.data?.data?.viewerFollowingCount;
        setSuggestedUsers((prev) => {
          const target = prev.find((u) => u._id === userId);
          const afterUnfollow = target?.isFollower ? "followback" : "idle";
          return prev.map((u) =>
            u._id === userId ? { ...u, followState: afterUnfollow, isFollowing: false } : u
          );
        });
        if (typeof viewerFollowingCount === "number") {
          dispatch(patchCurrentUser({ followingCount: viewerFollowingCount }));
        }
      } else if (user.followState === "requested") {
        console.log(`[Suggestions] CANCEL request -> user=${user.username}`);
        await api.delete(`/follow/${userId}/cancel`);
        setSuggestedUsers((prev) => {
          const target = prev.find((u) => u._id === userId);
          const afterCancel = target?.isFollower ? "followback" : "idle";
          return prev.map((u) =>
            u._id === userId ? { ...u, followState: afterCancel, isRequested: false } : u
          );
        });
      } else if (user.followState === "accept") {
        console.log(`[Suggestions] ACCEPT incoming request -> user=${user.username}`);
        const res = await api.post(`/follow/${userId}/accept`);
        const ownerFollowerCount = res.data?.data?.ownerFollowerCount;
        setSuggestedUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, followState: "message", isFollowing: true, isFollower: true, isReceivedPendingRequest: false }
              : u
          )
        );
        if (typeof ownerFollowerCount === "number") {
          dispatch(patchCurrentUser({ followerCount: ownerFollowerCount }));
        }
      } else if (user.followState === "message") {
        navigate(`/${user.username}`);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleFollowToggle = (user) => {
    if (user.followState === "following") {
      if (user.isPrivate) {
        setConfirmModal({ open: true, user, type: "unfollow" });
      } else {
        executeFollowToggle(user);
      }
    } else if (user.followState === "requested") {
      setConfirmModal({ open: true, user, type: "cancelRequest" });
    } else {
      executeFollowToggle(user);
    }
  };

  const handleConfirmAction = async () => {
    const target = confirmModal.user;
    setConfirmModal({ open: false, user: null, type: "unfollow" });
    if (target) {
      await executeFollowToggle(target);
    }
  };

  const handleLogout = () => {
    dispatch(logoutThunk());
    navigate("/login");
  };

  const displayUser = authUser || {
    username: "user",
    name: "User",
    avatar: iconCircle,
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex h-full w-[280px] shrink-0 flex-col gap-6 px-4 py-5 xl:w-[300px] xl:px-6",
        className
      )}
    >
      <div className="flex items-center justify-between px-1">
        <a
          href="/"
          className="group flex items-center"
          aria-label="Threadgram"
        >
          <img
            src={iconCircle}
            alt=""
            className="h-10 w-10 shrink-0 select-none drop-shadow-[0_2px_10px_rgba(107,91,255,0.35)] transition-transform duration-120 ease-out group-hover:scale-[1.03]"
            draggable={false}
          />
          <img
            src={wordmark}
            alt="Threadgram"
            className="h-8 shrink-0 select-none -ml-2 opacity-100 brightness-110 contrast-125 transition-transform duration-120 ease-out group-hover:scale-[1.02] filter"
            draggable={false}
          />
        </a>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-all duration-120 ease-out hover:bg-overlay-hover hover:text-ink"
            )}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>
          <button
            type="button"
            className={cn(
              "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-all duration-120 ease-out hover:bg-overlay-hover hover:text-ink"
            )}
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-overlay p-2 transition-colors duration-120 ease-out hover:border-border">
        <button
          type="button"
          onClick={() => navigate("/me")}
          className="group flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer transition-opacity hover:opacity-90"
        >
          <Avatar src={displayUser.avatar || iconCircle} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-5 text-ink group-hover:underline">
              @{displayUser.username}
            </p>
            <p className="truncate text-[13px] leading-5 text-text-subtle">
              {displayUser.name}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold leading-4 text-indigo transition-colors duration-120 ease-out hover:bg-indigo-soft hover:text-indigo cursor-pointer"
        >
          <span className="hidden sm:inline">Log Out</span>
          <LogOut className="sm:hidden" size={14} strokeWidth={2} />
        </button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <header className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-text-subtle">
            Suggested Users
          </h2>
          <button
            type="button"
            onClick={fetchSuggestedUsers}
            className="text-[12px] cursor-pointer font-semibold leading-4 text-indigo transition-colors duration-120 ease-out hover:text-indigo-hover"
          >
            Refresh
          </button>
        </header>

        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8 text-text-subtle">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : suggestedUsers.length === 0 ? (
            <p className="px-2  text-[13px] text-text-subtle py-4">No suggestions right now.</p>
          ) : (
            suggestedUsers.map((user) => (
              <li key={user._id}>
                <div className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-120 ease-out hover:bg-overlay">
                  <button
                    type="button"
                    onClick={() => navigate(`/${user.username}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar src={user.avatar} className={`cursor-pointer`} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate cursor-pointer text-[14px] font-semibold leading-5 text-ink hover:underline">
                        @{user.username}
                      </p>
                      <p className="truncate text-[13px] leading-5 text-text-subtle">
                        {user.name}
                      </p>
                    </div>
                  </button>
                  <FollowPill
                    state={user.followState}
                    className={`cursor-pointer`}
                    loading={!!actionLoading[user._id]}
                    onClick={() => handleFollowToggle(user)}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <footer className="space-y-2 px-1 pb-1 text-[11px] leading-4 text-muted">
        <p className="tracking-[0.01em]">
          © {new Date().getFullYear()} Threadgram · Terms · Privacy
        </p>
      </footer>

      <UnfollowConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, user: null, type: "unfollow" })}
        onConfirm={handleConfirmAction}
        user={confirmModal.user}
        type={confirmModal.type}
        isLoading={confirmModal.user ? !!actionLoading[confirmModal.user._id] : false}
      />
    </aside>
  );
}

export { Avatar, FollowPill };

