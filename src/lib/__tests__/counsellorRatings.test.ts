import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aggregateCounsellorRatings } from "../server/counsellorRatings";

describe("public counsellor rating aggregation", () => {
  it("derives a stable public average from valid session feedback", () => {
    expect(
      aggregateCounsellorRatings([
        { details: { feedbackRating: 5 } },
        { details: { feedbackRating: 4 } },
        { details: { feedbackRating: 4 } },
      ]),
    ).toEqual({ rating: 4.33, reviewCount: 3 });
  });

  it("ignores malformed or out-of-range feedback", () => {
    expect(
      aggregateCounsellorRatings([
        { details: { feedbackRating: 0 } },
        { details: { feedbackRating: 6 } },
        { details: { feedbackRating: "5" } },
        { details: null },
        { details: { feedbackRating: 3 } },
      ]),
    ).toEqual({ rating: 3, reviewCount: 1 });
  });

  it("installs an automatic database trigger and historical backfill", () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260805_0022_counsellor_rating_aggregate.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("recalculate_counsellor_rating");
    expect(migration).toContain("counselling_session_rating_sync");
    expect(migration).toContain("select id from public.counsellors");
    expect(migration).toContain(
      "revoke all on function public.recalculate_counsellor_rating(uuid)",
    );
  });
});
