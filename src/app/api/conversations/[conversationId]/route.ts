import { NextRequest, NextResponse } from "next/server";
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
