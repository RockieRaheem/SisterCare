"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AuthShell from "@/components/layout/AuthShell";
import { resolveSignedInWorkspace } from "@/lib/workspaceClient";
import { auth } from "@/lib/authClient";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength checks
const checkPasswordStrength = (
  password: string,
): { score: number; feedback: string[] } => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push("At least 8 characters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("One uppercase letter");

  if (/[a-z]/.test(password)) score++;
  else feedback.push("One lowercase letter");

  if (/\d/.test(password)) score++;
  else feedback.push("One number");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  else feedback.push("One special character");

  return { score, feedback };
};

const getSignupErrorMessage = (errorCode: string, providerMessage?: string): string => {
  const errorMessages: Record<string, string> = {
    "auth/email-already-in-use":
      "An account with this email already exists. Please sign in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed":
      "Account creation is currently disabled. Please try again later.",
    "auth/weak-password":
      "Password is too weak. Please choose a stronger password.",
    "auth/network-request-failed":
      "Network error. Please check your internet connection.",
    "signup_disabled": "Account registration is currently disabled. Please contact SisterCare support.",
    "email_address_invalid": "Please enter a valid email address.",
    "weak_password": "Password is too weak. Please choose a stronger password.",
    "user_already_exists": "An account with this email already exists. Please sign in instead.",
  };
  return (
    errorMessages[errorCode] ||
    (providerMessage && providerMessage.length < 180
      ? providerMessage
      : "Failed to create account. Please try again.")
  );
};

export default function SignupPage() {
  const [registrationIntent, setRegistrationIntent] = useState<"member" | "counsellor">("member");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setRegistrationIntent(searchParams.get("type") === "counsellor" ? "counsellor" : "member");
  }, [searchParams]);

  const passwordStrength = checkPasswordStrength(password);

  const validateForm = useCallback((): boolean => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

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

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      if (accountCreated) {
        router.replace(await resolveSignedInWorkspace(registrationIntent));
        return;
      }
      const result = await signUp(email.trim().toLowerCase(), password, registrationIntent);
      if (result.emailConfirmationRequired) {
        setNotice("Check your email to confirm your account, then sign in to continue with SisterCare.");
        return;
      }
      setAccountCreated(true);
      router.replace(await resolveSignedInWorkspace(registrationIntent));
    } catch (err: unknown) {
      if (accountCreated || auth.currentUser) {
        setAccountCreated(true);
        setNotice("Your account was created successfully.");
        setError(
          "Your workspace is taking longer than expected to open. Select Continue to retry without creating another account.",
        );
        return;
      }
      const errorCode = (err as { code?: string })?.code || "";
      setError(getSignupErrorMessage(errorCode, (err as { message?: string })?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await signInWithGoogle(registrationIntent);
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

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  return (
    <AuthShell activeTab="signup">
      <div className="animate-fade-in rounded-3xl border border-border-light bg-white p-6 shadow-soft-lg dark:border-border-dark dark:bg-card-dark sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary dark:text-white sm:text-3xl">
            Meet your Sister 💗
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Two minutes to a space that&apos;s completely yours.
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

        {notice && (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-text-primary dark:text-white">
            <span className="material-symbols-outlined text-lg text-primary">mark_email_read</span>
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 px-1 text-sm font-semibold text-text-primary dark:text-white">
              I&apos;m joining SisterCare as
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-2xl border-2 p-4 transition ${registrationIntent === "member" ? "border-primary bg-primary/5" : "border-border-light dark:border-border-dark"}`}>
                <input type="radio" name="registrationIntent" value="member" checked={registrationIntent === "member"} onChange={() => setRegistrationIntent("member")} className="sr-only" />
                <span className="material-symbols-outlined text-primary">favorite</span>
                <span className="mt-2 block text-sm font-bold text-text-primary dark:text-white">Member</span>
                <span className="mt-1 block text-xs leading-5 text-text-secondary">Track your wellbeing and access private support.</span>
              </label>
              <label className={`cursor-pointer rounded-2xl border-2 p-4 transition ${registrationIntent === "counsellor" ? "border-primary bg-primary/5" : "border-border-light dark:border-border-dark"}`}>
                <input type="radio" name="registrationIntent" value="counsellor" checked={registrationIntent === "counsellor"} onChange={() => setRegistrationIntent("counsellor")} className="sr-only" />
                <span className="material-symbols-outlined text-primary">support_agent</span>
                <span className="mt-2 block text-sm font-bold text-text-primary dark:text-white">Counsellor</span>
                <span className="mt-1 block text-xs leading-5 text-text-secondary">Submit professional credentials for KYC review.</span>
              </label>
            </div>
            {registrationIntent === "counsellor" && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Counsellor access is granted only after an administrator verifies your KYC application.</p>}
          </fieldset>
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

          <div>
            <label className="block px-1 pb-2 text-sm font-semibold leading-normal text-text-primary dark:text-white">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="new-password"
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
            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2">
                <div className="mb-1 flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= passwordStrength.score
                          ? passwordStrength.score <= 2
                            ? "bg-red-500"
                            : passwordStrength.score <= 3
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {passwordStrength.score <= 2
                    ? "Weak"
                    : passwordStrength.score <= 3
                      ? "Fair"
                      : passwordStrength.score <= 4
                        ? "Good"
                        : "Strong"}
                  {passwordStrength.feedback.length > 0 &&
                    ` - Missing: ${passwordStrength.feedback.slice(0, 2).join(", ")}`}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block px-1 pb-2 text-sm font-semibold leading-normal text-text-primary dark:text-white">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-primary"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                <span className="material-symbols-outlined text-xl">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                <span className="material-symbols-outlined text-sm">error</span>
                {fieldErrors.confirmPassword}
              </p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 flex items-center gap-1 text-xs text-green-500">
                <span className="material-symbols-outlined text-sm">
                  check_circle
                </span>
                Passwords match
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 py-2">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 rounded border-primary/30 text-primary focus:ring-primary"
              id="terms-checkbox"
            />
            <label
              htmlFor="terms-checkbox"
              className="cursor-pointer text-xs text-text-secondary"
            >
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating account...
              </span>
            ) : (
              accountCreated
                ? "Continue to SisterCare"
                : registrationIntent === "counsellor"
                  ? "Create counsellor application"
                  : "Create My Safe Space"
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
