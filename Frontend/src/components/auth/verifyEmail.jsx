import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  MailCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  ArrowRight,
  ArrowLeft,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { designSystem } from "@doc/designSystem";
import api from "../../api/axios.js";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get("token") || "";

  const [verifying, setVerifying] = useState(Boolean(tokenFromQuery));
  const [verificationError, setVerificationError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasTokenOnLoad] = useState(Boolean(tokenFromQuery));

  const [resendEmail, setResendEmail] = useState(
    location.state?.email || searchParams.get("email") || ""
  );
  const [devLink, setDevLink] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [resendError, setResendError] = useState("");

  const { colors, radius, shadow, fontFamily, letterSpacing, motion } = designSystem;
  const fs = designSystem.fontSize;

  useEffect(() => {
    let cancelled = false;
    if (!tokenFromQuery) {
      setVerifying(false);
      return;
    }

    (async () => {
      setVerifying(true);
      setVerificationError("");
      try {
        const response = await api.post("/auth/verifyEmail", { token: tokenFromQuery });
        if (cancelled) return;
        const userEmail = response?.data?.email || resendEmail || "";
        navigate("/login", {
          replace: true,
          state: {
            verified: true,
            email: userEmail,
            message: "Email verified successfully! Please log in.",
          },
        });
      } catch (_err) {
        if (cancelled) return;
        const serverMsg = _err?.response?.data?.message;
        if (typeof serverMsg === "string" && serverMsg.toLowerCase().includes("already verified")) {
          navigate("/login", {
            replace: true,
            state: {
              verified: true,
              email: resendEmail,
              message: "Your email is already verified. Please log in.",
            },
          });
          return;
        }

        if (typeof serverMsg === "string") {
          setVerificationError(serverMsg);
        } else {
          setVerificationError("Invalid or expired verification token.");
        }
        setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenFromQuery]);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendMsg("");
    setResendError("");
    if (!resendEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail)) {
      setResendError("Please enter a valid email address.");
      return;
    }
    setIsResending(true);
    try {
      const res = await api.post("/auth/resendVerification", {
        email: resendEmail.trim().toLowerCase(),
      });
      setResendMsg(res?.data?.message || `Verification email resent to ${resendEmail.trim()}.`);
      if (res?.data?.devVerificationUrl) {
        setDevLink(res.data.devVerificationUrl);
      }
    } catch (_err) {
      const serverMsg = _err?.response?.data?.message;
      if (typeof serverMsg === "string" && serverMsg.toLowerCase().includes("already verified")) {
        navigate("/login", {
          replace: true,
          state: {
            verified: true,
            email: resendEmail.trim().toLowerCase(),
            message: "Your email is already verified. Please log in.",
          },
        });
        return;
      } else if (typeof serverMsg === "string") {
        setResendError(serverMsg);
      } else {
        setResendError("Could not resend the email. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  if (verifying && tokenFromQuery) {
    return (
      <div
        className={cn(
          "min-h-screen w-full flex items-center justify-center px-4 py-8",
          "bg-paper"
        )}
        style={{ fontFamily: fontFamily.sans }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
            style={{
              backgroundColor: colors.indigo.soft,
              boxShadow: shadow.focus,
            }}
          >
            <Loader2 className="w-8 h-8 text-indigo animate-spin" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2
              className="font-semibold text-ink tracking-tight"
              style={{ fontSize: fs.h2[0], lineHeight: fs.h2[1] }}
            >
              Verifying your email…
            </h2>
            <p
              className="text-muted"
              style={{ fontSize: fs.body[0], lineHeight: fs.body[1] }}
            >
              Redirecting you to login
            </p>
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
      <div className="w-full max-w-[380px] flex flex-col gap-6">
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
              Verify your email
            </h1>
            <p
              className="text-muted"
              style={{ fontSize: fs.body[0], lineHeight: fs.body[1] }}
            >
              {hasTokenOnLoad
                ? verifying
                  ? "We're checking your verification link…"
                  : isVerified
                    ? "Your email has been verified. Welcome aboard."
                    : "This link didn't work. You can request a new one below."
                : "We sent a verification link to your email. Click the link to continue."}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-5 p-5 border border-border",
            "bg-surface-elevated"
          )}
          style={{ borderRadius: radius.lg, boxShadow: shadow.md }}
        >
          {verifying && (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
                style={{
                  backgroundColor: colors.indigo.soft,
                  boxShadow: shadow.focus,
                }}
              >
                <Loader2 className="w-8 h-8 text-indigo animate-spin" />
              </div>
              <div
                style={{
                  fontSize: fs.body[0],
                  lineHeight: fs.body[1],
                  color: colors.muted.DEFAULT,
                }}
              >
                Verifying your email…
              </div>
            </div>
          )}

          {!verifying && isVerified && (
            <div className="flex flex-col items-center text-center gap-5 py-2">
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: colors.success.soft,
                }}
              >
                <div
                  className="absolute inset-0 rounded-full opacity-50 animate-pulse"
                  style={{ backgroundColor: colors.success.DEFAULT + "30" }}
                />
                <MailCheck
                  className="w-9 h-9 relative z-10"
                  style={{ color: colors.success.DEFAULT }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div
                  className="font-semibold text-ink"
                  style={{ fontSize: "20px", lineHeight: "28px" }}
                >
                  Email confirmed
                </div>
                <div
                  className="text-muted"
                  style={{ fontSize: fs.body[0], lineHeight: fs.body[1] }}
                >
                  Your email is now verified. You can sign in with your account
                  credentials.
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className={cn(
                  "relative w-full cursor-pointer font-medium px-4 py-2.5 text-[15px]",
                  "bg-indigo text-white hover:bg-indigo-hover transition mb-1",
                  "focus:outline-none focus:ring-[3px] focus:ring-indigo/25",
                  "flex items-center justify-center gap-2"
                )}
                style={{
                  height: "40px",
                  borderRadius: "10px",
                  transitionDuration: motion.micro,
                  transitionTimingFunction: motion.easeOut,
                  boxShadow: shadow.button,
                }}
              >
                <span>Continue to Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div
                className="flex items-center gap-1.5"
                style={{
                  color: colors.success.DEFAULT,
                  fontSize: fs.small[0],
                  lineHeight: fs.small[1],
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </div>
            </div>
          )}

          {!verifying && !isVerified && (
            <>
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:
                      verificationError && !hasTokenOnLoad
                        ? colors.error.soft
                        : colors.warning.soft,
                  }}
                >
                  <XCircle
                    className="w-8 h-8"
                    style={{
                      color:
                        verificationError && !hasTokenOnLoad
                          ? colors.error.DEFAULT
                          : colors.warning.DEFAULT,
                    }}
                  />
                </div>
                {verificationError && hasTokenOnLoad && (
                  <div
                    role="alert"
                    className="w-full p-3 border text-left"
                    style={{
                      color: colors.error.DEFAULT,
                      backgroundColor: colors.error.soft,
                      borderColor: `${colors.error.DEFAULT}40`,
                      borderRadius: radius.sm,
                      fontSize: fs.small[0],
                      lineHeight: fs.small[1],
                    }}
                  >
                    {verificationError}
                  </div>
                )}
              </div>

              <form onSubmit={handleResend} className="flex flex-col gap-4">
                <div className="w-full flex flex-col gap-2">
                  <label
                    htmlFor="resendEmail"
                    className="text-muted font-medium"
                    style={{ fontSize: fs.small[0], lineHeight: fs.small[1] }}
                  >
                    Enter your account email
                  </label>
                  <div className="relative w-full">
                    <input
                      id="resendEmail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className={cn(
                        "w-full pl-4 pr-4 py-2.5 text-ink placeholder:text-muted/60 text-[15px]",
                        "border border-border",
                        "outline-none transition-all",
                        "focus:border-indigo hover:bg-surface/80"
                      )}
                      style={{
                        height: "40px",
                        borderRadius: "8px",
                        transitionDuration: motion.micro,
                        transitionTimingFunction: motion.easeOut,
                        backgroundColor: colors.surface.DEFAULT,
                        color: colors.ink.DEFAULT,
                        boxShadow: shadow.input,
                      }}
                    />
                  </div>
                </div>

                {resendError && (
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
                    {resendError}
                  </div>
                )}

                {resendMsg && !isVerified && (
                  <div
                    role="status"
                    className="p-3 border flex flex-col gap-2"
                    style={{
                      color: colors.success.DEFAULT,
                      backgroundColor: colors.success.soft,
                      borderColor: `${colors.success.DEFAULT}40`,
                      borderRadius: radius.sm,
                      fontSize: fs.small[0],
                      lineHeight: fs.small[1],
                    }}
                  >
                    <div>{resendMsg}</div>
                    {devLink && (
                      <div className="pt-2 border-t border-success/30 flex flex-col gap-1">
                        <span className="font-semibold text-ink text-[12px]">Local Dev Shortcut:</span>
                        <a
                          href={devLink}
                          className="text-indigo underline hover:text-indigo-hover font-medium break-all text-[12px]"
                        >
                          Verify Account Directly →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isResending}
                  className={cn(
                    "relative w-full cursor-pointer font-medium px-4 py-2.5 text-[15px]",
                    "bg-indigo text-white hover:bg-indigo-hover transition mb-1",
                    "focus:outline-none focus:ring-[3px] focus:ring-indigo/25 disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
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
                      <span>Sending verification email…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4" />
                      <span>Resend verification email</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
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
          {!isVerified && (
            <Link
              to="/signup"
              className={cn("transition-colors underline-offset-4 hover:underline")}
              style={{
                fontSize: fs.small[0],
                lineHeight: fs.small[1],
                color: colors.muted.DEFAULT,
                transitionDuration: motion.micro,
                transitionTimingFunction: motion.easeOut,
              }}
            >
              Need a different account? Create one
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
