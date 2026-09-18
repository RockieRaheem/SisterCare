import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENT_TOOLS } from "@/lib/agent/tools";

describe("agent medical action boundaries", () => {
  it("does not expose medication or appointment reminder actions", () => {
    const reminder = AGENT_TOOLS.find((tool) => tool.name === "set_reminder");
    const values = (reminder?.parameters.properties.type as { enum?: string[] } | undefined)?.enum || [];
    expect(values).not.toContain("medication");
    expect(values).not.toContain("appointment");
  });

  it("enforces the boundary in both prompt and tool executor", () => {
    const executor = fs.readFileSync(path.join(process.cwd(), "src", "lib", "agent", "executor.ts"), "utf8");
    expect(executor).toContain("PERMANENT MEDICAL BOUNDARY");
    expect(executor).toContain("Reminder type is not permitted");
    expect(executor).toContain("Never provide a medicine dose");
  });

  it("does not keep a medicine recommendation in bundled health content", () => {
    const knowledge = fs.readFileSync(path.join(process.cwd(), "src", "lib", "agent", "knowledge.ts"), "utf8");
    expect(knowledge).not.toContain("ibuprofen or naproxen work best");
  });
});
