import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sessionRoomSource = readFileSync(
  path.join(process.cwd(), "src", "app", "sessions", "[id]", "page.tsx"),
  "utf8",
);

describe("private care room UI contracts", () => {
  it("uses the professional shell when the participant is a counsellor", () => {
    expect(sessionRoomSource).toContain("usesProfessionalWorkspace");
    expect(sessionRoomSource).toContain("<CounsellorShell>");
  });

  it("keeps message scrolling inside the room instead of moving the page", () => {
    expect(sessionRoomSource).toContain("messagesViewportRef");
    expect(sessionRoomSource).toContain("viewport.scrollTo");
    expect(sessionRoomSource).not.toContain("scrollIntoView");
  });

  it("prevents mobile browser zoom on room form controls", () => {
    expect(sessionRoomSource).toMatch(
      /<input[\s\S]*?className="[^"]*text-base[^"]*"/,
    );
    expect(sessionRoomSource).toMatch(
      /<textarea[\s\S]*?className="[^"]*text-base[^"]*"/,
    );
  });
});
