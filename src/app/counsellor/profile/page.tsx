"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { OperationsPageHeader } from "@/components/operations/OperationsUI";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { readApiResponse } from "@/lib/apiResponse";
import { COUNSELLOR_SPECIALTIES } from "@/lib/counsellors";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CounsellorSpecialty } from "@/types";

type ProfileForm = {
  name: string;
  title: string;
  bio: string;
  languages: string;
  specializations: CounsellorSpecialty[];
  photoURL: string | null;
};

type ProfileResponse = {
  success: boolean;
  error?: string;
  data?: {
    profile: {
      name: string;
      title: string;
      bio: string;
      languages: string[];
      specializations: CounsellorSpecialty[];
      photoURL: string | null;
      photoPreviewUrl?: string;
    };
  };
};

const emptyProfile: ProfileForm = {
  name: "",
  title: "",
  bio: "",
  languages: "English",
  specializations: [],
  photoURL: null,
};

export default function CounsellorProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const objectUrl = useRef("");
  const [form, setForm] = useState<ProfileForm>(emptyProfile);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login?next=/counsellor/profile");
      return;
    }
    if (!user) return;
    void (async () => {
      setLoading(true);
      try {
        const response = await authenticatedFetch("/api/counsellor/profile", {
          cache: "no-store",
        });
        const result = await readApiResponse<ProfileResponse>(response);
        if (!response.ok || !result.success || !result.data?.profile) {
          throw new Error(result.error || "Could not load your professional profile.");
        }
        const profile = result.data.profile;
        setForm({
          name: profile.name,
          title: profile.title,
          bio: profile.bio,
          languages: profile.languages.join(", "),
          specializations: profile.specializations,
          photoURL: profile.photoURL,
        });
        setPhotoPreview(profile.photoPreviewUrl || "");
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "Could not load your professional profile.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, router, user]);

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage({
        tone: "error",
        text: "Choose a JPG, PNG, or WebP photo smaller than 5 MB.",
      });
      return;
    }
    if (!user) {
      setMessage({ tone: "error", text: "Please sign in again before uploading." });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[file.type];
      const path = `${user.uid}/profile-${crypto.randomUUID()}.${extension}`;
      const result = await getSupabaseBrowserClient()
        .storage
        .from("counsellor-profile")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw result.error;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(file);
      setPhotoPreview(objectUrl.current);
      setForm((current) => ({ ...current, photoURL: path }));
      setMessage({
        tone: "success",
        text: "Photo ready. Save changes to publish it.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not upload the photo.",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = "";
    }
    setForm((current) => ({ ...current, photoURL: null }));
    setPhotoPreview("");
    setMessage({
      tone: "success",
      text: "Photo will be removed when you save changes.",
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await authenticatedFetch("/api/counsellor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          languages: form.languages
            .split(",")
            .map((language) => language.trim())
            .filter(Boolean),
        }),
      });
      const result = await readApiResponse<ProfileResponse>(response);
      if (!response.ok || !result.success || !result.data?.profile) {
        throw new Error(result.error || "Could not save your profile.");
      }
      const profile = result.data.profile;
      setForm({
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
        languages: profile.languages.join(", "),
        specializations: profile.specializations,
        photoURL: profile.photoURL,
      });
      setPhotoPreview(profile.photoPreviewUrl || "");
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = "";
      }
      setMessage({
        tone: "success",
        text: "Your professional profile is now updated.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not save your profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <CounsellorShell>
      <OperationsPageHeader
        eyebrow="Professional identity"
        title="Your public profile"
        description="Keep the information members use to choose a counsellor clear and current. Credential and verification details remain protected from self-editing."
      />

      <form
        onSubmit={submit}
        className="mx-auto max-w-4xl space-y-6"
        aria-busy={loading || saving || uploading}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-primary/10">
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Professional profile preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl" aria-hidden="true">
                    person
                  </span>
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-slate-950 dark:text-white">
                Professional profile photo
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Use a clear, current headshot. Members see this photo in the verified counsellor directory.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-dark focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    photo_library
                  </span>
                  {photoPreview ? "Replace photo" : "Add photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      void uploadPhoto(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-primary/40 hover:text-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    photo_camera
                  </span>
                  Take photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => {
                      void uploadPhoto(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {(photoPreview || form.photoURL) && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={uploading}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                      delete
                    </span>
                    Remove
                  </button>
                )}
              </div>
              {uploading && (
                <p className="mt-3 text-sm font-semibold text-primary">
                  Uploading photo…
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Professional name
              <input
                required
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Professional title
              <input
                required
                maxLength={100}
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
          <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
            Professional bio
            <textarea
              required
              minLength={10}
              maxLength={1200}
              rows={5}
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({ ...current, bio: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900"
            />
            <span className="mt-1 block text-right text-xs font-medium text-slate-400">
              {form.bio.length}/1200
            </span>
          </label>
          <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
            Languages
            <input
              required
              value={form.languages}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  languages: event.target.value,
                }))
              }
              placeholder="English, Luganda"
              className="mt-2 w-full rounded-xl border-slate-300 text-base dark:border-slate-700 dark:bg-slate-900"
            />
            <span className="mt-1 block text-xs font-medium text-slate-400">
              Separate languages with commas.
            </span>
          </label>
        </section>

        <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#1b1922] sm:p-6">
          <legend className="px-2 text-sm font-extrabold text-slate-950 dark:text-white">
            Areas of practice
          </legend>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Choose up to five verified areas that best describe the support you provide.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {COUNSELLOR_SPECIALTIES.map((specialty) => {
              const checked = form.specializations.includes(specialty);
              const atLimit = form.specializations.length >= 5;
              return (
                <label
                  key={specialty}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    checked
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && atLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        specializations: event.target.checked
                          ? [...current.specializations, specialty]
                          : current.specializations.filter(
                              (item) => item !== specialty,
                            ),
                      }))
                    }
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  {specialty}
                </label>
              );
            })}
          </div>
        </fieldset>

        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm font-semibold ${
              message.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="sticky bottom-3 z-20 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-[#1b1922]/95">
          <button
            type="submit"
            disabled={loading || saving || uploading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {saving ? "progress_activity" : "save"}
            </span>
            {saving ? "Saving changes…" : "Save profile"}
          </button>
        </div>
      </form>
    </CounsellorShell>
  );
}
