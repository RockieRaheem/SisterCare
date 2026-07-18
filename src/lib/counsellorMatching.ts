/**
 * Pure counsellor matching logic — availability evaluation, scoring, and the
 * static fallback directory. No Firebase imports, so both the client-SDK data
 * layer (src/lib/firestore.ts) and the admin-SDK server layer
 * (src/lib/server/serverData.ts) share ONE implementation, and the scoring
 * can be unit-tested in isolation (ARCHITECTURE_V2 §4.5).
 */

import { Counsellor, CounsellorSpecialty } from "@/types";

/**
 * Days of the week in order (consistent with Counsellor.availableHours.days)
 */
const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Evaluate whether a counsellor is currently available based on their
 * availableHours schedule and current time. Returns both immediate
 * availability and the next available time slot.
 */
export function evaluateTimeAvailability(
  counsellor: Counsellor,
  now: Date = new Date(),
): {
  isAvailableNow: boolean;
  nextAvailableTime: string | null;
} {
  const currentDay = DAYS_OF_WEEK[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { availableHours } = counsellor;
  const todayInSchedule = availableHours.days.some(
    (d) => d.toLowerCase() === currentDay.toLowerCase(),
  );

  if (!todayInSchedule) {
    // Find the next available day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = DAYS_OF_WEEK[nextDayIndex];
      if (
        availableHours.days.some(
          (d) => d.toLowerCase() === nextDay.toLowerCase(),
        )
      ) {
        return {
          isAvailableNow: false,
          nextAvailableTime: `${nextDay} at ${availableHours.start}`,
        };
      }
    }
    return { isAvailableNow: false, nextAvailableTime: null };
  }

  const [startH, startM] = availableHours.start.split(":").map(Number);
  const [endH, endM] = availableHours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isAvailableNow =
    currentMinutes >= startMinutes && currentMinutes < endMinutes;

  if (!isAvailableNow) {
    if (currentMinutes < startMinutes) {
      return {
        isAvailableNow: false,
        nextAvailableTime: `Today at ${availableHours.start}`,
      };
    }
    // Find next available day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = DAYS_OF_WEEK[nextDayIndex];
      if (
        availableHours.days.some(
          (d) => d.toLowerCase() === nextDay.toLowerCase(),
        )
      ) {
        return {
          isAvailableNow: false,
          nextAvailableTime: `${nextDay} at ${availableHours.start}`,
        };
      }
    }
  }

  return { isAvailableNow, nextAvailableTime: null };
}

/**
 * Score a counsellor for a given assignment request.
 * Returns a score from 0-100 where higher is better.
 */
export function calculateCounsellorScore(
  counsellor: Counsellor,
  params: {
    specialty?: CounsellorSpecialty;
    preferredLanguage?: string;
  },
  availability: { isAvailableNow: boolean; nextAvailableTime: string | null },
  activeLoad: number,
): number {
  let score = 0;

  // 1. Time-based availability (35 points)
  if (availability.isAvailableNow && counsellor.status === "available") {
    score += 35;
  } else if (availability.isAvailableNow) {
    score += 20; // Available time-wise but marked busy/offline
  } else if (counsellor.status === "available") {
    score += 10; // Marked available but outside hours
  }

  // 2. Language match (30 points)
  if (params.preferredLanguage) {
    const exactLangMatch = counsellor.languages.some(
      (l) => l.toLowerCase() === params.preferredLanguage!.toLowerCase(),
    );
    if (exactLangMatch) {
      score += 30;
    } else {
      // Partial match — check if any language starts with same root
      const partialMatch = counsellor.languages.some((l) =>
        params
          .preferredLanguage!.toLowerCase()
          .startsWith(l.substring(0, 3).toLowerCase()),
      );
      if (partialMatch) score += 10;
    }
  } else {
    score += 15; // No preference — neutral
  }

  // 3. Specialty match (20 points)
  if (params.specialty) {
    if (counsellor.specializations.includes(params.specialty)) {
      score += 20;
    } else {
      // Check if any overlapping coverage
      const hasRelated = counsellor.specializations.some((s) => {
        if (params.specialty === "Mental Health") return true; // Mental Health is universal
        if (params.specialty === "Menstrual Health")
          return ["Reproductive Health", "Pregnancy & Postpartum"].includes(s);
        if (params.specialty === "Reproductive Health")
          return [
            "Menstrual Health",
            "Pregnancy & Postpartum",
            "Sexual Health",
          ].includes(s);
        if (params.specialty === "Pregnancy & Postpartum")
          return ["Reproductive Health", "Menstrual Health"].includes(s);
        if (params.specialty === "Sexual Health")
          return ["Reproductive Health", "Adolescent Health"].includes(s);
        if (params.specialty === "Adolescent Health")
          return ["Mental Health", "Menstrual Health"].includes(s);
        if (params.specialty === "Relationship Counselling")
          return ["Mental Health"].includes(s);
        if (params.specialty === "Nutrition & Wellness")
          return ["Menstrual Health", "Adolescent Health"].includes(s);
        return false;
      });
      if (hasRelated) score += 8;
    }
  } else {
    score += 10; // No preference — neutral
  }

  // 4. Load balancing (10 points) — fewer active conversations = better
  if (activeLoad === 0) {
    score += 10;
  } else if (activeLoad === 1) {
    score += 7;
  } else if (activeLoad === 2) {
    score += 4;
  } else if (activeLoad >= 5) {
    score -= 5; // Penalty for overloaded
  }

  // 5. Rating bonus (5 points)
  score += Math.min(5, counsellor.rating);

  return score;
}

