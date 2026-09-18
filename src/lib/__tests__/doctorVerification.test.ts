import { describe, expect, it } from "vitest";
import { validateDoctorVerification } from "@/lib/doctorVerification";

const valid = {
  email: "doctor@example.com", professionalName: "Dr Amina", title: "Medical doctor", bio: "",
  registrationNumber: "UMDPC-123", licensingBody: "UMDPC", credentialExpiresAt: "2030-01-01",
  evidenceReference: "registry-check-123", verificationNote: "Checked against the regulator registry",
  specializations: ["General Practice"], languages: ["English"], yearsExperience: 5, credentialVerified: true,
};

describe("doctor verification", () => {
  it("accepts a complete independently confirmed record", () => {
    expect(validateDoctorVerification(valid, new Date("2026-08-24")).valid).toBe(true);
  });

  it.each([
    [{ credentialVerified: false }, "independently verified"],
    [{ credentialExpiresAt: "2020-01-01" }, "future expiry"],
    [{ evidenceReference: "" }, "verification evidence"],
    [{ specializations: [] }, "specialty and language"],
  ])("fails closed when verification is incomplete", (change, message) => {
    const result = validateDoctorVerification({ ...valid, ...change }, new Date("2026-08-24"));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain(message);
  });
});
