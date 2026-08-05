import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type FeedbackRow = {
  details?: unknown;
};

export type CounsellorRatingAggregate = {
  rating: number;
  reviewCount: number;
};

export function aggregateCounsellorRatings(
  rows: FeedbackRow[],
): CounsellorRatingAggregate {
  const ratings = rows.flatMap((row) => {
    const details =
      row.details && typeof row.details === "object"
        ? (row.details as Record<string, unknown>)
        : {};
    const rating = details.feedbackRating;
    return typeof rating === "number" &&
      Number.isFinite(rating) &&
      rating >= 1 &&
      rating <= 5
      ? [rating]
      : [];
  });
  if (!ratings.length) return { rating: 0, reviewCount: 0 };
  return {
    rating:
      Math.round(
        (ratings.reduce((total, rating) => total + rating, 0) /
          ratings.length) *
          100,
      ) / 100,
    reviewCount: ratings.length,
  };
}

/**
 * The database trigger is authoritative. This explicit RPC makes the update
 * immediately visible after the API write; the fallback keeps deployments
 * functional while migration 0022 is being applied.
 */
export async function refreshCounsellorPublicRating(
  counsellorId: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  const recalculated = await db.rpc("recalculate_counsellor_rating", {
    target_counsellor_id: counsellorId,
  });
  if (!recalculated.error) return;

  console.warn(
    "Database rating aggregate RPC unavailable; using compatibility refresh:",
    recalculated.error.message,
  );
  const [feedback, counsellor] = await Promise.all([
    db
      .from("counselling_sessions")
      .select("details")
      .eq("counsellor_id", counsellorId)
      .eq("state", "feedback_received"),
    db
      .from("counsellors")
      .select("profile")
      .eq("id", counsellorId)
      .maybeSingle(),
  ]);
  if (feedback.error || counsellor.error || !counsellor.data) {
    console.error(
      "Counsellor rating compatibility refresh failed:",
      feedback.error?.message || counsellor.error?.message || "profile missing",
    );
    return;
  }
  const aggregate = aggregateCounsellorRatings(
    (feedback.data || []) as FeedbackRow[],
  );
  const profile =
    counsellor.data.profile && typeof counsellor.data.profile === "object"
      ? (counsellor.data.profile as Record<string, unknown>)
      : {};
  const updated = await db
    .from("counsellors")
    .update({
      profile: {
        ...profile,
        rating: aggregate.rating,
        reviewCount: aggregate.reviewCount,
      },
    })
    .eq("id", counsellorId);
  if (updated.error) {
    console.error(
      "Counsellor rating compatibility update failed:",
      updated.error.message,
    );
  }
}
