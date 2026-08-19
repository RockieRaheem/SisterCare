/**
 * Human-verified Uganda support contacts used in safety-critical responses.
 * Changes require safeguarding review and confirmation against the linked
 * public authority before release.
 */
export const UGANDA_EMERGENCY_RESOURCES = {
  jurisdiction: "UG",
  verifiedAt: "2026-08-19",
  police: {
    label: "Uganda Police Emergency",
    number: "999 or 112",
    source: "https://upf.go.ug/faq/",
  },
  ambulance: {
    label: "Uganda National Emergency Medical Services",
    number: "912",
    source: "https://health.go.ug/",
  },
  sauti: {
    label: "Sauti 116 Helpline",
    number: "116",
    availability: "toll-free, 24/7",
    source: "https://sauti.mglsd.go.ug/sauti/faqs",
  },
  butabika: {
    label: "Butabika National Referral Mental Hospital",
    directNumber: "0414 504 375",
    tollFreeNumber: "0800 211 306",
    source: "https://www.butabikahospital.go.ug/",
  },
  fida: {
    label: "FIDA Uganda",
    number: "0414 530 848",
    tollFreeNumber: "0800 111 511",
    source: "https://fidauganda.or.ug/",
  },
} as const;

export const BUTABIKA_CONTACT_TEXT = `${UGANDA_EMERGENCY_RESOURCES.butabika.directNumber} or toll-free ${UGANDA_EMERGENCY_RESOURCES.butabika.tollFreeNumber}`;
