"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell";
import { auth } from "@/lib/authClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await auth.updatePassword(password);
      await auth.signOut();
      setComplete(true);
      setPassword("");
      setConfirmation("");
    } catch (updateError) {
      const code = (updateError as { code?: string }).code || "";
      setError(
        code === "same_password"
          ? "Choose a password different from the current password."
          : code === "weak_password"
            ? "Choose a stronger password with a mix of letters, numbers, and symbols."
            : "This recovery link is invalid, expired, or was opened in a different tab. Request a new link and use the newest email.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell activeTab="login">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Choose a new password</h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
          The recovery link securely authorises this one password change.
        </p>
      </div>
      {complete ? (
        <div className="space-y-5 text-center">
          <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
            Your password was updated. Sign in again with the new password.
          </p>
          <Link href="/auth/login" className="inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            New password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border-gray-300 dark:bg-gray-800"
            />
          </label>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border-gray-300 dark:bg-gray-800"
            />
          </label>
          <button
            disabled={submitting}
            className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
}
