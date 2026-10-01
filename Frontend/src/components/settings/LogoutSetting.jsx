import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert, Loader2 } from "lucide-react";
import { logout as logoutThunk, clearAuth } from "@/redux/features/auth/authSlice.js";
import { resetProfile } from "@/redux/features/profile/profileSlice.js";

export default function LogoutSetting({ onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth?.user);
  const [loading, setLoading] = useState(false);

  const handleConfirmLogout = async () => {
    setLoading(true);
    try {
      await dispatch(logoutThunk());
    } catch (e) {
      console.error("Logout thunk error:", e);
    } finally {
      dispatch(clearAuth());
      dispatch(resetProfile());
      if (onClose) onClose();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
          <LogOut className="h-5 w-5" />
          Log Out
        </h3>
        <p className="mt-1 text-sm text-muted">
          Sign out of your active session on this device.
        </p>
      </div>

      <div className="p-5 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-500">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">Are you sure you want to log out?</h4>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Logged in as <strong className="text-ink">@{currentUser?.username || "user"}</strong>. You will need to enter your password or credentials again to log back in.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 rounded-full cursor-pointer border border-border bg-surface hover:bg-surface-elevated text-ink text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            disabled={loading}
            className="h-9 px-5 cursor-pointer rounded-full bg-red-500 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Confirm Logout
          </button>
        </div>
      </div>
    </div>
  );
}
