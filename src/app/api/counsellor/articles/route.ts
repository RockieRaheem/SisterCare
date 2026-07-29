import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const CATEGORIES = ["comfort", "emotional", "medical", "nutrition"] as const;
type Category = (typeof CATEGORIES)[number];
const CATEGORY_LABELS: Record<Category, string> = {
  comfort: "Comfort & Hygiene",
  emotional: "Emotional Well-being",
  medical: "When to See a Doctor",
  nutrition: "Nutrition & Diet",
};
const text = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

/** Counsellors submit articles; publication remains an accountable admin decision. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Article publishing is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || (!hasRole(auth, "counsellor") && !hasRole(auth, "admin"))) {
    return NextResponse.json({ success: false, error: "Verified counsellor access required" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = text(body?.title, 140);
  const summary = text(body?.description, 360);
  const content = text(body?.content, 12000);
  const categoryId = text(body?.categoryId, 40) as Category;
  const tags = Array.isArray(body?.tags) ? body.tags.map((tag) => text(tag, 40)).filter(Boolean).slice(0, 8) : [];
  const coverImageUrl = text(body?.coverImageUrl, 1000);
  if (!title || !summary || content.length < 120 || !CATEGORIES.includes(categoryId)) {
    return NextResponse.json({ success: false, error: "Provide a title, summary, category, and at least 120 characters of article content." }, { status: 400 });
  }
  if (coverImageUrl && !/^https:\/\//i.test(coverImageUrl)) {
    return NextResponse.json({ success: false, error: "Cover image must use a secure HTTPS URL." }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  if (!hasRole(auth, "admin")) {
    const { data: counsellor, error } = await db.from("counsellors").select("verification_status").eq("id", auth.uid).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
    if (counsellor?.verification_status !== "verified") {
      return NextResponse.json({ success: false, error: "An approved counsellor profile is required" }, { status: 403 });
    }
  }
  const { data: article, error } = await db.from("library_articles").insert({
    author_id: auth.uid,
    title,
    summary,
    content,
    category: CATEGORY_LABELS[categoryId],
    tags,
    cover_image_url: coverImageUrl || null,
    status: "pending_review",
  }).select("id").single();
  if (error || !article) return NextResponse.json({ success: false, error: error?.message || "Article submission failed" }, { status: 503 });
  await db.from("audit_events").insert({
    actor_id: auth.uid,
    event_type: "library_article.submitted",
    subject_id: article.id,
    metadata: {},
  });
  return NextResponse.json({ success: true, data: { id: article.id } });
}

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Article publishing is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || (!hasRole(auth, "counsellor") && !hasRole(auth, "admin"))) {
    return NextResponse.json({ success: false, error: "Verified counsellor access required" }, { status: 403 });
  }
  const { data, error } = await getSupabaseAdmin().from("library_articles").select("*").eq("author_id", auth.uid).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const articles = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.summary,
    content: row.content,
    category: row.category,
    tags: row.tags || [],
    coverImageUrl: row.cover_image_url,
    status: row.status,
    submittedAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  return NextResponse.json({ success: true, data: { articles } });
}
