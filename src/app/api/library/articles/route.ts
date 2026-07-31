import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** Published articles are the only counsellor content exposed to the library. */
export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("library_articles")
      .select("*")
      .eq("status", "published")
      .not("reviewed_by", "is", null)
      .not("reviewed_at", "is", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });
    if (error) throw error;
    const authorIds = [...new Set((data || []).map((row) => row.author_id))];
    const { data: counsellors, error: counsellorError } = authorIds.length
      ? await db.from("counsellors").select("id, profile").in("id", authorIds)
      : { data: [], error: null };
    if (counsellorError) throw counsellorError;
    const authors = new Map((counsellors || []).map((row) => [row.id, row.profile as { name?: string; title?: string }]));
    const articles = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.summary,
      content: row.content,
      category: row.category,
      tags: row.tags || [],
      coverImageUrl: row.cover_image_url,
      authorId: row.author_id,
      authorName: authors.get(row.author_id)?.name || "SisterCare counsellor",
      authorTitle: authors.get(row.author_id)?.title || "Counsellor",
      status: row.status,
      reviewedAt: row.reviewed_at,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    }));
    return NextResponse.json({ success: true, data: { articles } });
  } catch (error) {
    console.error("Published article query failed:", error);
    return NextResponse.json({ success: false, error: "The library is temporarily unavailable" }, { status: 503 });
  }
}
