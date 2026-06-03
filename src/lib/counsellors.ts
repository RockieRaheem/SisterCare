import { Counsellor, CounsellorSpecialty, CounsellorStatus } from "@/types";

export const COUNSELLOR_DIRECTORY: Counsellor[] = [
  {
    id: "1",
    name: "Dr. Sarah Namugga",
    title: "Clinical Psychologist",
    bio: "Passionate about women's mental health with over 10 years of experience helping women navigate life's challenges. I specialize in anxiety, depression, and reproductive mental health.",
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
    bio: "Dedicated to empowering women with knowledge about their bodies. I provide compassionate guidance on menstrual health, fertility, and family planning.",
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
    bio: "Helping women optimize their health through nutrition. I focus on hormone balance, menstrual cycle nutrition, and overall wellness.",
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
    bio: "Specialized in supporting young women through puberty and adolescence. Creating a safe space for teens to discuss their health concerns.",
    specializations: ["Adolescent Health", "Mental Health", "Menstrual Health"],
    photoURL:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face",
    status: "offline",
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
    bio: "Supporting mothers through their pregnancy journey and beyond. I provide emotional support, guidance on postpartum recovery, and maternal mental health care.",
    specializations: [
      "Pregnancy & Postpartum",
      "Mental Health",
      "Reproductive Health",
    ],
    photoURL:
      "https://plus.unsplash.com/premium_photo-1661740529633-ab79e4c1d5cb?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YWZyaWNhbiUyMGZlbWFsZSUyMGRvY3RvcnxlbnwwfHwwfHx8MA%3D%3D",
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
    bio: "Helping women build healthy relationships and navigate challenges in their personal lives. I offer a compassionate, non-judgmental space for healing.",
    specializations: [
      "Relationship Counselling",
      "Mental Health",
      "Sexual Health",
    ],
    photoURL:
      "https://images.unsplash.com/photo-1655720357761-f18ea9e5e7e6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGFmcmljYW4lMjBmZW1hbGUlMjBkb2N0b3J8ZW58MHx8MHx8fDA%3D",
    status: "busy",
    rating: 4.6,
    reviewCount: 62,
    yearsExperience: 5,
    languages: ["English", "Luganda"],
    phoneNumber: "+256704057370",
    whatsappNumber: "+256704057370",
    availableHours: {
      start: "11:00",
      end: "20:00",
      days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    sessionCount: 398,
    verified: false,
    createdAt: new Date("2023-01-10"),
  },
];

export const COUNSELLOR_SPECIALTIES: CounsellorSpecialty[] = [
  "Mental Health",
  "Menstrual Health",
  "Reproductive Health",
  "Nutrition & Wellness",
  "Pregnancy & Postpartum",
  "Sexual Health",
  "Adolescent Health",
  "Relationship Counselling",
];

export const COUNSELLOR_STATUS_FILTERS: {
  value: CounsellorStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available Now" },
  { value: "busy", label: "In Session" },
  { value: "offline", label: "Offline" },
];

export function getCounsellorById(id: string): Counsellor | null {
  return (
    COUNSELLOR_DIRECTORY.find((counsellor) => counsellor.id === id) || null
  );
}
