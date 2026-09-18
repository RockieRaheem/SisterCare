import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const doctorPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "doctor", "page.tsx"), "utf8");
const memberPage = fs.readFileSync(path.join(process.cwd(), "src", "app", "doctors", "appointments", "[id]", "page.tsx"), "utf8");

describe("doctor clinical workspaces", () => {
  it("keeps acceptance, assessment and prescribing as explicit steps", () => {
    expect(doctorPage).toContain('transition("booked")');
    expect(doctorPage).toContain('transition("in_consultation")');
    expect(doctorPage).toContain("clinicalAttestation");
    expect(doctorPage).toContain('selected.status !== "in_consultation"');
  });

  it("does not tell a member they are connected before doctor acceptance", () => {
    expect(memberPage).toContain("You are not connected");
    expect(memberPage).toContain('["booked", "in_consultation", "completed"]');
  });

  it("shows emergency and medicine safety boundaries", () => {
    expect(memberPage).toContain("Emergency warning");
    expect(memberPage).toContain("Before taking medicine");
    expect(doctorPage).toContain("SisterCare never authorises the AI to diagnose or prescribe");
  });
});
