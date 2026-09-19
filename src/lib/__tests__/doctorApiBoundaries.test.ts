import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), "utf8");

describe("doctor API boundaries", () => {
  it.each([
    ["src", "app", "api", "doctor", "presence", "route.ts"],
    ["src", "app", "api", "doctor", "appointments", "route.ts"],
    ["src", "app", "api", "doctor", "prescriptions", "route.ts"],
    ["src", "app", "api", "doctor", "profile", "photo", "route.ts"],
  ])("requires verified doctor authorization for %s", (...parts) => {
    const source = read(...parts);
    expect(source).toContain("authorizeDoctor");
    expect(source).toContain("Verified doctor access required");
  });

  it("never accepts a member id when issuing a prescription", () => {
    const source = read("src", "app", "api", "doctor", "prescriptions", "route.ts");
    expect(source).not.toContain("body.memberId");
    expect(source).toContain("appointmentId");
  });
});
