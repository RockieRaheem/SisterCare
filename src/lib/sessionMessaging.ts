export interface SessionRoomMessage {
  id: string;
  clientMessageId?: string;
  senderId: string;
  senderRole: "user" | "counsellor";
  text: string;
  createdAt: Date | null;
}

type ApiMessage = Omit<SessionRoomMessage, "createdAt"> & {
  createdAt?: string | Date | null;
};

export function reviveSessionMessage(message: ApiMessage): SessionRoomMessage {
  return {
    ...message,
    createdAt: message.createdAt ? new Date(message.createdAt) : null,
  };
}

export function messageFromRealtimeRow(
  value: Record<string, unknown>,
): SessionRoomMessage | null {
  if (
    typeof value.id !== "string" ||
    typeof value.sender_id !== "string" ||
    (value.sender_role !== "user" && value.sender_role !== "counsellor") ||
    typeof value.text !== "string"
  ) {
    return null;
  }
  return reviveSessionMessage({
    id: value.id,
    clientMessageId:
      typeof value.client_message_id === "string"
        ? value.client_message_id
        : undefined,
    senderId: value.sender_id,
    senderRole: value.sender_role,
    text: value.text,
    createdAt:
      typeof value.created_at === "string" ? value.created_at : null,
  });
}

export function mergeSessionMessages(
  current: SessionRoomMessage[],
  incoming: SessionRoomMessage[],
): SessionRoomMessage[] {
  const key = (message: SessionRoomMessage) => message.clientMessageId || message.id;
  const byId = new Map(current.map((message) => [key(message), message]));
  for (const message of incoming) byId.set(key(message), message);
  return [...byId.values()].sort(
    (left, right) =>
      (left.createdAt?.getTime() || 0) - (right.createdAt?.getTime() || 0),
  );
}
