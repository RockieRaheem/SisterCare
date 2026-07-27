import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  deleteAuthUser,
  isAuthEnforced,
} from "@/lib/firebaseAdmin";
import { deleteUserData } from "@/lib/server/accountDeletion";

export async function DELETE(request: NextRequest) {
  if (!isAuthEnforced()) {
    return NextResponse.json(
      { success: false, error: "Account deletion is temporarily unavailable" },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  if (auth.status !== "verified") {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const result = await deleteUserData(auth.uid);
    await deleteAuthUser(auth.uid);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json(
      { success: false, error: "Account deletion failed" },
      { status: 500 },
    );
  }
}

