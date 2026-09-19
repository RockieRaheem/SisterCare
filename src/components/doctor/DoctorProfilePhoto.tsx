"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

export default function DoctorProfilePhoto() {
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/api/doctor/profile/photo", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Profile photo could not be loaded");
      setPhotoURL(result.data?.photoURL || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile photo could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG or WebP photo up to 3 MB.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("photo", file);
      const response = await authenticatedFetch("/api/doctor/profile/photo", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Photo upload failed");
      setPhotoURL(result.data?.photoURL || "");
      setMessage("Your new photo is visible on your verified doctor card.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/doctor/profile/photo", { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Photo removal failed");
      setPhotoURL("");
      setMessage("Your photo was removed from your verified doctor card.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo removal failed");
    } finally {
      setSaving(false);
    }
  };

  return <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:flex-row sm:items-center">
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
      {photoURL ? <Image src={photoURL} alt="Your doctor profile photo" fill sizes="80px" unoptimized className="object-cover" /> : <span className="material-symbols-outlined text-4xl" aria-hidden="true">person</span>}
    </div>
    <div className="min-w-0 flex-1">
      <h2 className="font-extrabold">Your verified doctor card</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">Members see this photo beside your verified credentials. Use a clear professional headshot, not a licence document.</p>
      {message && <p role="status" className="mt-2 text-sm text-primary-dark dark:text-primary-light">{message}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-primary px-4 text-sm font-bold text-white ${saving || loading ? "pointer-events-none opacity-50" : ""}`}>
        {saving ? "Saving…" : photoURL ? "Replace photo" : "Add photo"}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving || loading} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} className="sr-only" aria-label="Upload a professional profile photo" />
      </label>
      {photoURL && <button type="button" disabled={saving} onClick={() => void remove()} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold disabled:opacity-50 dark:border-slate-700">Remove</button>}
    </div>
  </section>;
}
