import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const readPage = (name: "privacy" | "terms") =>
  readFileSync(join(process.cwd(), "src", "app", name, "page.tsx"), "utf8");

describe("controlled pilot disclosures", () => {
  it("states the adult pilot and non-emergency boundaries", () => {
    for (const page of [readPage("privacy"), readPage("terms")]) {
      expect(page).toMatch(/18 or older/);
      expect(page).toMatch(/not an emergency/i);
    }
  });

  it("discloses AI, provider, retention and reporting behavior", () => {
    const privacy = readPage("privacy");
    expect(privacy).toContain("Groq or Gemini");
    expect(privacy).toContain("Supabase");
    expect(privacy).toContain("Sunbird");
    expect(privacy).toContain("Daily");
    expect(privacy).toContain("Retention and deletion");
    expect(privacy).toContain("submit a private report");
  });
});
