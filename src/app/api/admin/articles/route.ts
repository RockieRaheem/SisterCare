import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getAuthorizationFailure, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { withApiObservability } from "@/lib/observability";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  const failure = getAuthorizationFailure(auth, "admin");
  if (failure) return { ok: false, failure } as const;
  if (auth.status !== "verified") return null;
  return { ok: true, auth } as const;
}

async function getArticles(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Article review is unavailable" }, { status: 503 });
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.failure.error }, { status: auth.failure.status });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("library_articles").select("*").eq("status", "pending_review").order("created_at", { ascending: true });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  const authorIds = [...new Set((data || []).map((row) => row.author_id))];
  const [profiles, counsellors] = authorIds.length
    ? await Promise.all([
        db.from("profiles").select("id, display_name").in("id", authorIds),
        db.from("counsellors").select("id, profile").in("id", authorIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (profiles.error || counsellors.error) {
    return NextResponse.json({ success: false, error: profiles.error?.message || counsellors.error?.message }, { status: 503 });
  }
  const names = new Map((profiles.data || []).map((row) => [row.id, row.display_name]));
  const professional = new Map((counsellors.data || []).map((row) => [row.id, row.profile as { name?: string; title?: string }]));
  const articles = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.summary,
    content: row.content,
    category: row.category,
    tags: [],
    authorName: professional.get(row.author_id)?.name || names.get(row.author_id) || "SisterCare counsellor",
    authorTitle: professional.get(row.author_id)?.title || "Counsellor",
  }));
  return NextResponse.json({ success: true, data: { articles } });
}

async function patchArticle(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Article review is unavailable" }, { status: 503 });
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.failure.error }, { status: auth.failure.status });
  const body = await request.json().catch(() => null) as { articleId?: string; decision?: string } | null;
  if (!body?.articleId || !["publish", "reject"].includes(body.decision || "")) {
    return NextResponse.json({ success: false, error: "Invalid review decision" }, { status: 400 });
  }
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await db.from("library_articles").update({
    status: body.decision === "publish" ? "published" : "rejected",
    reviewed_by: auth.auth.uid,
    reviewed_at: now,
    ...(body.decision === "publish" ? { published_at: now } : {}),
  }).eq("id", body.articleId).eq("status", "pending_review").select("id").maybeSingle();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ success: false, error: "Article is not awaiting review" }, { status: 409 });
  return NextResponse.json({ success: true });
}

export const GET = withApiObservability("admin_articles_get", getArticles);
export const PATCH = withApiObservability(
  "admin_articles_patch",
  patchArticle,
);
