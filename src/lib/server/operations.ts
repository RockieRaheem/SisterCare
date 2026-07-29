import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Vercel Hobby runs scheduled work at most once per day. A 36-hour window
// tolerates its documented hourly execution imprecision and one delayed run.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const REQUIRED_TABLES = [
  "profiles",
  "counsellors",
  "counsellor_applications",
  "counselling_sessions",
  "library_articles",
  "audit_events",
  "incidents",
  "metrics_daily",
  "operations_heartbeats",
  "rate_limits",
] as const;

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

/** Confirm that every production data domain is visible to the server role. */
export async function getDatabaseReadiness(): Promise<boolean> {
  try {
    const client = getSupabaseAdmin();
    const [tables, sessionColumns, articleColumns, matchingFunction] =
      await Promise.all([
        Promise.all(
          REQUIRED_TABLES.map((table) =>
            client.from(table).select("*", { count: "exact", head: true }),
          ),
        ),
        client
          .from("counselling_sessions")
          .select(
            "matched_at,accepted_at,active_at,completed_at,time_to_human_seconds,match_attempts,declined_by",
            { head: true },
          ),
        client
          .from("library_articles")
          .select(
            "reviewed_by,reviewed_at,published_at,tags,cover_image_url",
            { head: true },
          ),
        client.rpc("claim_counselling_session", {
          target_session_id: "00000000-0000-0000-0000-000000000000",
          target_counsellor_id: "00000000-0000-0000-0000-000000000000",
          target_counsellor_name: "Readiness probe",
        }),
      ]);
    const checks = [
      ...tables,
      sessionColumns,
      articleColumns,
      matchingFunction,
    ];
    return checks.every((result) => !result.error);
  } catch {
    return false;
  }
}
