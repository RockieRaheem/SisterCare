import { COUNSELLOR_SPECIALTIES } from "@/lib/counsellors";
import type { CounsellorSpecialty } from "@/types";

export type EditableCounsellorProfile = {
  name: string;
  title: string;
  bio: string;
  languages: string[];
  specializations: CounsellorSpecialty[];
  photoURL: string | null;
};

export class CounsellorProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CounsellorProfileValidationError";
  }
}

const cleanText = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

export function isOwnedCounsellorPhotoPath(
  value: unknown,
  uid: string,
): value is string {
  if (typeof value !== "string" || !value.startsWith(`${uid}/`)) return false;
  const filename = value.slice(uid.length + 1);
  return (
    filename.length > 0 &&
    !filename.includes("/") &&
    !filename.includes("..") &&
    /\.(?:jpe?g|png|webp)$/i.test(filename)
  );
}

export function parseCounsellorProfileUpdate(
  body: unknown,
  uid: string,
  currentPhotoURL?: unknown,
): EditableCounsellorProfile {
  const source =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const name = cleanText(source.name, 100);
  const title = cleanText(source.title, 100);
  const bio = cleanText(source.bio, 1200);
  const languages = Array.isArray(source.languages)
    ? [...new Set(source.languages.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 10)
    : [];
  const specializations = Array.isArray(source.specializations)
    ? [...new Set(source.specializations)]
        .filter(
          (item): item is CounsellorSpecialty =>
            typeof item === "string" &&
            COUNSELLOR_SPECIALTIES.includes(item as CounsellorSpecialty),
        )
        .slice(0, 5)
    : [];
  const requestedPhoto = source.photoURL;
  const photoURL =
    requestedPhoto === null || requestedPhoto === ""
      ? null
      : typeof requestedPhoto === "string" &&
          (requestedPhoto === currentPhotoURL ||
            isOwnedCounsellorPhotoPath(requestedPhoto, uid))
        ? requestedPhoto
        : undefined;

  if (name.length < 2) {
    throw new CounsellorProfileValidationError(
      "Professional name is required.",
    );
  }
  if (title.length < 2) {
    throw new CounsellorProfileValidationError(
      "Professional title is required.",
    );
  }
  if (bio.length < 10) {
    throw new CounsellorProfileValidationError(
      "Add a professional bio of at least 10 characters.",
    );
  }
  if (languages.length === 0) {
    throw new CounsellorProfileValidationError("Add at least one language.");
  }
  if (specializations.length === 0) {
    throw new CounsellorProfileValidationError(
      "Choose at least one area of practice.",
    );
  }
  if (photoURL === undefined) {
    throw new CounsellorProfileValidationError(
      "The selected profile photo is not owned by this account.",
    );
  }

  return {
    name,
    title,
    bio,
    languages,
    specializations,
    photoURL,
  };
}
