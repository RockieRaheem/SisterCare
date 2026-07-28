import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { authenticateRequest, getAdminDb, hasRole, isAuthEnforced } from "@/lib/firebaseAdmin";

async function requireAdmin(request: NextRequest) {
  if (!isAuthEnforced()) return null;
  const auth = await authenticateRequest(request);
  return auth.status === "verified" && hasRole(auth, "admin") ? auth : null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const snapshot = await getAdminDb()!.collection("libraryArticles").where("status", "==", "pending_review").get();
  return NextResponse.json({ success: true, data: { articles: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ success: false, error: "Admin privileges required" }, { status: 403 });
  const body = await request.json().catch(() => null) || {};
  const articleId = typeof body.articleId === "string" ? body.articleId : "";
  const decision = body.decision;
  if (!articleId || !["publish", "reject"].includes(decision)) return NextResponse.json({ success: false, error: "Invalid review decision" }, { status: 400 });
  const ref = getAdminDb()!.collection("libraryArticles").doc(articleId);
  const article = await ref.get();
  if (!article.exists || article.data()?.status !== "pending_review") return NextResponse.json({ success: false, error: "Article is not awaiting review" }, { status: 409 });
  await ref.update({ status: decision === "publish" ? "published" : "rejected", reviewedBy: auth.uid, reviewedAt: FieldValue.serverTimestamp(), ...(decision === "publish" ? { publishedAt: FieldValue.serverTimestamp() } : {}), updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ success: true });
}
