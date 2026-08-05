import { sendPresence } from "@/lib/sessionsClient";

export async function markCounsellorOfflineBeforeSignOut(
  role: string | undefined,
  updatePresence: typeof sendPresence = sendPresence,
): Promise<boolean> {
  if (role !== "counsellor") return true;
  try {
    await updatePresence("offline");
    return true;
  } catch {
    return false;
  }
}
