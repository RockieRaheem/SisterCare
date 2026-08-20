import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { UGANDA_EMERGENCY_RESOURCES } from "../emergencyResources";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("visible urgent human support", () => {
  const panel = read("src", "components", "features", "UrgentSupportPanel.tsx");
  const help = read("src", "app", "help", "page.tsx");
  const footer = read("src", "components", "layout", "Footer.tsx");
  const chat = read("src", "app", "chat", "page.tsx");

  it("shows distinct emergency, mental-health and safeguarding choices", () => {
    expect(panel).toContain("Immediate danger");
    expect(panel).toContain("Mental-health crisis");
    expect(panel).toContain("Butabika");
    expect(panel).toContain("Child, family or violence support");
    expect(panel).toContain("Medical emergency");
    expect(panel).toContain("Outside Uganda");
  });

  it("uses the reviewed registry and callable phone links", () => {
    expect(UGANDA_EMERGENCY_RESOURCES.butabika.tollFreeNumber).toBe("0800 211 306");
    expect(UGANDA_EMERGENCY_RESOURCES.butabika.directNumber).toBe("0414 504 375");
    expect(panel).toContain('href={`tel:${resources.butabika.tollFreeNumber');
    expect(panel).toContain('href={`tel:${resources.sauti.number}`}');
  });

  it("is visible from help, the public footer and the chat disclaimer", () => {
    expect(help).toContain("<UrgentSupportPanel />");
    expect(footer).toContain("<UrgentSupportPanel compact />");
    expect(chat).toContain("not an emergency service");
    expect(chat).toContain("Urgent human help");
  });
});
