"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="flex justify-center py-5">
        <div className="flex flex-col max-w-[1200px] flex-1 px-6">
          <header className="flex items-center justify-between whitespace-nowrap border-b border-primary/10 py-3">
            <Link href="/" className="flex items-center gap-4 text-primary">
              <span className="material-symbols-outlined text-3xl">
                favorite
              </span>
              <h2 className="text-text-primary dark:text-white text-xl font-bold leading-tight tracking-tight">
                SisterCare
              </h2>
            </Link>
            <div className="flex flex-1 justify-end gap-8">
              <div className="hidden md:flex items-center gap-9">
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
      <main className="flex flex-1 justify-center items-center py-12 px-4">
        <div className="flex flex-col max-w-[480px] w-full bg-white dark:bg-card-dark rounded-xl shadow-2xl shadow-primary/5 p-8 border border-primary/5">
          {/* Headline Section */}
          <div className="flex flex-col items-center">
            <div className="mb-6 p-4 bg-primary/10 rounded-full">
              <span className="material-symbols-outlined text-primary text-4xl">
                person_add
              </span>
            </div>
            <h1 className="text-text-primary dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center pb-2">
              Join SisterCare
            </h1>
            <p className="text-text-secondary text-base font-normal leading-normal text-center mb-8">
              Start your journey towards better menstrual health and emotional
              well-being.
            </p>
          </div>

          {/* Toggle Section */}
          <div className="flex px-0 py-3 mb-4 w-full">
            <div className="flex h-12 flex-1 items-center justify-center rounded-xl bg-background-light dark:bg-background-dark p-1.5 border border-primary/10">
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
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="flex items-start gap-2 py-2">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-primary/30 text-primary focus:ring-primary"
              />
              <p className="text-text-secondary text-xs">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>

            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Trust Message */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 rounded-lg border border-primary/5">
            <span className="material-symbols-outlined text-primary text-lg">
              verified_user
            </span>
            <p className="text-text-secondary text-xs font-medium leading-normal">
              Your data is encrypted and private. We never share your health
              info.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-primary/10" />
            <span className="px-3 text-text-secondary text-xs font-semibold uppercase tracking-wider">
              or continue with
            </span>
            <div className="flex-1 border-t border-primary/10" />
          </div>

          {/* Social Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-12 rounded-xl border border-primary/10 bg-background-light dark:bg-background-dark hover:bg-white dark:hover:bg-border-dark transition-all disabled:opacity-50"
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
              className="flex items-center justify-center gap-2 h-12 rounded-xl border border-primary/10 bg-background-light dark:bg-background-dark hover:bg-white dark:hover:bg-border-dark transition-all disabled:opacity-50"
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
      <footer className="flex justify-center py-8">
        <div className="flex items-center gap-6 opacity-40">
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
