"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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

// Firebase error messages mapping
const getFirebaseErrorMessage = (errorCode: string): string => {
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
  };
  return (
    errorMessages[errorCode] || "Failed to create account. Please try again."
  );
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

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
      await signUp(email.trim().toLowerCase(), password);
      router.push("/dashboard");
    } catch (err: unknown) {
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
      router.push("/dashboard");
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <div className="flex justify-center py-4 sm:py-5 safe-top">
        <div className="flex flex-col max-w-[1200px] flex-1 px-4 sm:px-6">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-primary/10 py-2 sm:py-3">
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-4 text-primary"
            >
              <span
                className="material-symbols-outlined text-2xl sm:text-3xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                favorite
              </span>
              <h2 className="text-text-primary dark:text-white text-lg sm:text-xl font-bold leading-tight tracking-tight">
                SisterCare
              </h2>
            </Link>
            <div className="flex flex-1 justify-end gap-4 sm:gap-8">
              <div className="hidden sm:flex items-center gap-9">
                <Link
                  href="/"
                  className="text-text-primary dark:text-gray-300 text-sm font-medium leading-normal hover:text-primary transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/library"
                  className="text-text-primary dark:text-gray-300 text-sm font-medium leading-normal hover:text-primary transition-colors"
                >
                  Resources
                </Link>
              </div>
            </div>
          </header>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 justify-center items-start sm:items-center py-6 sm:py-12 px-4">
        <div className="flex flex-col max-w-[480px] w-full bg-white dark:bg-card-dark rounded-2xl shadow-2xl shadow-primary/5 p-5 sm:p-8 border border-primary/5">
          {/* Headline Section */}
          <div className="flex flex-col items-center">
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl">
                person_add
              </span>
            </div>
            <h1 className="text-text-primary dark:text-white tracking-tight text-2xl sm:text-[32px] font-bold leading-tight text-center pb-2">
              Join SisterCare
            </h1>
            <p className="text-text-secondary text-sm sm:text-base font-normal leading-normal text-center mb-6 sm:mb-8">
              Start your journey towards better menstrual health and emotional
              well-being.
            </p>
          </div>

          {/* Toggle Section */}
          <div className="flex py-2 sm:py-3 mb-3 sm:mb-4 w-full">
            <div className="flex h-11 sm:h-12 flex-1 items-center justify-center rounded-xl bg-background-light dark:bg-background-dark p-1 sm:p-1.5 border border-primary/10">
              <Link
                href="/auth/login"
                className="flex h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-text-secondary hover:text-primary transition-colors"
              >
                <span className="text-sm font-semibold">Login</span>
              </Link>
              <div className="flex h-full grow items-center justify-center overflow-hidden rounded-lg px-2 bg-white dark:bg-border-dark shadow-sm text-primary">
                <span className="text-sm font-semibold">Sign Up</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 sm:space-y-4 mb-4 sm:mb-6"
          >
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
                <p className="mt-1 text-red-500 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    error
                  </span>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-text-primary dark:text-white text-sm font-semibold leading-normal pb-2 px-1">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-red-500 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    error
                  </span>
                  {fieldErrors.password}
                </p>
              )}
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
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
              <label className="block text-text-primary dark:text-white text-sm font-semibold leading-normal pb-2 px-1">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-red-500 text-xs flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    error
                  </span>
                  {fieldErrors.confirmPassword}
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-green-500 text-xs flex items-center gap-1">
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
                className="text-text-secondary text-xs cursor-pointer"
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
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Trust Message */}
          <div className="flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 bg-primary/5 rounded-xl border border-primary/5">
            <span className="material-symbols-outlined text-primary text-base sm:text-lg flex-shrink-0">
              verified_user
            </span>
            <p className="text-text-secondary text-[11px] sm:text-xs font-medium leading-normal">
              Your data is encrypted and private. We never share your health
              info.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-4 sm:my-6">
            <div className="flex-1 border-t border-primary/10" />
            <span className="px-3 text-text-secondary text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 border-t border-primary/10" />
          </div>

          {/* Social Options */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 sm:h-12 rounded-xl border border-primary/10 bg-background-light dark:bg-background-dark hover:bg-white dark:hover:bg-border-dark transition-all disabled:opacity-50 touch-target"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              className="flex items-center justify-center gap-2 h-11 sm:h-12 rounded-xl border border-primary/10 bg-background-light dark:bg-background-dark hover:bg-white dark:hover:bg-border-dark transition-all disabled:opacity-50 touch-target"
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
      </main>

      {/* Footer */}
      <footer className="flex justify-center py-6 sm:py-8 safe-bottom">
        <div className="flex items-center gap-4 sm:gap-6 opacity-40">
          <div className="h-px w-12 bg-primary" />
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-primary">
              security
            </span>
            <span className="material-symbols-outlined text-primary">
              shield
            </span>
            <span className="material-symbols-outlined text-primary">
              verified
            </span>
          </div>
          <div className="h-px w-12 bg-primary" />
        </div>
      </footer>
    </div>
  );
}
