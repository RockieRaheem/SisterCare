"use client";

import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { readApiResponse } from "@/lib/apiResponse";
import type { SymptomLog } from "@/types";

type SymptomsResult = {
  success: boolean;
  error?: string;
  data?: { symptoms: Array<Omit<SymptomLog, "date" | "createdAt" | "mood" | "notes"> & { date: string; createdAt: string }> };
};

export async function getPrivateSymptoms(days: 7 | 30 | 90 = 90): Promise<SymptomLog[]> {
  const response = await authenticatedFetch(`/api/symptoms?days=${days}`);
  const result = await readApiResponse<SymptomsResult>(response);
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.error || "Could not load your physical symptom history.");
  }
  return result.data.symptoms.map((entry) => ({
    ...entry,
    date: new Date(entry.date),
    createdAt: new Date(entry.createdAt),
    mood: "okay",
    notes: "",
  }));
}

export async function deletePrivateSymptoms(ids: string[]): Promise<void> {
  const response = await authenticatedFetch("/api/symptoms", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const result = await readApiResponse<{ success: boolean; error?: string }>(response);
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Could not remove that physical symptom entry.");
  }
}
