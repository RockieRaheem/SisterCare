import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrations = path.join(process.cwd(), "supabase", "migrations");
const roleSql = fs.readFileSync(
  path.join(migrations, "20260824_0033_add_doctor_role.sql"),
  "utf8",
);
const careSql = fs.readFileSync(
  path.join(migrations, "20260824_0034_doctor_care.sql"),
  "utf8",
);

describe("doctor care migrations", () => {
  it("adds a distinct doctor role before using it", () => {
    expect(roleSql).toMatch(/app_role add value if not exists 'doctor'/i);
  });

  it.each(["doctors", "doctor_appointments", "doctor_prescriptions"])(
    "enables RLS and removes browser table access for %s",
    (table) => {
      expect(careSql).toContain(`alter table public.${table} enable row level security`);
      expect(careSql).toContain(`revoke all on public.${table} from anon, authenticated`);
    },
  );

  it("requires verified clinical attestation for doctor-issued prescriptions", () => {
    expect(careSql).toMatch(
      /clinical_attestation boolean not null check \(clinical_attestation\)/i,
    );
    expect(careSql).toMatch(/doctor_id uuid not null references public\.doctors/i);
  });
});
