import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthEnforced } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const unavailable = () => NextResponse.json({ error: "Secure conversation storage is temporarily unavailable." }, { status: 503 });
const serialize = (row: Record<string, unknown>) => {
  const lastMessage = String(row.last_message || ""); const stored = String(row.title || "New Chat");
  const title = ["New Chat", "New Conversation", "Untitled"].includes(stored) && lastMessage ? `${lastMessage.split(/\s+/).slice(0, 5).join(" ")}${lastMessage.split(/\s+/).length > 5 ? "..." : ""}`.slice(0, 30) : stored;
  return { id: row.id, userId: row.user_id, title, type: row.type === "counsellor" ? "counsellor" : "ai_support", status: row.status || "active", lastMessage, messageCount: Number(row.message_count || 0), createdAt: row.created_at, updatedAt: row.updated_at };
};
export async function GET(request: NextRequest) { if (!isAuthEnforced()) return unavailable(); const auth = await authenticateRequest(request); if (auth.status !== "verified") return NextResponse.json({ error: "Authentication required" }, { status: 401 }); const { data, error } = await getSupabaseAdmin().from("conversations").select("*").eq("user_id", auth.uid).order("updated_at", { ascending: false }); if (error) return unavailable(); return NextResponse.json({ conversations: (data || []).map((row) => serialize(row)) }); }
export async function POST(request: NextRequest) { if (!isAuthEnforced()) return unavailable(); const auth = await authenticateRequest(request); if (auth.status !== "verified") return NextResponse.json({ error: "Authentication required" }, { status: 401 }); const body = await request.json().catch(() => ({})); const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "New Chat"; const { data, error } = await getSupabaseAdmin().from("conversations").insert({ user_id: auth.uid, title: title || "New Chat", type: "ai_support" }).select("*").single(); if (error || !data) return unavailable(); return NextResponse.json({ conversation: serialize(data) }, { status: 201 }); }
