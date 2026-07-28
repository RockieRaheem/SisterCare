import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticateRequest, getAdminDb, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";

const CATEGORIES = ["comfort", "emotional", "medical", "nutrition"] as const;
type Category = (typeof CATEGORIES)[number];
const CATEGORY_LABELS: Record<Category, string> = { comfort: "Comfort & Hygiene", emotional: "Emotional Well-being", medical: "When to See a Doctor", nutrition: "Nutrition & Diet" };
const text = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

/** Counsellors submit articles; publication remains an accountable admin decision. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Article publishing is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || (!hasRole(auth, "counsellor") && !hasRole(auth, "admin"))) return NextResponse.json({ success: false, error: "Verified counsellor access required" }, { status: 403 });
  const body = await request.json().catch(() => null) || {};
  const title = text(body.title, 140);
  const description = text(body.description, 360);
  const content = text(body.content, 12000);
  const categoryId = text(body.categoryId, 40) as Category;
  const tags = Array.isArray(body.tags) ? body.tags.map((tag: unknown) => text(tag, 40)).filter(Boolean).slice(0, 8) : [];
  const coverImageUrl = text(body.coverImageUrl, 1000);
  if (!title || !description || content.length < 120 || !CATEGORIES.includes(categoryId)) return NextResponse.json({ success: false, error: "Provide a title, summary, category, and at least 120 characters of article content." }, { status: 400 });
  if (coverImageUrl && !/^https:\/\//i.test(coverImageUrl)) return NextResponse.json({ success: false, error: "Cover image must use a secure HTTPS URL." }, { status: 400 });
  const db = getAdminDb()!;
  const profile = await db.collection("counsellors").doc(auth.uid).get();
  if (!hasRole(auth, "admin") && (!profile.exists || profile.data()?.verificationStatus !== "verified")) return NextResponse.json({ success: false, error: "An approved counsellor profile is required" }, { status: 403 });
  const author = profile.data();
  const article = await db.collection("libraryArticles").add({
    title, description, content, categoryId, category: CATEGORY_LABELS[categoryId], tags, coverImageUrl: coverImageUrl || null,
    authorId: auth.uid, authorName: author?.name || "SisterCare counsellor", authorTitle: author?.title || "Counsellor",
    status: "pending_review", submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  await db.collection("events").add({ type: "library_article.submitted", payload: { articleId: article.id, authorId: auth.uid }, createdAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ success: true, data: { id: article.id } });
}

export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return NextResponse.json({ success: false, error: "Article publishing is unavailable" }, { status: 503 });
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified" || (!hasRole(auth, "counsellor") && !hasRole(auth, "admin"))) return NextResponse.json({ success: false, error: "Verified counsellor access required" }, { status: 403 });
  const snapshot = await getAdminDb()!.collection("libraryArticles").where("authorId", "==", auth.uid).get();
  const articles = snapshot.docs
    .sort((a, b) => Number(b.data().updatedAt?.toMillis?.() || 0) - Number(a.data().updatedAt?.toMillis?.() || 0))
    .map((document) => ({ id: document.id, ...document.data() }));
  return NextResponse.json({ success: true, data: { articles } });
}
