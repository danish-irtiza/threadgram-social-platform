import React from "react";
import { X, Lock, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Professional Auth Prompt Modal shown when an unauthenticated guest user
 * attempts to view protected content (posts, vibes, reels, stories, comments)
 * or perform engagement actions (like, save, comment, follow).
 */
export default function AuthPromptModal({
  isOpen = false,
  onClose,
  targetUser = null, // { avatar, username, name }
  title = "Want to see this?",
  subtitle,
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const username = targetUser?.username ? `@${targetUser.username}` : "this user";
  const avatar = targetUser?.avatar;
  const description =
    subtitle || `Log in or sign up to see photos, videos, and updates from ${username}.`;

  const handleLogin = () => {
    onClose && onClose();
    navigate("/login");
  };

  const handleSignup = () => {
    onClose && onClose();
    navigate("/signup");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-paper p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-text-subtle hover:bg-overlay hover:text-ink transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* User Avatar Showcase */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-elevated p-1 shadow-md ring-4 ring-indigo/20">
          <div className="h-full w-full overflow-hidden rounded-full bg-surface flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt={username}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <UserIcon className="h-10 w-10 text-muted" strokeWidth={1.5} />
            )}
          </div>
        </div>

        {/* Text Details */}
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-text-subtle px-2">
          {description}
        </p>

        {/* CTA Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleLogin}
            className="w-full rounded-xl bg-indigo py-3 text-xs font-semibold text-white shadow-md hover:bg-indigo/90 transition-all active:scale-[0.98] cursor-pointer"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={handleSignup}
            className="w-full rounded-xl border border-border bg-surface py-3 text-xs font-semibold text-ink hover:bg-surface-elevated transition-all active:scale-[0.98] cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
