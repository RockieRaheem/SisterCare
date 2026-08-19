export const CONTROLLED_PILOT = {
  active: true,
  minimumAge: 18,
  consentVersion: "pilot-2026-08-19",
} as const;

export interface PilotConsent {
  adultConfirmed: true;
  consentVersion: typeof CONTROLLED_PILOT.consentVersion;
}

export function currentPilotConsent(): PilotConsent {
  return {
    adultConfirmed: true,
    consentVersion: CONTROLLED_PILOT.consentVersion,
  };
}
