import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("counsellor profile editor UI", () => {
  const editor = read(
    "src",
    "app",
    "counsellor",
    "profile",
    "page.tsx",
  );
  const shell = read(
    "src",
    "components",
    "counsellor",
    "CounsellorShell.tsx",
  );

  it("is part of the professional workspace navigation", () => {
    expect(shell).toContain('href: "/counsellor/profile"');
    expect(shell).toContain('label: "Public profile"');
  });

  it("supports adding, replacing, capturing and removing photos", () => {
    expect(editor).toContain("Add photo");
    expect(editor).toContain("Replace photo");
    expect(editor).toContain('capture="user"');
    expect(editor).toContain("removePhoto");
  });

  it("edits only public professional details through the protected endpoint", () => {
    expect(editor).toContain('authenticatedFetch("/api/counsellor/profile"');
    expect(editor).toContain("Professional name");
    expect(editor).toContain("Areas of practice");
    expect(editor).not.toContain("Credential expiry");
    expect(editor).not.toContain("Registration or licence number");
  });
});
