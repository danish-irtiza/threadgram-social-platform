import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { User, Camera, Mail, AtSign, AlignLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import api from "@/api/axios.js";
import { setUser } from "@/redux/features/auth/authSlice.js";
import { fetchProfile } from "@/redux/features/profile/profileSlice.js";
import { normalizeUsername, USERNAME_RULES } from "@/utils/normalizeUsername.js";

export default function AccountSettings() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth?.user);
  const profileUser = useSelector((state) => state.profile?.profile);

  const user = {
    ...currentUser,
    ...(profileUser?.isOwner ? profileUser : {}),
  };

  const [formData, setFormData] = useState({
    name: user?.name || "",
    username: user?.username || "",
    bio: user?.bio || "",
    gender: user?.gender || "prefer_not_to_say",
    email: user?.email || "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        gender: user.gender || "prefer_not_to_say",
        email: user.email || "",
      });
      if (!avatarFile) {
        setAvatarPreview(user.avatar || "");
      }
    }
  }, [user.avatar, user.name, user.username, user.bio, user.gender, user.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "username" ? normalizeUsername(value) : value,
    }));
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setErrorMsg("");
      setSuccessMsg("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("username", formData.username.trim());
      data.append("bio", formData.bio.trim());
      data.append("gender", formData.gender);

      if (avatarFile) {
        data.append("avatar", avatarFile);
      }

      const res = await api.post("/users/edit-profile", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = res.data?.data?.user;
      console.log("UPDATED USER:", updatedUser);
      console.log("UPDATED AVATAR:", updatedUser?.avatar);
      if (updatedUser) {
        dispatch(setUser(updatedUser));
        dispatch(fetchProfile({ isMe: true }));
        if (updatedUser.avatar) {
          setAvatarPreview(updatedUser.avatar);
          setAvatarFile(null);
        }
      }

      setSuccessMsg("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to update profile:", err);
      const msg = err.response?.data?.message || "Failed to update profile. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-400" />
          Account & Profile Settings
        </h3>
        <p className="mt-1 pl-2 text-sm text-muted">
          Manage your profile information
        </p>
      </div>

      {/* Avatar Change Section */}
      <div className="flex items-center gap-4 p-3 rounded-xl border border-border/60 bg-surface-elevated/40">
        <div className="relative group shrink-0">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-surface border-2 border-indigo/40 grid place-items-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            title="Change Avatar"
          >
            <Camera size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="flex flex-col justify-center gap-0.5">
          <div className="text-sm font-semibold text-ink leading-tight">Profile Picture</div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-indigo hover:text-indigo-hover underline text-left leading-tight"
          >
            Upload New Photo
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-ink/80 mb-1">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your full name"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-surface text-ink focus:outline-none focus:border-indigo transition-colors"
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-ink/80 mb-1">
            Username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="username"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-surface text-ink focus:outline-none focus:border-indigo transition-colors"
            />
          </div>
          <p className="mt-1 pl-1 text-[11px] text-muted">{USERNAME_RULES}</p>
        </div>

        {/* Email (Read Only) */}
        <div>
          <label className="block text-xs font-semibold text-ink/80 mb-1">
            Email Address (Verified)
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border/50 bg-surface/50 text-muted cursor-not-allowed"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-semibold text-ink/80 mb-1">
            Bio
          </label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted" />
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell the world a bit about yourself..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-surface text-ink focus:outline-none focus:border-indigo transition-colors resize-none"
            />
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-xs font-semibold text-ink/80 mb-1">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-surface text-ink focus:outline-none focus:border-indigo transition-colors"
          >
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
          <Check size={15} />
          {successMsg}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="h-10 px-6 rounded-full bg-indigo hover:bg-indigo-hover text-white text-xs font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Save Account Changes
        </button>
      </div>
    </form>
  );
}
