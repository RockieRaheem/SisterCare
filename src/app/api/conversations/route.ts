import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  getAdminDb,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";

function unavailable() {
  return NextResponse.json(
    { error: "Secure conversation storage is temporarily unavailable." },
    { status: 503 },
  );
}

function serializeConversation(id: string, data: Record<string, unknown>) {
  const asIso = (value: unknown) => {
    if (value && typeof value === "object" && "toDate" in value) {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    return new Date().toISOString();
  };

  const lastMessage = String(data.lastMessage || "");
  const storedTitle = String(data.title || "New Chat");
  const needsGeneratedTitle =
    (storedTitle === "New Chat" || storedTitle === "New Conversation" || storedTitle === "Untitled") &&
    Boolean(lastMessage);
  const title = needsGeneratedTitle
    ? `${lastMessage.split(/\s+/).slice(0, 5).join(" ")}${lastMessage.split(/\s+/).length > 5 ? "..." : ""}`.slice(0, 30)
    : storedTitle;

  return {
    id,
    userId: String(data.userId || ""),
    title,
    type: data.type === "counsellor" ? "counsellor" : "ai_support",
    status: String(data.status || "active"),
    lastMessage,
    messageCount: Number(data.messageCount || 0),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
  };
}

/** Server-owned conversation index. Browser storage is only an offline cache. */
export async function GET(request: NextRequest) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const db = getAdminDb();
  if (!db) return unavailable();

  const snapshot = await db
    .collection("conversations")
    .where("userId", "==", auth.uid)
    .get();
  const conversations = snapshot.docs
    .map((document) => serializeConversation(document.id, document.data()))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
  return NextResponse.json({
    conversations,
  });
}

/** Creates a durable thread before its first message is sent. */
export async function POST(request: NextRequest) {
  if (!isAuthEnforced()) return unavailable();
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const db = getAdminDb();
  if (!db) return unavailable();

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "New Chat";
  const now = new Date();
  const ref = await db.collection("conversations").add({
    userId: auth.uid,
    title: title || "New Chat",
    type: "ai_support",
    status: "active",
    lastMessage: "",
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: "chat",
  });
  const created = await ref.get();
  return NextResponse.json(
    { conversation: serializeConversation(ref.id, created.data() || {}) },
    { status: 201 },
  );
}