/**
 * Rank candidate counsellors for an assignment request. Pure — the caller
 * supplies availability and load data from whichever data source it uses.
 */
export function rankCounsellors(
  candidates: Counsellor[],
  params: { specialty?: CounsellorSpecialty; preferredLanguage?: string },
  loads: Map<string, number>,
  now: Date = new Date(),
): Counsellor | null {
  const scored = candidates.map((c) => ({
    counsellor: c,
    score: calculateCounsellorScore(
      c,
      params,
      evaluateTimeAvailability(c, now),
      loads.get(c.id) || 0,
    ),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.length > 0 ? scored[0].counsellor : null;
}

/**
 * Select candidates with static-directory fallback when the live list is
 * empty or lacks the preferred language. Pure; shared by both data layers.
 */
export function selectCandidates(
  fetched: Counsellor[],
  params: { specialty?: CounsellorSpecialty; preferredLanguage?: string },
): Counsellor[] {
  let candidates = fetched;

  if (candidates.length === 0) {
    candidates = params.specialty
      ? STATIC_COUNSELLORS.filter((c) =>
          c.specializations.includes(params.specialty as CounsellorSpecialty),
        )
      : STATIC_COUNSELLORS;
    if (candidates.length === 0) candidates = STATIC_COUNSELLORS;
  }

  if (params.preferredLanguage) {
    const hasAnyLang = candidates.some((c) =>
      c.languages.some(
        (l) => l.toLowerCase() === params.preferredLanguage!.toLowerCase(),
      ),
    );
    if (!hasAnyLang) {
      const staticLangs = STATIC_COUNSELLORS.filter((c) =>
        c.languages.some(
          (l) => l.toLowerCase() === params.preferredLanguage!.toLowerCase(),
        ),
      );
      if (staticLangs.length > 0) candidates = staticLangs;
    }
  }

  return candidates;
}

// Static counsellor fallback used when Firestore collection is empty.
// NOTE: demo data — all entries share one placeholder phone number.
export const STATIC_COUNSELLORS: Counsellor[] = [
  {
    id: "1",
    name: "Dr. Sarah Namugga",
    title: "Clinical Psychologist",
    bio: "Passionate about women's mental health with over 10 years of experience helping women navigate life's challenges.",
    specializations: [
      "Mental Health",
      "Reproductive Health",
      "Pregnancy & Postpartum",
    ],
    photoURL:
      "https://media.istockphoto.com/id/1061001352/photo/portrait-of-confident-senior-female-doctor-in-scrubs.webp?a=1&b=1&s=612x612&w=0&k=20&c=u3Lor1FUwqXc73oKPS6ncsOPPwA1QFlimqjT4PSvO6U=",
    status: "available",
    rating: 4.9,
    reviewCount: 127,
    yearsExperience: 10,
    languages: ["English", "Luganda", "Swahili"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "08:00",
      end: "18:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    sessionCount: 1240,
    verified: true,
    createdAt: new Date("2020-01-15"),
  },
  {
    id: "2",
    name: "Ms. Grace Achieng",
    title: "Reproductive Health Specialist",
    bio: "Dedicated to empowering women with knowledge about their bodies.",
    specializations: [
      "Menstrual Health",
      "Reproductive Health",
      "Sexual Health",
    ],
    photoURL:
      "https://media.istockphoto.com/id/1323303738/photo/medical-doctor-indoors-portraits.webp?a=1&b=1&s=612x612&w=0&k=20&c=yZa7CUM8vn95un_1M-8rf86elGYB6oBrBP4GVIZZ2C0=",
    status: "busy",
    rating: 4.8,
    reviewCount: 98,
    yearsExperience: 8,
    languages: ["English", "Luo"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "09:00",
      end: "17:00",
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    sessionCount: 856,
    verified: true,
    createdAt: new Date("2021-03-20"),
  },
  {
    id: "3",
    name: "Dr. Faith Nakamya",
    title: "Nutritionist & Wellness Coach",
    bio: "Helping women optimize their health through nutrition and hormone balance.",
    specializations: [
      "Nutrition & Wellness",
      "Menstrual Health",
      "Adolescent Health",
    ],
    photoURL:
      "https://media.istockphoto.com/id/2193298581/photo/smiling-doctor-looking-out-the-window-in-her-office.webp?a=1&b=1&s=612x612&w=0&k=20&c=ZYOOoyIWh6NFRK96Kgwp__gGHRf_7luFbfdpc4cf3YA=",
    status: "available",
    rating: 4.7,
    reviewCount: 76,
    yearsExperience: 6,
    languages: ["English", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "10:00",
      end: "19:00",
      days: ["Monday", "Wednesday", "Friday", "Saturday"],
    },
    sessionCount: 543,
    verified: true,
    createdAt: new Date("2022-06-10"),
  },
  {
    id: "4",
    name: "Ms. Mercy Atim",
    title: "Adolescent Health Counsellor",
    bio: "Specialized in supporting young women through puberty and adolescence.",
    specializations: ["Adolescent Health", "Mental Health", "Menstrual Health"],
    photoURL:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face",
    status: "available",
    rating: 4.9,
    reviewCount: 84,
    yearsExperience: 7,
    languages: ["English", "Ateso", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "08:00",
      end: "16:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    sessionCount: 672,
    verified: true,
    createdAt: new Date("2021-09-01"),
  },
  {
    id: "5",
    name: "Dr. Patience Nabirye",
    title: "Pregnancy & Postpartum Specialist",
    bio: "Supporting mothers through their pregnancy journey and beyond.",
    specializations: [
      "Pregnancy & Postpartum",
      "Mental Health",
      "Reproductive Health",
    ],
    photoURL:
      "https://plus.unsplash.com/premium_photo-1661740529633-ab79e4c1d5cb?w=600&auto=format&fit=crop&q=60",
    status: "available",
    rating: 5.0,
    reviewCount: 156,
    yearsExperience: 12,
    languages: ["English", "Lusoga", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "07:00",
      end: "15:00",
      days: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    sessionCount: 1890,
    verified: true,
    createdAt: new Date("2019-02-14"),
  },
  {
    id: "6",
    name: "Ms. Joy Nabwire",
    title: "Relationship Counsellor",
    bio: "Helping women build healthy relationships and navigate emotional challenges.",
    specializations: [
      "Relationship Counselling",
      "Mental Health",
      "Sexual Health",
    ],
    photoURL:
      "https://images.unsplash.com/photo-1655720357761-f18ea9e5e7e6?w=600&auto=format&fit=crop&q=60",
    status: "available",
    rating: 4.6,
    reviewCount: 62,
    yearsExperience: 5,
    languages: ["English", "Runyankole", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "11:00",
      end: "20:00",
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    sessionCount: 398,
    verified: true,
    createdAt: new Date("2023-01-10"),
  },
];
