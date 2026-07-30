"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell";
import { auth } from "@/lib/authClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await auth.sendPasswordResetEmail(email);
      setMessage(
        "If this address has an email-and-password account, Supabase has sent a recovery link. Check spam and use the newest message.",
      );
    } catch (requestError) {
      const code = (requestError as { code?: string }).code || "";
      setError(
        code === "over_email_send_rate_limit" ||
          code === "over_request_rate_limit"
          ? "Too many recovery messages were requested. Wait a few minutes before trying again."
          : "The recovery service could not be reached. Check your connection and retry.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell activeTab="login">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
          We’ll send a secure recovery link if the account supports password sign-in.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
          Email address
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border-gray-300 dark:bg-gray-800"
            placeholder="you@example.com"
          />
        </label>
        <button
          disabled={submitting}
          className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send recovery link"}
        </button>
        {message && (
          <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-200">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </p>
        )}
        <Link href="/auth/login" className="block text-center text-sm font-semibold text-primary">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}
