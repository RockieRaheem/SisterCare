import { describe, expect, it } from "vitest";
import {
  isOwnedCounsellorPhotoPath,
  parseCounsellorProfileUpdate,
} from "../counsellorProfile";

const validUpdate = {
  name: "Dr Amina",
  title: "Mental health counsellor",
  bio: "I provide private, non-judgmental emotional support.",
  languages: ["English", "Luganda"],
  specializations: ["Mental Health"],
  photoURL: "counsellor-1/profile-new.webp",
};

describe("counsellor profile updates", () => {
  it("accepts only flat image paths owned by the counsellor", () => {
    expect(
      isOwnedCounsellorPhotoPath(
        "counsellor-1/profile-new.webp",
        "counsellor-1",
      ),
    ).toBe(true);
    expect(
      isOwnedCounsellorPhotoPath(
        "other-user/profile-new.webp",
        "counsellor-1",
      ),
    ).toBe(false);
    expect(
      isOwnedCounsellorPhotoPath(
        "counsellor-1/nested/profile-new.webp",
        "counsellor-1",
      ),
    ).toBe(false);
    expect(
      isOwnedCounsellorPhotoPath(
        "counsellor-1/profile-new.svg",
        "counsellor-1",
      ),
    ).toBe(false);
  });

  it("normalizes editable public fields without accepting operational fields", () => {
    const parsed = parseCounsellorProfileUpdate(
      {
        ...validUpdate,
        languages: ["English", "English", " Luganda "],
        rating: 5,
        verificationStatus: "verified",
        acceptingNewSessions: true,
      },
      "counsellor-1",
    );

    expect(parsed).toEqual({
      ...validUpdate,
      languages: ["English", "Luganda"],
    });
    expect(parsed).not.toHaveProperty("rating");
    expect(parsed).not.toHaveProperty("verificationStatus");
    expect(parsed).not.toHaveProperty("acceptingNewSessions");
  });

  it("allows removal while rejecting another account's photo", () => {
    expect(
      parseCounsellorProfileUpdate(
        { ...validUpdate, photoURL: null },
        "counsellor-1",
      ).photoURL,
    ).toBeNull();
    expect(() =>
      parseCounsellorProfileUpdate(
        { ...validUpdate, photoURL: "other/profile.jpg" },
        "counsellor-1",
      ),
    ).toThrow(/not owned/i);
  });

  it("preserves an unchanged legacy photo while requiring complete profile fields", () => {
    const legacyPhoto = "https://legacy.example/counsellor.jpg";
    expect(
      parseCounsellorProfileUpdate(
        { ...validUpdate, photoURL: legacyPhoto },
        "counsellor-1",
        legacyPhoto,
      ).photoURL,
    ).toBe(legacyPhoto);
    expect(() =>
      parseCounsellorProfileUpdate(
        { ...validUpdate, languages: [] },
        "counsellor-1",
      ),
    ).toThrow(/language/i);
  });
});
