import React, { useRef, useState } from "react";
import { X, Eye, Plus, Camera, Trash2, Loader2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import api from "@/api/axios";
import { patchCurrentUser } from "@/redux/features/auth/authSlice";
import { fetchProfile } from "@/redux/features/profile/profileSlice";
import { useCreateModal } from "@/context/CreateModalContext";

export default function ProfileAvatarOptionsModal({
  isOpen,
  onClose,
  hasActiveStory = false,
  onViewStory,
}) {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth?.user);
  const { openCreate } = useCreateModal();

  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const hasAvatar = Boolean(currentUser?.avatar);

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await api.post("/users/edit-profile", formData);
      const updatedUser = res.data?.data?.user;

      if (updatedUser) {
        dispatch(patchCurrentUser(updatedUser));
        dispatch(fetchProfile({ isMe: true }));
      }
      onClose();
    } catch (err) {
      console.error("[ProfileAvatarOptionsModal] Upload avatar error:", err);
      setError(err?.response?.data?.message || "Failed to update profile picture.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/users/edit-profile", { removeAvatar: true });
      const updatedUser = res.data?.data?.user;

      if (updatedUser) {
        dispatch(patchCurrentUser({ avatar: "" }));
        dispatch(fetchProfile({ isMe: true }));
      }
      onClose();
    } catch (err) {
      console.error("[ProfileAvatarOptionsModal] Remove avatar error:", err);
      setError(err?.response?.data?.message || "Failed to remove profile picture.");
    } finally {
      setLoading(false);
    }
  };

  const handleStoryOption = () => {
    onClose();
    if (hasActiveStory && onViewStory) {
      onViewStory();
    } else {
      openCreate("story");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-paper p-5 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-ink">Profile Picture Options</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="grid h-8 w-8 place-items-center rounded-full text-text-subtle hover:bg-surface-elevated hover:text-ink transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-pink-soft/80 p-3 text-xs text-pink font-medium border border-pink/20">
            {error}
          </div>
        )}

        {/* Options List */}
        <div className="mt-4 flex flex-col gap-2.5">
          {/* Option 1: View Story / Add Story */}
          <button
            type="button"
            onClick={handleStoryOption}
            disabled={loading}
            className="flex items-center gap-3.5 w-full rounded-2xl border border-border bg-surface p-3.5 text-left text-xs font-semibold text-ink hover:bg-surface-elevated transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-soft text-indigo shrink-0">
              {hasActiveStory ? <Eye size={18} /> : <Plus size={18} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px]">{hasActiveStory ? "View Active Story" : "Add New Story"}</span>
              <span className="text-[11px] font-normal text-text-subtle">
                {hasActiveStory ? "Watch your published 24h story" : "Share a photo or video story"}
              </span>
            </div>
          </button>

          {/* Option 2: Edit Profile Picture */}
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={loading}
            className="flex items-center gap-3.5 w-full rounded-2xl border border-border bg-surface p-3.5 text-left text-xs font-semibold text-ink hover:bg-surface-elevated transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-soft text-indigo shrink-0">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </div>
            <div className="flex flex-col">
              <span className="text-[13px]">Edit Profile Picture</span>
              <span className="text-[11px] font-normal text-text-subtle">Upload a new profile photo</span>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Option 3: Remove Current Picture (if avatar exists) */}
          {hasAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={loading}
              className="flex items-center gap-3.5 w-full rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px]">Remove Current Picture</span>
                <span className="text-[11px] font-normal text-rose-400">Clear your avatar image</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
