export function canOpenNewCareRequest(params: {
  priority: "normal" | "critical";
  continuity?: boolean;
  pilotPaused: boolean;
  safetyCoverageReady: boolean;
}): boolean {
  if (params.priority === "critical") return true;
  if (params.continuity) return true;
  return !params.pilotPaused && params.safetyCoverageReady;
}
