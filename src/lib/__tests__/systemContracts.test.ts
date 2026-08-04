import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory()
      ? filesBelow(absolute)
      : [absolute];
  });
}

function relative(file: string): string {
  return path.relative(root, file).replaceAll("\\", "/");
}

describe("whole-system architecture contracts", () => {
  it("requires authentication on every API endpoint not explicitly public", () => {
    const apiRoot = path.join(root, "src", "app", "api");
    const routes = filesBelow(apiRoot).filter((file) =>
      file.endsWith(`${path.sep}route.ts`),
    );
    const publicRoutes = new Set([
      "src/app/api/health/route.ts",
      "src/app/api/library/articles/route.ts",
    ]);

    expect(routes.length).toBeGreaterThanOrEqual(32);
    for (const file of routes) {
      const route = relative(file);
      const source = readFileSync(file, "utf8");
      expect(source, `${route} must return structured JSON`).toMatch(
        /NextResponse\.json/,
      );
      if (publicRoutes.has(route)) continue;
      expect(
        source,
        `${route} must verify the caller or a protected scheduler secret`,
      ).toMatch(
        /authenticateRequest|verifySupabaseAccessToken|verifyCronSecret/,
      );
    }
  });

  it("keeps retired Firebase and Stellar runtimes out of the product", () => {
    const packageJson = readFileSync(path.join(root, "package.json"), "utf8");
    const runtimeFiles = filesBelow(path.join(root, "src")).filter((file) =>
      /\.(ts|tsx)$/.test(file),
    );
    const runtimeSource = runtimeFiles
      .filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(packageJson).not.toMatch(/firebase(-admin)?/i);
    expect(packageJson).not.toMatch(/stellar|soroban/i);
    expect(runtimeSource).not.toMatch(
      /firebase\/|firebase-admin|NEXT_PUBLIC_FIREBASE/i,
    );
    expect(runtimeSource).not.toMatch(
      /@stellar|stellar-sdk|soroban|STELLAR_/i,
    );
  });

  it("keeps database migrations ordered and preserves core RLS boundaries", () => {
    const migrationRoot = path.join(root, "supabase", "migrations");
    const migrations = readdirSync(migrationRoot)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    const sequence = migrations.map((file) => {
      const match = file.match(/_(\d{4})_/);
      expect(match, `${file} needs a four-digit migration sequence`).not.toBeNull();
      return Number(match?.[1]);
    });

    expect(sequence).toEqual(
      Array.from({ length: sequence.length }, (_, index) => index + 1),
    );

    const sql = migrations
      .map((file) => readFileSync(path.join(migrationRoot, file), "utf8"))
      .join("\n")
      .toLowerCase();
    for (const table of [
      "profiles",
      "conversations",
      "messages",
      "user_records",
      "counsellor_applications",
      "counselling_sessions",
      "session_messages",
      "session_audio_calls",
      "audit_events",
      "incidents",
      "rate_limits",
    ]) {
      expect(
        sql,
        `${table} must have row-level security enabled`,
      ).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain(
      "revoke all on public.incidents, public.metrics_daily, public.operations_heartbeats, public.rate_limits from anon, authenticated",
    );
  });

  it("keeps production secrets server-only and example values empty", () => {
    const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
    const sensitive = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SECRET_KEY",
      "GROQ_API_KEY",
      "GEMINI_API_KEY",
      "CRON_SECRET",
      "DAILY_API_KEY",
      "ADMIN_BOOTSTRAP_SECRET",
    ];

    for (const name of sensitive) {
      expect(name).not.toMatch(/^NEXT_PUBLIC_/);
      const assignment = envExample.match(
        new RegExp(`^${name}=(.*)$`, "m"),
      );
      if (assignment) {
        expect(
          assignment[1].trim(),
          `${name} must not contain a committed secret`,
        ).toBe("");
      }
    }
  });

  it("uses only Hobby-compatible once-daily Vercel schedules", () => {
    const config = JSON.parse(
      readFileSync(path.join(root, "vercel.json"), "utf8"),
    ) as { crons?: Array<{ path: string; schedule: string }> };

    expect(config.crons?.length).toBeGreaterThan(0);
    for (const cron of config.crons || []) {
      const fields = cron.schedule.trim().split(/\s+/);
      expect(fields, `${cron.path} must use five cron fields`).toHaveLength(5);
      expect(fields[2], `${cron.path} must run on every day`).toBe("*");
      expect(fields[3], `${cron.path} must run every month`).toBe("*");
      expect(fields[4], `${cron.path} must run every weekday`).toBe("*");
      expect(fields[0]).toMatch(/^\d+$/);
      expect(fields[1]).toMatch(/^\d+$/);
    }
  });
});
