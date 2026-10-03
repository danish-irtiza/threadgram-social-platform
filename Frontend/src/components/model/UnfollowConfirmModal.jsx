import React from "react";
import { Loader2, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils.js";

function Avatar({ src, size = 64, ringed = true, className }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-surface-elevated flex items-center justify-center",
        ringed && "p-[2px] bg-gradient-to-br from-indigo via-pink to-yellow",
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
          <UserIcon className="h-1/2 w-1/2 text-muted" strokeWidth={1.75} />
        )}
      </div>
    </div>
  );
}

export default function UnfollowConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  type = "unfollow",
  isLoading = false,
}) {
  if (!isOpen || !user) return null;

  const isCancelRequest = type === "cancelRequest";
  const username = user.username || "user";
  const avatar = user.avatar;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface text-ink p-6 shadow-2xl relative text-center animate-in zoom-in-95 duration-150"
      >
        <div className="flex justify-center mb-4">
          <Avatar src={avatar} size={64} ringed />
        </div>

        <h4 className="text-base font-bold text-ink mb-2">
          {isCancelRequest ? "Cancel follow request?" : `Unfollow @${username}?`}
        </h4>

        <p className="text-xs text-muted mb-6 leading-relaxed px-2">
          {isCancelRequest
            ? `Cancel follow request? You'll need to send a new request to follow @${username} again.`
            : `Their posts and vibes will no longer appear in your feed, and you'll need to request to follow again if their account is private.`}
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "w-full h-10 rounded-full font-semibold text-sm transition-all duration-120 active:scale-[0.98] flex items-center justify-center gap-2",
              "bg-white hover:bg-surface-elevated text-[#C62828] border-2 border-[#C62828] disabled:opacity-60 cursor-pointer font-black tracking-wide"
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isCancelRequest ? (
              "Cancel Request"
            ) : (
              "Unfollow"
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className={cn(
              "w-full h-10 rounded-full font-semibold text-sm transition-all duration-120 active:scale-[0.98] flex items-center justify-center",
              "bg-overlay hover:bg-overlay-hover text-ink border border-border cursor-pointer disabled:opacity-60"
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}



