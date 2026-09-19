import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeCareNotification } from "@/lib/careNotification";

const service = fs.readFileSync(path.join(process.cwd(), "src", "lib", "server", "safetyAlerts.ts"), "utf8");
const route = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "chat", "route.ts"), "utf8");
const migration = fs.readFileSync(path.join(process.cwd(), "supabase", "migrations", "20260824_0038_medical_safety_incidents.sql"), "utf8");
const notifier = fs.readFileSync(path.join(process.cwd(), "src", "components", "features", "SessionNotifier.tsx"), "utf8");

describe("medical safety incident response", () => {
  it("creates a high-severity accountable incident and alerts admins", () => {
    expect(service).toContain('type: "ai_medical_output_blocked"');
    expect(service).toContain('severity: "high"');
    expect(service).toContain('.eq("role", "admin")');
    expect(migration).toContain("'medical_safety_block'");
  });

  it("does not broadcast the member message or generated answer", () => {
    const functionBody = service.split("export async function notifyMedicalSafetyBlock")[1];
    expect(functionBody).not.toContain("messageText");
    expect(functionBody).not.toContain("generatedText");
    expect(functionBody).toContain("violationClasses");
  });

  it("records blocks before returning a safe replacement", () => {
    expect(route).toContain("notifyMedicalSafetyBlock");
    expect(route).toContain('stage: "model_output"');
    expect(route).toContain('stage: "localized_output"');
    expect(describeCareNotification("medical_safety_block").title).toBe("AI medical safety block");
    expect(notifier).toContain('update.type === "medical_safety_block" ? "safety"');
  });

  it("also guards translated replies from early-return safety and referral lanes", () => {
    const helper = route.split("async function prepareSpokenAgentResponse(")[1]
      .split("/**\n * POST /api/chat")[0];
    expect(helper).toContain("enforceMedicalOutputBoundary(localizedText)");
    expect(helper).toContain('stage: "localized_output"');
    expect(helper).toContain("localizedText: medicalBoundary.text");
  });
});
