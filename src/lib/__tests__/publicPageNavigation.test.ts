import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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

  it("returns member help visitors directly to their conversation", () => {
    expect(help).toContain('authenticatedReturnHref="/chat"');
    expect(help).toContain('authenticatedReturnLabel="Back to conversation"');
  });
});
