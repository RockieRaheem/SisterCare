import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Vercel Hobby runs scheduled work at most once per day. A 36-hour window
// tolerates its documented hourly execution imprecision and one delayed run.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const REQUIRED_TABLES = [
  "profiles",
  "counsellors",
  "counsellor_applications",
  "counselling_sessions",
  "session_audio_calls",
  "library_articles",
  "audit_events",
  "incidents",
  "metrics_daily",
  "operations_heartbeats",
  "rate_limits",
  "safety_duty_roster",
  "care_notifications",
  "care_outcomes",
  "care_followups",
  "doctors",
  "doctor_appointments",
  "doctor_prescriptions",
  "doctor_messages",
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

export async function getMaintenanceReadinessReport(now = Date.now()): Promise<{
  ready: boolean;
  failedJobs: string[];
}> {
  if (process.env.NODE_ENV !== "production") return { ready: true, failedJobs: [] };
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("operations_heartbeats")
      .select("job, success, ran_at");
    if (error) return { ready: false, failedJobs: ["maintenance_store"] };
    const byId = new Map((data || []).map((row) => [row.job, row]));
    const failedJobs = ["session_sweep", "availability_sync"].filter((job) => {
      const heartbeat = byId.get(job);
      const ranAt = heartbeat?.ran_at ? new Date(heartbeat.ran_at).getTime() : 0;
      return heartbeat?.success !== true || ranAt <= 0 || now - ranAt > STALE_AFTER_MS;
    });
    return { ready: failedJobs.length === 0, failedJobs };
  } catch {
    return { ready: false, failedJobs: ["maintenance_store"] };
  }
}

export async function getMaintenanceReadiness(now = Date.now()): Promise<boolean> {
  return (await getMaintenanceReadinessReport(now)).ready;
}

export async function getSafetyCoverageReadiness(): Promise<boolean> {
  // Pilot deployments may operate without a continuously staffed duty roster.
  // When strict enforcement is enabled, the live roster remains mandatory.
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ENFORCE_SAFETY_DUTY !== "true"
  ) return true;
  
  try {
    const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
    const { data, error } = await getSupabaseAdmin()
      .from("safety_duty_roster")
      .select("responder_id")
      .eq("active", true)
      .gte("heartbeat_at", cutoff)
      .limit(1)
      .maybeSingle();
    return !error && Boolean(data?.responder_id);
  } catch {
    return false;
  }
}

/** Only stable probe names are returned; raw database errors remain server-side. */
export async function getDatabaseReadinessReport(): Promise<{
  ready: boolean;
  failedChecks: string[];
}> {
  try {
    const client = getSupabaseAdmin();
    const checks = [
      ...REQUIRED_TABLES.map((table) => ({
        name: `table:${table}`,
        run: () => client.from(table).select("*", { count: "exact", head: true }),
      })),
      {
        name: "columns:counselling_sessions",
        run: () => client
          .from("counselling_sessions")
          .select(
            "matched_at,accepted_at,active_at,completed_at,time_to_human_seconds,match_attempts,declined_by",
            { head: true },
          ),
      },
      {
        name: "columns:session_audio_calls",
        run: () => client
          .from("session_audio_calls")
          .select(
            "room_expires_at,member_joined_at,member_left_at,counsellor_joined_at,counsellor_left_at",
            { head: true },
          ),
      },
      {
        name: "columns:library_articles",
        run: () => client
          .from("library_articles")
          .select(
            "reviewed_by,reviewed_at,published_at,tags,cover_image_url",
            { head: true },
          ),
      },
      {
        name: "columns:doctor_prescriptions",
        run: () => client
          .from("doctor_prescriptions")
          .select("voided_at,voided_by,void_reason", { head: true }),
      },
      {
        name: "relationship:doctors_profile",
        run: () => client
          .from("doctors")
          .select("id,profiles:profiles!doctors_id_fkey(email)", { head: true }),
      },
      {
        name: "function:claim_counselling_session",
        run: () => client.rpc("claim_counselling_session", {
          target_session_id: "00000000-0000-0000-0000-000000000000",
          target_counsellor_id: "00000000-0000-0000-0000-000000000000",
          target_counsellor_name: "Readiness probe",
        }),
      },
    ];
    const results = await Promise.all(checks.map(async (check) => {
      try {
        const result = await check.run();
        return result.error ? check.name : null;
      } catch {
        return check.name;
      }
    }));
    const failedChecks = results.filter((name): name is string => name !== null);
    return { ready: failedChecks.length === 0, failedChecks };
  } catch {
    return { ready: false, failedChecks: ["server_connection"] };
  }
}

/** Confirm that every production data domain is visible to the server role. */
export async function getDatabaseReadiness(): Promise<boolean> {
  return (await getDatabaseReadinessReport()).ready;
}
