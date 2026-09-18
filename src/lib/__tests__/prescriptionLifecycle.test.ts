import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeCareNotification } from "@/lib/careNotification";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "20260825_0040_void_doctor_prescriptions.sql"), "utf8");
const service = fs.readFileSync(path.join(process.cwd(), "src", "lib", "server", "doctorCare.ts"), "utf8");
const route = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "doctor", "prescriptions", "route.ts"), "utf8");

describe("prescription withdrawal lifecycle", () => {
  it("preserves withdrawn records with an accountable reason", () => {
    expect(migration).toContain("voided_at timestamptz");
    expect(migration).toContain("voided_by uuid");
    expect(migration).toContain("void_reason text");
    expect(service).toContain('.eq("doctor_id", params.doctorId)');
    expect(service).toContain('.eq("status", "issued")');
  });

  it("notifies the member and exposes only an authenticated doctor endpoint", () => {
    expect(migration).toContain("'prescription_voided'");
    expect(route).toContain("export async function PATCH");
    expect(route).toContain("voidDoctorPrescription");
    expect(describeCareNotification("prescription_voided").title).toBe("Prescription withdrawn");
  });
});
