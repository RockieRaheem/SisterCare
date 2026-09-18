import { describe, expect, it } from "vitest";
import { assertDoctorAppointmentTransition, validatePrescriptionDraft } from "@/lib/server/doctorCare";

describe("doctor appointment state machine", () => {
  it.each([["requested", "booked"], ["booked", "in_consultation"], ["in_consultation", "completed"]] as const)(
    "allows %s to %s", (from, to) => expect(() => assertDoctorAppointmentTransition(from, to)).not.toThrow(),
  );
  it.each([["requested", "completed"], ["completed", "in_consultation"], ["cancelled", "booked"]] as const)(
    "rejects %s to %s", (from, to) => expect(() => assertDoctorAppointmentTransition(from, to)).toThrow(/Invalid doctor appointment transition/),
  );
});

describe("doctor prescription validation", () => {
  const valid = { medicineName: "Example", strength: "10 mg", dose: "one tablet", route: "oral", frequency: "once daily", duration: "five days", quantity: "five tablets", instructions: "", clinicalAttestation: true };
  it("requires all prescription components and a clinical attestation", () => {
    expect(validatePrescriptionDraft(valid).valid).toBe(true);
    expect(validatePrescriptionDraft({ ...valid, dose: "" }).valid).toBe(false);
    expect(validatePrescriptionDraft({ ...valid, clinicalAttestation: false }).valid).toBe(false);
  });
});
