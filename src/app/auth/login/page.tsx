"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthShell from "@/components/layout/AuthShell";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase error messages mapping
const getFirebaseErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled":
      "This account has been disabled. Please contact support.",
    "auth/user-not-found":
      "No account found with this email. Please sign up first.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/too-many-requests":
      "Too many failed attempts. Please try again later.",
    "auth/network-request-failed":
      "Network error. Please check your internet connection.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
  };
  return (
    errorMessages[errorCode] ||
    "Failed to sign in. Please check your credentials."
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const routeToWorkspace = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Authentication required");
    const role = (await firebaseUser.getIdTokenResult()).claims.role;
    if (role === "admin") { router.replace("/admin"); return; }
    if (role === "counsellor") { router.replace("/counsellor"); return; }
    const profile = await getUserProfile(firebaseUser.uid).catch(() => null);
    router.replace(profile?.registrationIntent === "counsellor" ? "/counsellor/apply" : "/dashboard");
  };

  const validateForm = useCallback((): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signIn(email.trim().toLowerCase(), password);
      await routeToWorkspace();
    } catch (err: unknown) {
      // Extract Firebase error code
      const errorCode = (err as { code?: string })?.code || "";
      setError(getFirebaseErrorMessage(errorCode));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await signInWithGoogle();
      await routeToWorkspace();
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || "";
      if (errorCode === "auth/popup-closed-by-user") {
        setError("Sign in cancelled. Please try again.");
      } else if (errorCode === "auth/popup-blocked") {
        setError("Pop-up blocked. Please allow pop-ups and try again.");
      } else {
        setError("Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Clear field error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  return (
    <AuthShell activeTab="login">
      <div className="animate-fade-in rounded-3xl border border-border-light bg-white p-6 shadow-soft-lg dark:border-border-dark dark:bg-card-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white sm:text-3xl">
            Welcome back 💜
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Sister missed you. Pick up right where you left off.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={handleEmailChange}
              required
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <span className="material-symbols-outlined text-sm">error</span>
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between px-1 pb-2">
              <label className="text-sm font-semibold leading-normal text-text-primary dark:text-white">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-primary"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <span className="material-symbols-outlined text-sm">error</span>
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-border-light dark:border-border-dark" />
          <span className="px-3 text-2xs font-semibold uppercase tracking-wider text-text-secondary">
            or continue with
          </span>
          <div className="flex-1 border-t border-border-light dark:border-border-dark" />
        </div>

        {/* Social options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="touch-target flex h-12 items-center justify-center gap-2 rounded-xl border border-border-light bg-background-light transition-all hover:bg-white hover:shadow-soft disabled:opacity-50 dark:border-border-dark dark:bg-background-dark dark:hover:bg-border-dark"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-semibold text-text-primary dark:text-white">
              Google
            </span>
          </button>
          <button
            disabled={loading}
            className="touch-target flex h-12 items-center justify-center gap-2 rounded-xl border border-border-light bg-background-light transition-all hover:bg-white hover:shadow-soft disabled:opacity-50 dark:border-border-dark dark:bg-background-dark dark:hover:bg-border-dark"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-white">
              phone_iphone
            </span>
            <span className="text-sm font-semibold text-text-primary dark:text-white">
              Phone
            </span>
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
