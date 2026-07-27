export type IncidentStatus = "open" | "acknowledged" | "resolved";

export interface IncidentTransition {
  from: IncidentStatus;
  to: IncidentStatus;
}

const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ["acknowledged"],
  acknowledged: ["resolved"],
  resolved: [],
};

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export function assertIncidentTransition(
  from: IncidentStatus,
  to: IncidentStatus,
): void {
  if (!canTransitionIncident(from, to)) {
    throw new Error(`Invalid incident transition: ${from} -> ${to}`);
  }
}

