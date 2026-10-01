import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Lock, Eye, Tag, ShieldCheck, Check, AlertCircle, Loader2 } from "lucide-react";
import api from "@/api/axios.js";
import { setUser } from "@/redux/features/auth/authSlice.js";
import { fetchProfile } from "@/redux/features/profile/profileSlice.js";

export default function PrivacySettings() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth?.user);

  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [showActivityStatus, setShowActivityStatus] = useState(true);
  const [allowTagging, setAllowTagging] = useState("everyone");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleTogglePrivate = async () => {
    const nextState = !isPrivate;
    setIsPrivate(nextState);
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await api.post("/users/edit-profile", { isPrivate: nextState });
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        dispatch(setUser(updatedUser));
        dispatch(fetchProfile({ isMe: true }));
      }
      setSuccessMsg(
        nextState
          ? "Account is now Private. Only approved followers can view your posts."
          : "Account is now Public. Anyone can view your profile and posts."
      );
    } catch (err) {
      console.error("Failed to update privacy:", err);
      setIsPrivate(!nextState); // rollback
      setErrorMsg("Failed to update privacy setting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-ink flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-400" />
          Privacy & Security
        </h3>
        <p className="mt-1 text-sm text-muted">
          Manage who can see your account content and interact with you.
        </p>
      </div>

      {/* Main Privacy Toggle: Private vs Public Account */}
      <div className="p-4 rounded-xl border border-indigo/30 bg-indigo/5 dark:bg-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo/20 text-indigo">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Private Account</h4>
              <p className="text-xs text-muted mt-0.5">
                {isPrivate
                  ? "Only followers can see your posts and stories."
                  : "Anyone on the platform can see your posts and profile."}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            disabled={loading}
            onClick={handleTogglePrivate}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPrivate ? "bg-indigo" : "bg-zinc-700/50"
              } ${loading ? "opacity-50 cursor-wait" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isPrivate ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      </div>

      {/* Additional Privacy Controls */}
      <div className="space-y-3">
        {/* Activity Status */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-overlay text-indigo-400">
              <Eye size={18} />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">Show Activity Status</div>
              <div className="text-xs text-muted mt-0.5">
                Allow accounts you follow to see when you were last active
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={showActivityStatus}
            onClick={() => setShowActivityStatus(!showActivityStatus)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${showActivityStatus ? "bg-indigo" : "bg-zinc-700/50"
              }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${showActivityStatus ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>


        {/* Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <Check size={15} />
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
