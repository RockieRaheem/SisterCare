import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  authenticateRequest,
  getAdminDb,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";

function unavailable() {
  return NextResponse.json(
    {
      success: false,
      error: "Conversation deletion is temporarily unavailable.",
    },
    { status: 503 },
  );
}

function serializeMessage(id: string, data: Record<string, unknown>) {
  const timestamp = data.timestamp;
  const date =
    timestamp && typeof timestamp === "object" && "toDate" in timestamp
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date();
  return {
    id,
    conversationId: String(data.conversationId || ""),
    sender: data.sender === "user" ? "user" : "ai",
    content: String(data.content || ""),
    timestamp: date.toISOString(),
    read: Boolean(data.read),
  };
}

async function authorizedConversation(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  if (!isAuthEnforced()) return { error: unavailable() };
  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  const { conversationId } = await context.params;
  const db = getAdminDb();
  if (!db || !conversationId || conversationId.startsWith("local-")) {
    return { error: unavailable() };
  }
  const ref = db.collection("conversations").doc(conversationId);
  const conversation = await ref.get();
  if (!conversation.exists) {
    return { error: NextResponse.json({ error: "Conversation not found" }, { status: 404 }) };
  }
  if (conversation.data()?.userId !== auth.uid) {
    return { error: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }
  return { auth, db, conversationId, ref, conversation };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const result = await authorizedConversation(request, context);
  if ("error" in result) return result.error;
  const messages = await result.ref.collection("messages").orderBy("timestamp", "asc").limit(200).get();
  return NextResponse.json({
    messages: messages.docs.map((document) => serializeMessage(document.id, document.data())),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const result = await authorizedConversation(request, context);
  if ("error" in result) return result.error;
  const body = await request.json().catch(() => ({}));
  const sender = body.sender === "user" ? "user" : body.sender === "ai" ? "ai" : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!sender || !content || content.length > 8000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const now = new Date();
  const message = await result.ref.collection("messages").add({
    conversationId: result.conversationId,
    sender,
    content,
    timestamp: now,
    read: sender === "ai",
  });
  await result.ref.update({
    lastMessage: content.slice(0, 100),
    messageCount: FieldValue.increment(1),
    updatedAt: now,
  });
  return NextResponse.json({ message: serializeMessage(message.id, (await message.get()).data() || {}) }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const result = await authorizedConversation(request, context);
  if ("error" in result) return result.error;
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  if (!title) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  await result.ref.update({ title, updatedAt: new Date() });
  return NextResponse.json({ success: true });
}

/**
 * Permanently removes a user's conversation and its messages. This route is
 * deliberately server-owned because client Firestore rules keep messages
 * immutable; deleting only the parent document left recoverable history.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  if (!isAuthEnforced()) return unavailable();

  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const { conversationId } = await context.params;
  if (!conversationId || conversationId.startsWith("local-")) {
    return NextResponse.json(
      { success: false, error: "Invalid conversation" },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  if (!db) return unavailable();

  const conversationRef = db.collection("conversations").doc(conversationId);
  const conversation = await conversationRef.get();

  if (!conversation.exists) {
    return NextResponse.json({ success: true, alreadyDeleted: true });
  }

  if (conversation.data()?.userId !== auth.uid) {
    return NextResponse.json(
      { success: false, error: "Not authorized to delete this conversation" },
      { status: 403 },
    );
  }

  try {
    const messages = await conversationRef.collection("messages").get();
    const operations = [...messages.docs.map((message) => message.ref), conversationRef];

    // Firestore batches support up to 500 writes. Chunking keeps deletion
    // reliable even for long-running conversations.
    for (let index = 0; index < operations.length; index += 450) {
      const batch = db.batch();
      operations.slice(index, index + 450).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { success: false, error: "Unable to delete conversation" },
      { status: 500 },
    );
  }
}
