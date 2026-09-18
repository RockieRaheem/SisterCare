export interface DoctorVerificationInput {
  email: string;
  professionalName: string;
  title: string;
  bio: string;
  registrationNumber: string;
  licensingBody: string;
  credentialExpiresAt: string;
  evidenceReference: string;
  verificationNote: string;
  specializations: string[];
  languages: string[];
  yearsExperience: number;
  credentialVerified: boolean;
}

export function validateDoctorVerification(
  value: Partial<DoctorVerificationInput>,
  now = new Date(),
): { valid: true; value: DoctorVerificationInput } | { valid: false; error: string } {
  const text = (field: keyof DoctorVerificationInput) =>
    typeof value[field] === "string" ? String(value[field]).trim() : "";
  const email = text("email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: "Enter the doctor’s account email" };
  }
  const professionalName = text("professionalName");
  const title = text("title");
  const registrationNumber = text("registrationNumber");
  const licensingBody = text("licensingBody");
  const evidenceReference = text("evidenceReference");
  if (
    professionalName.length < 2 ||
    title.length < 2 ||
    registrationNumber.length < 2 ||
    licensingBody.length < 2 ||
    evidenceReference.length < 4
  ) {
    return { valid: false, error: "Professional identity and verification evidence are required" };
  }
  const expiry = new Date(`${text("credentialExpiresAt")}T23:59:59.999Z`);
  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= now.getTime()) {
    return { valid: false, error: "The professional credential must have a future expiry date" };
  }
  if (value.credentialVerified !== true) {
    return { valid: false, error: "Confirm that the credential was independently verified" };
  }
  const specializations = Array.isArray(value.specializations)
    ? value.specializations.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12)
    : [];
  const languages = Array.isArray(value.languages)
    ? value.languages.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 12)
    : [];
  if (!specializations.length || !languages.length) {
    return { valid: false, error: "Add at least one specialty and language" };
  }
  return {
    valid: true,
    value: {
      email,
      professionalName: professionalName.slice(0, 100),
      title: title.slice(0, 100),
      bio: text("bio").slice(0, 1200),
      registrationNumber: registrationNumber.slice(0, 160),
      licensingBody: licensingBody.slice(0, 160),
      credentialExpiresAt: text("credentialExpiresAt"),
      evidenceReference: evidenceReference.slice(0, 500),
      verificationNote: text("verificationNote").slice(0, 1000),
      specializations,
      languages,
      yearsExperience: Math.max(0, Math.min(80, Math.round(Number(value.yearsExperience) || 0))),
      credentialVerified: true,
    },
  };
}
