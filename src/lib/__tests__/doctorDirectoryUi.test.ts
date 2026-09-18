import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "doctors", "page.tsx"),
  "utf8",
);

describe("member doctor directory", () => {
  it("keeps diagnosis and prescribing with a verified doctor", () => {
    expect(page).toContain("only a verified doctor");
    expect(page).toContain("A request is not a diagnosis or prescription");
  });

  it("makes emergencies and current availability clear", () => {
    expect(page).toContain("Do not wait for an online booking in an emergency");
    expect(page).toContain("available now");
  });

  it("offers explicit doctor selection and automatic matching", () => {
    expect(page).toContain("Request this doctor");
    expect(page).toContain("Match me with a doctor");
  });
});
