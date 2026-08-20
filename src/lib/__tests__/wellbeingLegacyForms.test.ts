import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("retired mental-health forms", () => {
  it("does not ship the long symptom questionnaire that duplicated wellbeing", () => {
    expect(
      existsSync(path.join(root, "src", "components", "ui", "SymptomLoggerModal.tsx")),
    ).toBe(false);
  });

  it("keeps the live wellbeing experience free of repeated rating scales", () => {
    const page = readFileSync(path.join(root, "src", "app", "wellbeing", "page.tsx"), "utf8");
    expect(page).not.toContain('type="range"');
    expect(page).not.toContain("out of 5");
    expect(page).not.toContain("Sleep Quality");
    expect(page).not.toContain("Energy Level");
  });
});
