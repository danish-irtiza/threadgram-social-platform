import React, { useEffect, useState, useCallback } from "react";
import { Bell, LogOut, Moon, Plus, Sun, Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils.js";
import { useTheme } from "@/context/ThemeContext.jsx";
import { logout as logoutThunk } from "@/redux/features/auth/authSlice.js";
import api from "@/api/axios.js";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import darkIconCircle from "@/assets/logo/thread-icon-circle-darkmode-removebg-preview.png";
import lightWordmark from "@/assets/logo/thredgram-wordmark-light-theme-removebg-preview.png";
import darkWordmark from "@/assets/logo/thredgram-wordmark-dark-theme-removebg-preview.png";

function FollowPill({ state = "idle", onClick, className, loading }) {
  const tokens = {
    idle: "bg-indigo hover:bg-indigo-hover text-white shadow-[0_6px_16px_-6px_rgba(107,91,255,0.50)]",
    following:
      "bg-overlay hover:bg-overlay-hover text-ink border border-border",
    requested:
      "bg-overlay hover:bg-overlay-hover text-ink border border-border",
  };
  const label =
    state === "idle"
      ? "Follow"
      : state === "following"
        ? "Following"
        : "Requested";

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "h-8 min-w-[96px] shrink-0 rounded-full px-4 text-[13px] font-semibold leading-5 transition-all duration-120 ease-out active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50",
        tokens[state] || tokens.idle,
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        label
      )}
    </button>
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

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      setLoadingSuggestions(true);
      const res = await api.get("/users/suggest?limit=5");
      const users = res.data?.data?.users || [];
      setSuggestedUsers(
        users.map((u) => ({
          ...u,
          followState: u.isFollowing ? "following" : u.isRequested ? "requested" : "idle",
        }))
      );
    } catch (err) {
      console.error("Error fetching suggested users:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestedUsers();
  }, [fetchSuggestedUsers]);

  const handleFollowToggle = async (user) => {
    const userId = user._id;
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (user.followState === "idle") {
        const res = await api.post(`/follow/${userId}/follow`);
        const status = res.data?.data?.followStatus;
        setSuggestedUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, followState: status === "pending" ? "requested" : "following" }
              : u
          )
        );
      } else if (user.followState === "following") {
        await api.delete(`/follow/${userId}/unfollow`);
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, followState: "idle" } : u))
        );
      } else if (user.followState === "requested") {
        await api.delete(`/follow/${userId}/cancel`);
        setSuggestedUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, followState: "idle" } : u))
        );
      }
    } catch (err) {
      console.error("Follow action failed:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
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
    </aside>
  );
}

export { Avatar, FollowPill };

