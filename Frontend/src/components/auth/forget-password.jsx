import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Loader2, ArrowLeft, CheckCircle2, Inbox, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { designSystem } from "@doc/designSystem";
import { useTheme } from "@/context/ThemeContext.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import darkIconCircle from "@/assets/logo/thread-icon-circle-darkmode-removebg-preview.png";
import api from "../../api/axios.js";

const ForgetPassword = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconCircle = isDark ? darkIconCircle : lightIconCircle;

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState("");
  const [resetPath, setResetPath] = useState("");
  const cooldownTimer = useRef(null);

  const { colors, radius, shadow, fontFamily, letterSpacing, motion } = designSystem;

  const startCooldown = () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setResendCooldown(30);
    cooldownTimer.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitRequest = async (finalEmail, isResend = false) => {
    try {
      const res = await api.post("/auth/forgotPassword", { email: finalEmail });
      if (res.data?.resetPasswordUrl) {
        try {
          const parsed = new URL(res.data.resetPasswordUrl);
          setResetPath(parsed.pathname);
        } catch (_e) {
          setResetPath("");
        }
      }
      if (isResend) {
        setResendMsg("New reset link sent!");
        setTimeout(() => setResendMsg(""), 3000);
      } else {
        setSentEmail(finalEmail);
        setIsSent(true);
      }
      startCooldown();
    } catch (_err) {
      if (isResend) {
        setResendMsg("Failed to resend, please try again.");
        setTimeout(() => setResendMsg(""), 3000);
      } else {
        setError(_err.response?.data?.message || "Something went wrong, please try again.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    await submitRequest(trimmedEmail, false);
    setIsLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await submitRequest(sentEmail, true);
    setIsResending(false);
  };

  const handleUseDifferentEmail = () => {
    setIsSent(false);
    setError("");
    setResendMsg("");
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setResendCooldown(0);
  };

  const fs = designSystem.fontSize;

  if (isSent) {
    return (
      <div
        className={cn(
          "min-h-screen w-full flex items-center justify-center px-4 py-8",
          "bg-paper"
        )}
        style={{ fontFamily: fontFamily.sans }}
      >
        <div className="w-full max-w-[400px] flex flex-col gap-6">
          <div className="flex flex-col items-center gap-5">
            <div
              className="relative flex items-center justify-center"
              style={{ width: "96px", height: "96px" }}
            >
              <div
                className="absolute inset-0 animate-pulse"
                style={{
                  backgroundColor: colors.success.soft,
                  borderRadius: radius.full,
                  transform: "scale(1)",
                }}
              />
              <div
                className={cn(
                  "relative flex items-center justify-center"
                )}
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: radius.full,
                  backgroundColor: colors.success.soft,
                  boxShadow: `0 0 40px ${colors.success.soft}`,
                }}
              >
                <Inbox
                  className="w-9 h-9"
                  style={{ color: colors.success.DEFAULT }}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <h1
                className="text-ink font-semibold tracking-tight"
                style={{
                  fontSize: fs.h1[0],
                  lineHeight: fs.h1[1],
                  letterSpacing: letterSpacing.h1,
                }}
              >
                Check your inbox
              </h1>
              <p
                className="text-muted text-center max-w-xs"
                style={{
                  fontSize: fs.body[0],
                  lineHeight: fs.body[1],
                }}
              >
                We sent a password reset link to{" "}
                <span
                  className="font-semibold"
                  style={{ color: colors.ink.DEFAULT }}
                >
                  {sentEmail}
                </span>
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-5 p-6 border border-border",
              "bg-surface-elevated"
            )}
            style={{
              borderRadius: radius.lg,
              boxShadow: shadow.md,
            }}
          >
            <div
              className="text-center"
              style={{
                fontSize: fs.body[0],
                lineHeight: "28px",
                color: colors.muted.DEFAULT,
              }}
            >
              Click the link in that email to reset your password. If you
              don&apos;t see it, you may need to{" "}
              <span
                className="font-semibold"
                style={{ color: colors.ink.DEFAULT }}
              >
                check your spam folder
              </span>
              .
            </div>

            {resendMsg && (
              <div
                role="status"
                className="p-3 border text-center"
                style={{
                  color: resendMsg.startsWith("Failed")
                    ? colors.error.DEFAULT
                    : colors.success.DEFAULT,
                  backgroundColor: resendMsg.startsWith("Failed")
                    ? colors.error.soft
                    : colors.success.soft,
                  borderColor: resendMsg.startsWith("Failed")
                    ? `${colors.error.DEFAULT}40`
                    : `${colors.success.DEFAULT}40`,
                  borderRadius: radius.sm,
                  fontSize: fs.small[0],
                  lineHeight: fs.small[1],
                }}
              >
                {resendMsg}
              </div>
            )}

            <div className="w-full flex flex-col gap-3">
              <div
                className="text-center"
                style={{
                  fontSize: fs.body[0],
                  lineHeight: fs.body[1],
                  color: colors.muted.DEFAULT,
                }}
              >
                Still can&apos;t find the email? No problem.
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                className={cn(
                  "relative w-full cursor-pointer overflow-hidden font-medium px-4 py-2.5 text-[15px]",
                  "bg-indigo text-white hover:bg-indigo-hover transition",
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
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />

                  </>
                ) : resendCooldown > 0 ? (
                  <span>
                    Resend in{" "}
                    <span
                      className="font-mono"
                      style={{ fontFamily: fontFamily.mono }}
                    >
                      {String(resendCooldown).padStart(2, "0")}s
                    </span>
                  </span>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Resend reset link</span>
                  </>
                )}
              </button>

              <div className="h-px w-full" style={{ backgroundColor: colors.border.subtle }} />

              <button
                type="button"
                onClick={() => navigate(resetPath || "/reset-password", { replace: false })}
                className={cn(
                  "w-full flex cursor-pointer items-center justify-center gap-2",
                  "bg-transparent text-ink border border-border",
                  "hover:bg-surface transition text-[15px] font-medium px-4 py-2.5",
                  "focus:outline-none focus:ring-[3px] focus:ring-indigo/25"
                )}
                style={{
                  height: "40px",
                  borderRadius: "10px",
                  transitionDuration: motion.micro,
                  transitionTimingFunction: motion.easeOut,
                }}
              >
                <KeyRound className="w-4 h-4" />
                Open reset password page
              </button>

              <div className="h-px w-full" style={{ backgroundColor: colors.border.subtle }} />

              <button
                type="button"
                onClick={handleUseDifferentEmail}
                className={cn(
                  "w-full flex cursor-pointer items-center justify-center gap-2",
                  "bg-transparent text-ink border border-border",
                  "hover:bg-surface transition text-[15px] font-medium px-4 py-2.5",
                  "focus:outline-none focus:ring-[3px] focus:ring-indigo/25"
                )}
                style={{
                  height: "40px",
                  borderRadius: "10px",
                  transitionDuration: motion.micro,
                  transitionTimingFunction: motion.easeOut,
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Use a different email
              </button>
            </div>
          </div>

          <div className="w-full text-center pt-1">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center px-4 py-8",
        "bg-paper"
      )}
      style={{ fontFamily: fontFamily.sans }}
    >
      <div className="w-full max-w-[360px] flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl border border-border-subtle p-1.5",
              "bg-surface-elevated overflow-hidden"
            )}
            style={{ borderRadius: radius.md }}
          >
            <img
              src={iconCircle}
              alt="Threadgram"
              className="h-full w-full object-contain select-none "
              draggable={false}
            />
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
              Forgot your password
            </h1>
            <p
              className="text-muted"
              style={{
                fontSize: fs.body[0],
                lineHeight: fs.body[1],
              }}
            >
              Please enter the email address you&apos;d like your password
              reset information sent to.
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="w-full flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-muted font-medium"
                style={{
                  fontSize: fs.small[0],
                  lineHeight: fs.small[1],
                }}
              >
                Enter email address
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
                    color: (isFocused || email.length > 0)
                      ? colors.ink.DEFAULT
                      : colors.muted.DEFAULT,
                  }}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 text-ink placeholder:text-muted/60 text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused ? shadow.focus : shadow.input,
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className={cn("p-3 border")}
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

            <button
              type="submit"
              disabled={isLoading}
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
                  <span>Sending link…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Request reset link</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="w-full text-center pt-1">
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
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;
