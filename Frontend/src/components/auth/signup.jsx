import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeUsername, USERNAME_REGEX, USERNAME_RULES } from "@/utils/normalizeUsername.js";
import { designSystem } from "@doc/designSystem";
import { useTheme } from "@/context/ThemeContext.jsx";
import lightIconCircle from "@/assets/logo/thread-icon-circle-lightmode-removebg-preview.png";
import darkIconCircle from "@/assets/logo/thread-icon-circle-darkmode-removebg-preview.png";
import { useAppDispatch, useAppSelector } from "../../redux/hooks.js";
import {
  register,
  resetAuthState,
  googleLogin,
} from "../../redux/features/auth/authSlice.js";

const Signup = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconCircle = isDark ? darkIconCircle : lightIconCircle;

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { isLoading, isError, isSuccess, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isFocused, setIsFocused] = useState({
    name: false,
    username: false,
    email: false,
    password: false,
    confirm: false,
  });

  useEffect(() => {
    if (isSuccess) {
      navigate("/verify-email", {
        replace: true,
        state: { email: email.trim() },
      });
    }
  }, [isSuccess, navigate, email]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isError && error) {
      const status = error.status;
      const serverMsg = error.message;
      const serverErrors = error.errors;
      if (status === 409) {
        setLocalError(serverMsg || "Email is already in use.");
      } else if (status === 400 && typeof serverMsg === "string") {
        setLocalError(serverMsg);
      } else if (status === 400 && serverErrors && typeof serverErrors === "object") {
        const firstKey = Object.keys(serverErrors)[0];
        setLocalError(
          firstKey ? serverErrors[firstKey] : "Please check the fields and try again."
        );
      } else if (typeof serverMsg === "string") {
        setLocalError(serverMsg);
      } else {
        setLocalError("Something went wrong, please try again.");
      }
    }
  }, [isError, error]);

  useEffect(() => {
    return () => {
      dispatch(resetAuthState());
    };
  }, [dispatch]);

  useEffect(() => {
    const token = searchParams.get("token");
    const googleSuccess = searchParams.get("googleSuccess");
    const oauthError = searchParams.get("error");

    if (token || googleSuccess) {
      let userFromToken = null;
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userFromToken = payload.sub
            ? { _id: payload.sub }
            : null;
        }
      } catch (_e) {
        userFromToken = null;
      }
      dispatch(
        googleLogin({
          token,
          user: userFromToken,
        })
      );
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    } else if (oauthError) {
      setLocalError("Google sign up failed or was cancelled. Please try again.");
    }
  }, [searchParams, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    dispatch(resetAuthState());

    if (!name.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setLocalError("Please fill in all fields to continue.");
      return;
    }
    if (name.trim().length < 2) {
      setLocalError("Name must be at least 2 characters long.");
      return;
    }
    if (name.trim().length > 50) {
      setLocalError("Name cannot be more than 50 characters.");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters long.");
      return;
    }
    if (username.trim().length > 30) {
      setLocalError("Username cannot be more than 30 characters.");
      return;
    }
    if (!/^[a-z0-9_\-]+$/.test(username.trim())) {
      setLocalError(USERNAME_RULES);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }
    if (password.length > 128) {
      setLocalError("Password cannot be more than 128 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match. Please try again.");
      return;
    }

    dispatch(
      register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      })
    );
  };

  const handleOAuth = () => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";
    window.location.href = `${serverUrl}/api/auth/google`;
  };
  const avatarSeeds = ["s-ava-01", "s-ava-02", "s-ava-03", "s-ava-04", "s-ava-05"];
  const { colors, radius, shadow, fontFamily, letterSpacing, spacing, motion } = designSystem;

  const googleG = (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.795 2.251-2.271 4.159-4.084 5.57l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );

  const fontSize = designSystem.fontSize;
  const errorMessage = localError;

  return (
    <div
      className={cn(
        "min-h-screen w-full flex items-center justify-center px-4 py-8",
        "bg-paper"
      )}
      style={{ fontFamily: fontFamily.sans }}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
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
            <h2
              className="text-ink font-semibold tracking-tight"
              style={{
                fontSize: fontSize.h2[0],
                lineHeight: fontSize.h2[1],
                letterSpacing: letterSpacing.h2,
              }}
            >
              Create account
            </h2>

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
            <div className="w-full flex flex-col gap-3">
              <div className="relative w-full group">
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "transition-colors",
                  )}
                  style={{
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    color: (isFocused.name || name.length > 0) ? colors.ink.DEFAULT : colors.muted.DEFAULT,
                  }}
                >
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Full name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setIsFocused((s) => ({ ...s, name: true }))}
                  onBlur={() => setIsFocused((s) => ({ ...s, name: false }))}
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 text-ink placeholder:text-text-placeholder text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused.name && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused.name ? shadow.focus : shadow.input,
                  }}
                />
              </div>

              <div className="relative w-full group">
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "transition-colors",
                  )}
                  style={{
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    color: (isFocused.username || username.length > 0) ? colors.ink.DEFAULT : colors.muted.DEFAULT,
                  }}
                >
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="Username (e.g. john_doe)"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  onFocus={() => setIsFocused((s) => ({ ...s, username: true }))}
                  onBlur={() => setIsFocused((s) => ({ ...s, username: false }))}
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 text-ink placeholder:text-text-placeholder text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused.username && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused.username ? shadow.focus : shadow.input,
                  }}
                />
              </div>

              <div className="relative w-full group">
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "transition-colors",
                  )}
                  style={{
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    color: (isFocused.email || email.length > 0) ? colors.ink.DEFAULT : colors.muted.DEFAULT,
                  }}
                >
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused((s) => ({ ...s, email: true }))}
                  onBlur={() => setIsFocused((s) => ({ ...s, email: false }))}
                  className={cn(
                    "w-full pl-11 pr-4 py-2.5 text-ink placeholder:text-text-placeholder text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused.email && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused.email ? shadow.focus : shadow.input,
                  }}
                />
              </div>

              <div className="relative w-full group">
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "transition-colors",
                  )}
                  style={{
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    color: (isFocused.password || password.length > 0) ? colors.ink.DEFAULT : colors.muted.DEFAULT,
                  }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsFocused((s) => ({ ...s, password: true }))}
                  onBlur={() => setIsFocused((s) => ({ ...s, password: false }))}
                  className={cn(
                    "w-full pl-11 pr-11 py-2.5 text-ink placeholder:text-text-placeholder text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused.password && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused.password ? shadow.focus : shadow.input,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={cn(
                    "absolute right-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "text-muted hover:text-ink transition-colors focus:outline-none focus:text-ink"
                  )}
                  style={{ transitionDuration: motion.micro, transitionTimingFunction: motion.easeOut }}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="relative w-full group">
                <div
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "transition-colors",
                  )}
                  style={{
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    color: (isFocused.confirm || confirmPassword.length > 0) ? colors.ink.DEFAULT : colors.muted.DEFAULT,
                  }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setIsFocused((s) => ({ ...s, confirm: true }))}
                  onBlur={() => setIsFocused((s) => ({ ...s, confirm: false }))}
                  className={cn(
                    "w-full pl-11 pr-11 py-2.5 text-ink placeholder:text-text-placeholder text-[15px]",
                    "border border-border",
                    "outline-none transition-all",
                    "hover:bg-surface/80",
                    isFocused.confirm && "border-indigo"
                  )}
                  style={{
                    height: "40px",
                    borderRadius: "8px",
                    transitionDuration: motion.micro,
                    transitionTimingFunction: motion.easeOut,
                    backgroundColor: colors.surface.DEFAULT,
                    color: colors.ink.DEFAULT,
                    boxShadow: isFocused.confirm ? shadow.focus : shadow.input,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  className={cn(
                    "absolute right-0 top-0 bottom-0 flex items-center justify-center w-11",
                    "text-muted hover:text-ink transition-colors focus:outline-none focus:text-ink"
                  )}
                  style={{ transitionDuration: motion.micro, transitionTimingFunction: motion.easeOut }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className={cn(
                    "p-3 rounded-md bg-destructive-soft border border-destructive/40 text-[13px]",
                  )}
                  style={{
                    color: colors.error.DEFAULT,
                    borderRadius: radius.sm,
                  }}
                >
                  {errorMessage}
                </div>
              )}

            </div>

            <div className="h-px bg-border-subtle w-full" />

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "relative cursor-pointer w-full overflow-hidden font-medium px-4 py-2.5 text-[15px]",
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
                    <span>Creating account…</span>
                  </>
                ) : (
                  <span>Create account</span>
                )}
              </button>

              <button onClick={handleOAuth}
                type="button"
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "bg-transparent text-ink border border-border",
                  "hover:bg-surface transition text-[15px] font-medium px-4 py-2.5",
                  "focus:outline-none focus:ring-[3px] focus:ring-indigo/25 cursor-pointer"
                )}
                style={{
                  height: "40px",
                  borderRadius: "10px",
                  transitionDuration: motion.micro,
                  transitionTimingFunction: motion.easeOut,
                }}
              >
                {googleG}
                Sign up with Google
              </button>

              <div
                className="w-full text-center pt-2"
                style={{ fontSize: fontSize.small[0], lineHeight: fontSize.small[1] }}
              >
                <span className="text-muted">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-ink hover:text-ink transition-colors underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </span>
              </div>
            </div>
          </form>
        </div>

        <div className="flex flex-col items-center text-center gap-3 pt-2 max-w-sm mx-auto">
          <p
            className="text-muted"
            style={{ fontSize: fontSize.small[0], lineHeight: fontSize.small[1] }}
          >
            Join <span className="font-medium text-ink">creators</span> who already
            building their community.
          </p>
          <div className="flex -space-x-3 items-center">
            {avatarSeeds.map((seed, idx) => (
              <img
                key={seed}
                src={`https://picsum.photos/seed/${seed}/120/120`}
                alt={`creator-${idx + 1}`}
                className={cn(
                  "w-9 h-9 rounded-full object-cover ring-2 ring-paper"
                )}
                style={{
                  borderRadius: radius.full,
                  boxShadow: shadow.input,
                }}
                loading="lazy"
              />
            ))}
            <div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
