import { describe, expect, it } from "vitest";
import {
  mergeSessionMessages,
  messageFromRealtimeRow,
  reviveSessionMessage,
} from "../sessionMessaging";

describe("private session message synchronization", () => {
  it("accepts a valid Supabase realtime insert", () => {
    const message = messageFromRealtimeRow({
      id: "message-1",
      sender_id: "member-1",
      sender_role: "user",
      text: "Hello",
      created_at: "2026-08-05T04:00:00.000Z",
    });

    expect(message).toMatchObject({
      id: "message-1",
      senderId: "member-1",
      senderRole: "user",
      text: "Hello",
    });
    expect(message?.createdAt).toBeInstanceOf(Date);
  });

  it("rejects malformed realtime payloads", () => {
    expect(
      messageFromRealtimeRow({
        id: "message-1",
        sender_role: "unknown",
        text: "Hello",
      }),
    ).toBeNull();
  });

  it("deduplicates optimistic and realtime copies in chronological order", () => {
    const later = reviveSessionMessage({
      id: "message-2",
      senderId: "counsellor-1",
      senderRole: "counsellor",
      text: "How can I help?",
      createdAt: "2026-08-05T04:01:00.000Z",
    });
    const earlier = reviveSessionMessage({
      id: "message-1",
      senderId: "member-1",
      senderRole: "user",
      text: "Hello",
      createdAt: "2026-08-05T04:00:00.000Z",
    });

    expect(mergeSessionMessages([later], [earlier, later])).toEqual([
      earlier,
      later,
    ]);
  });
});
