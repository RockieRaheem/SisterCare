import { SessionState } from "@/types";

export interface CanonicalHandoffStatus {
  connected: boolean;
  label: string;
  message: string;
}

export function describeCanonicalHandoff(
  state: SessionState,
  counsellorName?: string,
): CanonicalHandoffStatus {
  if (state === "active") {
    return {
      connected: true,
      label: "Counsellor accepted; private room ready",
      message: `${counsellorName || "Your counsellor"} has accepted your request. Your private care room is ready.`,
    };
  }

  if (state === "matched" || state === "accepted") {
    const acceptance = counsellorName
      ? `when ${counsellorName} accepts`
      : "when the assigned counsellor accepts";
    return {
      connected: false,
      label: "Counsellor notified; waiting for acceptance",
      message: `A verified counsellor has been notified, but you are not connected yet. SisterCare will tell you ${acceptance}. You can follow the request from My Sessions.`,
    };
  }

  return {
    connected: false,
    label: "Request queued; waiting for an available counsellor",
    message: "Your request is safely in the care queue. No counsellor has accepted it yet. You can follow the request from My Sessions.",
  };
}
