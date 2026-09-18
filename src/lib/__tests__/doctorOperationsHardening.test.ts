import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "20260824_0039_harden_doctor_operations.sql"), "utf8");
const operations = fs.readFileSync(path.join(process.cwd(), "src", "lib", "server", "operations.ts"), "utf8");
const presence = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "doctor", "presence", "route.ts"), "utf8");

describe("doctor operations hardening", () => {
  it("alerts administrators when no verified doctor can be assigned", () => {
    expect(migration).toContain("where profile.role = 'admin'");
    expect(migration).toContain("'unassigned', true");
    expect(migration).toContain("'/admin/doctors'");
  });

  it("makes every doctor clinical table part of database readiness", () => {
    for (const table of ["doctors", "doctor_appointments", "doctor_prescriptions", "doctor_messages"]) expect(operations).toContain(`"${table}"`);
  });

  it("allows the clinical desk to read server-derived presence", () => {
    expect(presence).toContain("export async function GET");
    expect(presence).toContain("getDoctorPresence");
  });
});
