"use client";

import { useCallback, useEffect, useRef } from "react";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { showBrowserNotification } from "@/lib/notifications";

interface DutyResponse {
  success?: boolean;
  data?: { selected?: boolean; assignedOpenCases?: number };
}

export default function SafetyDutyHeartbeat() {
  const assignedRef = useRef(0);

  const refresh = useCallback(async () => {
    const response = await authenticatedFetch("/api/admin/safety-duty", { cache: "no-store" });
    const result = await response.json().catch(() => ({})) as DutyResponse;
    if (!response.ok || !result.data?.selected) return;
    await authenticatedFetch("/api/admin/safety-duty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const assigned = result.data.assignedOpenCases || 0;
    if (assigned > assignedRef.current) {
      showBrowserNotification("Safety response required", {
        body: "A SisterCare safety case has been assigned to you. Open Incident response now.",
        tag: "sistercare-safety-duty",
        data: { href: "/admin/incidents" },
      });
    }
    assignedRef.current = assigned;
  }, []);

  useEffect(() => {
    void refresh();
    const heartbeat = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(heartbeat);
  }, [refresh]);

  return null;
}
