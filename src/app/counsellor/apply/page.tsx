"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import CounsellorShell from "@/components/counsellor/CounsellorShell";
import { auth } from "@/lib/firebase";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { COUNSELLOR_SPECIALTIES } from "@/lib/counsellors";

async function authorisedFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in before applying.");
  return fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
}

export default function CounsellorApplicationPage() {
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [form, setForm] = useState({
    name: "", title: "", bio: "", legalName: "", registrationNumber: "", credentialType: "", credentialExpiresAt: "", phoneNumber: "", photoURL: "", documentPaths: [] as string[], languages: "English", specializations: [] as string[],
  });

  useEffect(() => {
    authorisedFetch("/api/counsellor/application").then((response) => response.json()).then((result) => {
      if (result.data?.application?.status) setStatus(result.data.application.status);
    }).catch(() => {});
  }, []);

  const set = (key: keyof typeof form, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setStatus("Use a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    const uid = auth.currentUser?.uid;
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
    const uid = auth.currentUser?.uid;
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
      const response = await authorisedFetch("/api/counsellor/application", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          languages: form.languages.split(",").map((item) => item.trim()).filter(Boolean),
          documentReferences: form.documentPaths,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit your application.");
      setStatus("pending");
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
      {status === "pending" || status === "verified" ? <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-text-primary dark:text-white">{status === "verified" ? "Your KYC has been approved. Sign out and back in to activate your counsellor portal." : "Your KYC application is awaiting review. We will not show your profile or route users to you until it is approved."}</div> : <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-card-dark">
        <section className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {photoPreview ? <img src={photoPreview} alt="Professional profile preview" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><span className="material-symbols-outlined">add_a_photo</span></div>}
            <div className="min-w-0 flex-1">
              <label className="block text-sm font-semibold text-gray-800 dark:text-white">Professional profile photo
                <input required type="file" accept="image/*" capture="user" onChange={(event) => uploadPhoto(event.target.files?.[0])} className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white dark:text-gray-300" />
              </label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use a clear headshot. JPG, PNG, or WebP up to 5 MB. This is shown on your verified profile; it is separate from your private KYC documents.</p>
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
        <section className="rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700"><label className="block text-sm font-semibold text-gray-800 dark:text-white">Private KYC documents<input required type="file" multiple accept="application/pdf,image/*" onChange={(event) => uploadDocuments(event.target.files)} className="mt-2 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white dark:text-gray-300" /></label><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Upload your registration, licence, or credential evidence. PDF, JPG, PNG, or WebP; up to 10 MB each. Only an authorised reviewer can open these files.</p>{form.documentPaths.length > 0 && <ul className="mt-3 space-y-1 text-sm text-green-800 dark:text-green-300">{form.documentPaths.map((path, index) => <li key={path}>Document {index + 1} uploaded securely</li>)}</ul>}{documentsUploading && <p className="mt-3 text-sm text-primary">Uploading secure documents...</p>}</section>
        {status && <p className="text-sm text-red-700">{status}</p>}
        <button disabled={submitting || photoUploading || documentsUploading || form.documentPaths.length === 0} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Submitting..." : "Submit for KYC review"}</button>
      </form>}
    </div>
  </CounsellorShell>;
}
