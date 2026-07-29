const phone =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || "+256704057370";
const whatsapp =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() || phone;
const email =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@sistercare.app";

const whatsappNumber = whatsapp.replace(/\D/g, "");
const whatsappMessage = encodeURIComponent(
  "Hello SisterCare operations, I need support with my counsellor account or KYC application.",
);

export const SUPPORT_CONTACTS = {
  phone,
  email,
  callUrl: `tel:${phone.replace(/[^\d+]/g, "")}`,
  whatsappUrl: `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`,
  emailUrl: `mailto:${email}?subject=${encodeURIComponent(
    "SisterCare counsellor support",
  )}&body=${encodeURIComponent(
    "Hello SisterCare operations,\n\nI need support with my counsellor account or KYC application.\n\nAccount email:\nApplication issue:\nPreferred contact time:",
  )}`,
};
