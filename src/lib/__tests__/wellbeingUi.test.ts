import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("member wellbeing experience", () => {
  const dashboard = read("src", "app", "dashboard", "page.tsx");
  const checkIn = read("src", "app", "wellbeing", "page.tsx");
  const presentation = read("src", "lib", "wellbeingPresentation.ts");

  it("does not create unlimited mood-only symptom records from the dashboard", () => {
    expect(dashboard).not.toContain("logSymptoms");
    expect(dashboard).not.toContain("handleMoodSelect");
    expect(dashboard).toContain("Update today");
    expect(dashboard).toContain("FEELING_OPTIONS");
  });

  it("offers emotional vocabulary, context and a member-selected support path", () => {
    expect(presentation).toContain('value: "anxious"');
    expect(presentation).toContain('value: "lonely"');
    expect(presentation).toContain('value: "numb"');
    expect(presentation).toContain('value: "safety_or_harassment"');
    expect(presentation).toContain('value: "talk_to_someone"');
    expect(checkIn).toContain("Choose up to three");
    expect(checkIn).toContain("What would help next?");
  });

  it("makes repeat activity an edit to today's reflection", () => {
    expect(checkIn).toContain("todayCheckIn");
    expect(checkIn).toContain("Update today's check-in");
    expect(checkIn).toContain("entry.localDate !== today");
  });
});
