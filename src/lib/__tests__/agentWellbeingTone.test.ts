import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const executor = readFileSync(
  path.join(process.cwd(), "src", "lib", "agent", "executor.ts"),
  "utf8",
);
const notifications = readFileSync(
  path.join(process.cwd(), "src", "lib", "notifications.ts"),
  "utf8",
);
const settings = readFileSync(
  path.join(process.cwd(), "src", "app", "settings", "page.tsx"),
  "utf8",
);

describe("mental-health response contract", () => {
  it("matches serious disclosures without forced positivity", () => {
    expect(executor).toContain("Match the emotional weight of the disclosure");
    expect(executor).toContain("Use no emoji when the user describes grief");
    expect(executor).toContain("Ask no more than one question at a time");
  });

  it("does not automatically explain emotions through the menstrual cycle", () => {
    expect(executor).toContain("Do not say that a feeling is caused by menstruation");
    expect(executor).not.toContain("You may feel more energetic and social");
    expect(notifications).not.toContain("generatePhaseTip");
    expect(notifications).not.toContain("Communication skills are enhanced");
  });

  it("uses a reviewable member preference instead of inferred support style", () => {
    expect(settings).toContain("How Sister should respond");
    expect(settings).toContain("Listen before suggesting");
    expect(settings).toContain("Give clear options quickly");
    expect(executor).toContain("MEMBER-CHOSEN RESPONSE STYLE");
    expect(executor).toContain("unless immediate safety requires a direct response");
  });
});
