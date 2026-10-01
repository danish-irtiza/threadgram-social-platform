import React, { useState, } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  Hexagon,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { designSystem } from "@doc/designSystem";
import api from "../../api/axios.js";

const RESET_TOKEN_MIN = 6;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: urlParamToken } = useParams();
  const queryToken = searchParams.get("token") || "";
  const urlToken = (urlParamToken || queryToken || "").trim();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFocused, setIsFocused] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  const { colors, radius, shadow, fontFamily, letterSpacing, motion } = designSystem;

  const hasValidToken = urlToken.trim().length >= RESET_TOKEN_MIN;

  // const strength = useMemo(() => {
  //   let level = 0;
  //   if (newPassword.length >= 8) level++;
  //   if (/[A-Z]/.test(newPassword)) level++;
  //   if (/[0-9]/.test(newPassword)) level++;
  //   if (/[^A-Za-z0-9]/.test(newPassword)) level++;
  //   return level;
  // }, [newPassword]);

  // const strengthMeta = [
  //   { label: "Too weak", tone: colors.error.DEFAULT, pct: 20 },
  //   { label: "Weak", tone: colors.warning.DEFAULT, pct: 40 },
  //   { label: "Okay", tone: colors.yellow.DEFAULT, pct: 60 },
  //   { label: "Good", tone: colors.success.DEFAULT, pct: 80 },
  //   { label: "Strong", tone: colors.success.DEFAULT, pct: 100 },
  // ][Math.min(strength, 4)];

  const doPasswordsMatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!hasValidToken) {
      setError("This reset link is missing or invalid. Please request a new one.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/resetPassword", {
        resetPasswordToken: urlToken,
        newPassword,
      });
      setSuccess("Password updated! Redirecting you to login…");
      await new Promise((resolve) => setTimeout(resolve, 1200));
      navigate("/login", { replace: true });
    } catch (_err) {
      setError(_err.response?.data?.message || "Unable to reset password. The link may be expired or invalid.");
    } finally {
      setIsLoading(false);
    }
  };

  const fs = designSystem.fontSize;

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center px-4 py-8",
        "bg-paper"
      )}
      style={{ fontFamily: fontFamily.sans }}
    >
      <div className="w-full max-w-[360px] flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 border border-border",
              "bg-surface-elevated"
            )}
            style={{ borderRadius: radius.md, boxShadow: shadow.sm }}
          >
            <Hexagon className="w-6 h-6 text-indigo fill-indigo/20" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1
              className="text-ink font-semibold tracking-tight"
              style={{
                fontSize: fs.h1[0],
                lineHeight: fs.h1[1],
                letterSpacing: letterSpacing.h1,
              }}
            >
              Set a new password
            </h1>
            <p
              className="text-muted"
              style={{
                fontSize: fs.body[0],
                lineHeight: fs.body[1],
              }}
            >
              {!hasValidToken && "This link appears to be missing a valid token."}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-5 p-5 border border-border",
            "bg-surface-elevated"
          )}
          style={{
            borderRadius: radius.lg,
            boxShadow: shadow.md,
          }}
        >
          {!hasValidToken && (
            <div
              role="alert"
              className="p-3 border"
              style={{
                color: colors.warning.DEFAULT,
                backgroundColor: colors.warning.soft,
                borderColor: `${colors.warning.DEFAULT}40`,
                borderRadius: radius.sm,
                fontSize: fs.small[0],
                lineHeight: fs.small[1],
              }}
            >
              Your reset link is missing or invalid. Please go back and request
              a new reset password email.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="w-full flex flex-col gap-3">
              <div className="w-full flex flex-col gap-2">
                <label
                  htmlFor="newPassword"
                  className="text-muted font-medium"
                  style={{
                    fontSize: fs.small[0],
                    lineHeight: fs.small[1],
                  }}
                >
                  New password
                </label>
                <div className="relative w-full group">
                  <div
                    className={cn(
                      "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                      "transition-colors"
                    )}
                    style={{
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                      color:
                        isFocused.newPassword || newPassword.length > 0
                          ? colors.ink.DEFAULT
                          : colors.muted.DEFAULT,
                    }}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() =>
                      setIsFocused((s) => ({ ...s, newPassword: true }))
                    }
                    onBlur={() =>
                      setIsFocused((s) => ({ ...s, newPassword: false }))
                    }
                    disabled={!hasValidToken}
                    className={cn(
                      "w-full pl-11 pr-11 py-2.5 text-ink placeholder:text-muted/60 text-[15px]",
                      "border border-border",
                      "outline-none transition-all",
                      "hover:bg-surface/80",
                      isFocused.newPassword && !passwordsMismatch && "border-indigo",
                      passwordsMismatch && "border-error",
                      !hasValidToken && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      height: "40px",
                      borderRadius: "8px",
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                      backgroundColor: colors.surface.DEFAULT,
                      color: colors.ink.DEFAULT,
                      boxShadow: isFocused.newPassword ? shadow.focus : shadow.input,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={!hasValidToken}
                    className={cn(
                      "absolute right-0 top-0 bottom-0 flex items-center justify-center w-11",
                      "text-muted hover:text-ink transition-colors focus:outline-none focus:text-ink",
                      !hasValidToken && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                    }}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* {newPassword.length > 0 && (
                <div className="w-full flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        fontSize: fs.micro[0],
                        lineHeight: fs.micro[1],
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: strengthMeta.tone }}
                      />
                      <span style={{ color: strengthMeta.tone }}>
                        {strengthMeta.label}
                      </span>
                    </div>
                    <div
                      className="text-muted"
                      style={{
                        fontSize: fs.micro[0],
                        lineHeight: fs.micro[1],
                        fontFamily: fontFamily.mono,
                      }}
                    >
                      {newPassword.length} / 8+
                    </div>
                  </div>
                  <div
                    className="w-full h-1 overflow-hidden"
                    style={{
                      backgroundColor: colors.border.DEFAULT,
                      borderRadius: radius.full,
                    }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${strengthMeta.pct}%`,
                        backgroundColor: strengthMeta.tone,
                        transitionDuration: motion.micro,
                        transitionTimingFunction: motion.easeOut,
                      }}
                    />
                  </div>
                </div>
              )} */}

              <div className="w-full flex flex-col gap-2 pt-0.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-muted font-medium"
                  style={{
                    fontSize: fs.small[0],
                    lineHeight: fs.small[1],
                  }}
                >
                  Confirm password
                </label>
                <div className="relative w-full group">
                  <div
                    className={cn(
                      "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                      "transition-colors"
                    )}
                    style={{
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                      color:
                        isFocused.confirmPassword || confirmPassword.length > 0
                          ? doPasswordsMatch
                            ? colors.success.DEFAULT
                            : passwordsMismatch
                              ? colors.error.DEFAULT
                              : colors.ink.DEFAULT
                          : colors.muted.DEFAULT,
                    }}
                  >
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-type your password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() =>
                      setIsFocused((s) => ({ ...s, confirmPassword: true }))
                    }
                    onBlur={() =>
                      setIsFocused((s) => ({ ...s, confirmPassword: false }))
                    }
                    disabled={!hasValidToken}
                    className={cn(
                      "w-full pl-11 pr-11 py-2.5 text-ink placeholder:text-muted/60 text-[15px]",
                      "border border-border",
                      "outline-none transition-all",
                      "hover:bg-surface/80",
                      isFocused.confirmPassword && !passwordsMismatch && "border-indigo",
                      passwordsMismatch && "border-error",
                      !hasValidToken && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      height: "40px",
                      borderRadius: "8px",
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                      backgroundColor: colors.surface.DEFAULT,
                      color: colors.ink.DEFAULT,
                      boxShadow: isFocused.confirmPassword
                        ? shadow.focus
                        : shadow.input,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    disabled={!hasValidToken}
                    className={cn(
                      "absolute right-0 top-0 bottom-0 flex items-center justify-center w-11",
                      "text-muted hover:text-ink transition-colors focus:outline-none focus:text-ink",
                      !hasValidToken && "opacity-50 cursor-not-allowed"
                    )}
                    style={{
                      transitionDuration: motion.micro,
                      transitionTimingFunction: motion.easeOut,
                    }}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {doPasswordsMatch && (
                  <div
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: fs.micro[0],
                      lineHeight: fs.micro[1],
                      color: colors.success.DEFAULT,
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Passwords match
                  </div>
                )}
                {passwordsMismatch && (
                  <div
                    className="flex items-center gap-1.5"
                    style={{
                      fontSize: fs.micro[0],
                      lineHeight: fs.micro[1],
                      color: colors.error.DEFAULT,
                    }}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Passwords do not match
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 border"
                style={{
                  color: colors.error.DEFAULT,
                  backgroundColor: colors.error.soft,
                  borderColor: `${colors.error.DEFAULT}40`,
                  borderRadius: radius.sm,
                  fontSize: fs.small[0],
                  lineHeight: fs.small[1],
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="p-3 border"
                style={{
                  color: colors.success.DEFAULT,
                  backgroundColor: colors.success.soft,
                  borderColor: `${colors.success.DEFAULT}40`,
                  borderRadius: radius.sm,
                  fontSize: fs.small[0],
                  lineHeight: fs.small[1],
                }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !hasValidToken}
              className={cn(
                "relative w-full cursor-pointer overflow-hidden font-medium px-4 py-2.5 text-[15px]",
                "bg-indigo text-white hover:bg-indigo-hover transition mb-1",
                "focus:outline-none focus:ring-[3px] focus:ring-indigo/25 disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2 border border-transparent"
              )}
              style={{
                height: "40px",
                borderRadius: "10px",
                transitionDuration: motion.micro,
                transitionTimingFunction: motion.easeOut,
                boxShadow: shadow.button,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating password…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reset password</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="w-full flex flex-col items-center text-center gap-2 pt-1">
          <Link
            to="/login"
            className={cn(
              "inline-flex items-center gap-2 font-medium transition-colors underline-offset-4 hover:underline"
            )}
            style={{
              fontSize: fs.body[0],
              lineHeight: fs.body[1],
              color: colors.indigo.DEFAULT,
              transitionDuration: motion.micro,
              transitionTimingFunction: motion.easeOut,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          {!hasValidToken && (
            <Link
              to="/forgot-password"
              className={cn(
                "transition-colors underline-offset-4 hover:underline"
              )}
              style={{
                fontSize: fs.small[0],
                lineHeight: fs.small[1],
                color: colors.muted.DEFAULT,
                transitionDuration: motion.micro,
                transitionTimingFunction: motion.easeOut,
              }}
            >
              Need a new reset link?
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
