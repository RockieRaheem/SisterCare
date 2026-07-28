import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/** Published articles are the only counsellor content exposed to the library. */
export async function GET() {
  const db = getAdminDb();
  if (!db) return NextResponse.json({ success: true, data: { articles: [] } });
  const snapshot = await db.collection("libraryArticles").where("status", "==", "published").get();
  const articles = snapshot.docs
    .sort((a, b) => Number(b.data().publishedAt?.toMillis?.() || 0) - Number(a.data().publishedAt?.toMillis?.() || 0))
    .map((document) => ({ id: document.id, ...document.data() }));
  return NextResponse.json({ success: true, data: { articles } });
}
