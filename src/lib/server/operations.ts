import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const STALE_AFTER_MS = 20 * 60 * 1000;

export async function recordMaintenanceRun(
  job: "session_sweep" | "availability_sync",
  success: boolean,
  details: Record<string, number> = {},
) {
  const { error } = await getSupabaseAdmin().from("operations_heartbeats").upsert({
    job,
    success,
    details,
    ran_at: new Date().toISOString(),
  }, { onConflict: "job" });
  if (error) throw new Error(error.message);
}

export async function getMaintenanceReadiness(now = Date.now()): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("operations_heartbeats")
      .select("job, success, ran_at");
    if (error) return false;
    const byId = new Map((data || []).map((row) => [row.job, row]));
    return ["session_sweep", "availability_sync"].every((job) => {
      const heartbeat = byId.get(job);
      const ranAt = heartbeat?.ran_at ? new Date(heartbeat.ran_at).getTime() : 0;
      return heartbeat?.success === true && ranAt > 0 && now - ranAt <= STALE_AFTER_MS;
    });
  } catch {
    return false;
  }
}
