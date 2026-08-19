import { NextRequest, NextResponse } from "next/server";
import { isPilotPaused, shouldPauseApiPath, shouldPauseWorkspacePath } from "@/lib/pilotAccess";

export function proxy(request: NextRequest) {
  if (!isPilotPaused()) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (shouldPauseApiPath(pathname)) {
    return NextResponse.json(
      { success: false, error: "SisterCare is temporarily paused while the pilot team completes a safety check." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } },
    );
  }
  if (shouldPauseWorkspacePath(pathname)) {
    return NextResponse.redirect(new URL("/pilot-paused", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icons|manifest.json|sw.js|offline.html|favicon.ico).*)",
  ],
};
