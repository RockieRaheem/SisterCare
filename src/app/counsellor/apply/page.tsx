"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { COUNSELLOR_SPECIALTIES } from "@/lib/counsellors";
import { useAuth } from "@/context/AuthContext";
import { readApiResponse } from "@/lib/apiResponse";

type ApplicationDraft = {
  name: string;
  title: string;
  bio: string;
  legalName: string;
  registrationNumber: string;
  credentialType: string;
  credentialExpiresAt: string;
  phoneNumber: string;
  photoURL: string;
  documentPaths: string[];
  languages: string;
  specializations: string[];
};

type SavedApplication = {
  status: "pending" | "verified" | "rejected";
  profile?: {
    name?: string;
    title?: string;
    bio?: string;
    photoURL?: string;
    specializations?: string[];
    languages?: string[];
    phoneNumber?: string;
  };
  legalName?: string;
  registrationNumber?: string;
  credentialType?: string;
  credentialExpiresAt?: string;
  documentReferences?: string[];
  reviewNote?: string | null;
};

const emptyDraft = (): ApplicationDraft => ({
  name: "",
  title: "",
  bio: "",
  legalName: "",
  registrationNumber: "",
  credentialType: "",
  credentialExpiresAt: "",
  phoneNumber: "",
  photoURL: "",
  documentPaths: [],
  languages: "English",
  specializations: [],
});

function draftFromApplication(application: SavedApplication): ApplicationDraft {
  return {
    name: application.profile?.name || "",
    title: application.profile?.title || "",
    bio: application.profile?.bio || "",
    legalName: application.legalName || "",
    registrationNumber: application.registrationNumber || "",
    credentialType: application.credentialType || "",
    credentialExpiresAt: application.credentialExpiresAt
      ? application.credentialExpiresAt.slice(0, 10)
      : "",
    phoneNumber: application.profile?.phoneNumber || "",
    photoURL: application.profile?.photoURL || "",
    documentPaths: application.documentReferences || [],
    languages: application.profile?.languages?.join(", ") || "English",
    specializations: application.profile?.specializations || [],
  };
}

