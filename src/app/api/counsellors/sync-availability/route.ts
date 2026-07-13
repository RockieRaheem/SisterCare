import { NextResponse } from "next/server";
import { batchUpdateCounsellorAvailability } from "@/lib/firestore";

export async function POST() {
  try {
    const result = await batchUpdateCounsellorAvailability();
    return NextResponse.json({
      success: true,
      ...result,
      message: `Updated ${result.updated} counsellor(s), ${result.errors} error(s)`,
    });
  } catch (error) {
    console.error("Availability sync failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync availability" },
      { status: 500 },
    );
  }
}
