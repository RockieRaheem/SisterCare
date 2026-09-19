import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { helpHref, resolveHelpReturnPath } from "@/lib/helpNavigation";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("public information page navigation", () => {
  const shell = read("src", "components", "layout", "PublicPageShell.tsx");
  const help = read("src", "app", "help", "page.tsx");

  it("returns authenticated people to their role-owned workspace", () => {
    expect(shell).toContain("resolveWorkspaceHome");
    expect(shell).toContain("userProfile");
    expect(shell).toContain('authenticatedReturnHref || workspaceHome');
    expect(shell).toContain('user\n    ? authenticatedReturnLabel || "Back to workspace"');
  });

  it("uses the source page for the Help Centre return link", () => {
    expect(help).toContain("resolveHelpReturnPath((await searchParams).from)");
    expect(help).toContain("authenticatedReturnHref={returnPath || undefined}");
  });

  it("preserves member pages without permitting open or role-crossing redirects", () => {
    expect(helpHref("/doctors")).toBe("/help?from=%2Fdoctors");
    expect(helpHref("/chat")).toBe("/help?from=%2Fchat");
    expect(resolveHelpReturnPath("/doctors/appointments/123")).toBe("/doctors/appointments/123");
    for (const unsafe of ["//evil.example", "/admin", "/counsellor", "/doctor", "/doctors/../admin", "/doctors%2F..%2Fadmin", "/chat?x=1", "https://evil.example"]) {
      expect(resolveHelpReturnPath(unsafe)).toBeNull();
    }
  });
});