export default function CounsellorApplicationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [reviewStatus, setReviewStatus] = useState<
    "pending" | "verified" | "rejected" | ""
  >("");
  const [savedApplication, setSavedApplication] =
    useState<SavedApplication | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [form, setForm] = useState<ApplicationDraft>(emptyDraft);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/auth/login?next=/counsellor/apply"); return; }
    if (!user) return;
    void (async () => {
      const token = await getSupabaseBrowserClient()
        .auth.getSession()
        .then(({ data }) => data.session?.access_token);
      if (!token) return;
      const response = await fetch("/api/counsellor/application", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readApiResponse<{
        success: boolean;
        error?: string;
        data?: { application: SavedApplication | null };
      }>(response);
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not load your application.");
      }
      const application = result.data?.application || null;
      if (!application) return;
      setSavedApplication(application);
      setReviewStatus(application.status);
      if (
        application.status === "rejected" &&
        new URLSearchParams(window.location.search).get("mode") !== "fresh"
      ) {
        setForm(draftFromApplication(application));
      }
    })();
  }, [authLoading, router, user]);

  const set = (key: keyof typeof form, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setStatus("Use a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    const uid = await getSupabaseBrowserClient().auth.getUser().then(({ data }) => data.user?.id || null);
    if (!uid) {
      setStatus("Please sign in before uploading a photo.");
      return;
    }
    setPhotoUploading(true);
    setStatus("");
    try {
      const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `${uid}/profile-${Date.now()}.${extension}`;
      const { error } = await getSupabaseBrowserClient().storage.from("counsellor-profile").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      // Keep a storage path rather than a durable public URL. Admin review and
      // the published directory issue authorised short-lived URLs later.
      setForm((current) => ({ ...current, photoURL: path }));
      setPhotoPreview(URL.createObjectURL(file));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not upload your photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const uploadDocuments = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 5 - form.documentPaths.length);
    if (!selected.length) { setStatus("You can submit up to five KYC documents."); return; }
    if (selected.some((file) => (file.type !== "application/pdf" && !file.type.startsWith("image/")) || file.size > 10 * 1024 * 1024)) { setStatus("Use PDF or image documents smaller than 10 MB."); return; }
    const uid = await getSupabaseBrowserClient().auth.getUser().then(({ data }) => data.user?.id || null);
    if (!uid) { setStatus("Please sign in before uploading KYC documents."); return; }
    setDocumentsUploading(true); setStatus("");
    try {
      const paths = await Promise.all(selected.map(async (file, index) => {
        const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
        const path = `${uid}/${Date.now()}-${index}.${extension}`;
        const { error } = await getSupabaseBrowserClient().storage.from("counsellor-kyc").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        return path;
      }));
      setForm((current) => ({ ...current, documentPaths: [...current.documentPaths, ...paths] }));
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not upload KYC documents."); } finally { setDocumentsUploading(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("");
    try {
      if (!form.photoURL) throw new Error("Add a professional profile photo before submitting your application.");
      const { data: sessionData } = await getSupabaseBrowserClient().auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) throw new Error("Your session has expired. Please sign in again before submitting KYC.");
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/counsellor/application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          bio: form.bio,
          legalName: form.legalName,
          registrationNumber: form.registrationNumber,
          credentialType: form.credentialType,
          credentialExpiresAt: form.credentialExpiresAt,
          phoneNumber: form.phoneNumber,
          photoURL: form.photoURL,
          documentReferences: form.documentPaths,
          languages: form.languages
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          specializations: form.specializations,
        }),
      });
      const result = await readApiResponse<{ success: boolean; error?: string }>(
        response,
      );
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not submit your application.");
      }
      setReviewStatus("pending");
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  const textFields: Array<[keyof typeof form, string]> = [
    ["name", "Professional name"], ["title", "Professional title"], ["legalName", "Legal name"], ["registrationNumber", "Registration or licence number"], ["credentialType", "Credential type"], ["phoneNumber", "Professional phone number"],
  ];

  return <CounsellorShell>
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/counsellor" className="text-sm font-medium text-primary">Back to counsellor portal</Link>
      <h1 className="mt-4 text-3xl font-bold text-text-primary dark:text-white">Join the care network</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Your application stays private until an authorised reviewer completes KYC. Approval creates your counsellor profile, but you remain offline until you sign in and choose Available.</p>
      {reviewStatus === "pending" || reviewStatus === "verified" ? <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-text-primary dark:text-white">{reviewStatus === "verified" ? "Your KYC has been approved. Sign out and back in to activate your counsellor portal." : "Your updated KYC application is awaiting review. We will not show your profile or route users to you until it is approved."}</div> : <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
        {reviewStatus === "rejected" && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-bold">Revise and resubmit your application</p><p className="mt-1 text-sm leading-6">{savedApplication?.reviewNote || "Review the previous details, correct the issue, and submit again for a new administrator review."}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => savedApplication && setForm(draftFromApplication(savedApplication))} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm dark:bg-gray-900 dark:text-amber-100">Restore previous details</button><button type="button" onClick={() => { setForm(emptyDraft()); setPhotoPreview(""); setStatus("A fresh application form is ready."); }} className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:text-amber-100">Start afresh</button></div></section>}
        <section className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {photoPreview ? <img src={photoPreview} alt="Professional profile preview" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><span className="material-symbols-outlined">add_a_photo</span></div>}
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-semibold text-gray-800 dark:text-white">Professional profile photo
                <input type="file" accept="image/*" capture="user" onChange={(event) => uploadPhoto(event.target.files?.[0])} className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white dark:text-gray-300" />
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{form.photoURL && !photoPreview ? "Your previously uploaded profile photo is retained. Choose another file only if you want to replace it." : "Use a clear headshot. JPG, PNG, or WebP up to 5 MB. This is shown on your verified profile; it is separate from your private KYC documents."}</p>
            </div>
          </div>
          {photoUploading && <p className="mt-3 text-sm text-primary">Uploading your photo...</p>}
        </section>
        <div className="grid gap-4 sm:grid-cols-2">
          {textFields.map(([key, label]) => <label key={key} className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}<input required value={form[key] as string} onChange={(event) => set(key, event.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>)}
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Credential expiry<input required type="date" value={form.credentialExpiresAt} onChange={(event) => set("credentialExpiresAt", event.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Professional bio<textarea required rows={4} value={form.bio} onChange={(event) => set("bio", event.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Languages, separated by commas<input required value={form.languages} onChange={(event) => set("languages", event.target.value)} className="mt-1 w-full rounded-xl border-gray-300 dark:bg-gray-800" /></label>
        <fieldset><legend className="text-sm font-medium text-gray-700 dark:text-gray-200">Areas of practice</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{COUNSELLOR_SPECIALTIES.map((specialty) => <label key={specialty} className="text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={form.specializations.includes(specialty)} onChange={(event) => set("specializations", event.target.checked ? [...form.specializations, specialty] : form.specializations.filter((item) => item !== specialty))} className="mr-2" />{specialty}</label>)}</div></fieldset>
        <section className="rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700"><label className="block text-sm font-semibold text-gray-800 dark:text-white">Private KYC documents<input type="file" multiple accept="application/pdf,image/*" onChange={(event) => uploadDocuments(event.target.files)} className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white dark:text-gray-300" /></label><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload your registration, licence, or credential evidence. PDF, JPG, PNG, or WebP; up to 10 MB each. Only an authorised reviewer can open these files.</p>{form.documentPaths.length > 0 && <ul className="mt-3 space-y-1 text-sm text-green-800 dark:text-green-300">{form.documentPaths.map((path, index) => <li key={path}>Document {index + 1} uploaded securely</li>)}</ul>}{documentsUploading && <p className="mt-3 text-sm text-primary">Uploading secure documents...</p>}</section>
        {status && <p className="text-sm text-red-700">{status}</p>}
        <button disabled={submitting || photoUploading || documentsUploading || form.documentPaths.length === 0} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Submitting..." : "Submit for KYC review"}</button>
      </form>}
    </div>
  </CounsellorShell>;
}
