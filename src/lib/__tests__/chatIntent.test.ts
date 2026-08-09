import { describe, expect, it } from "vitest";
import {
  getPregnancyDetailsFromLmp,
  getPregnancyDueDateFromMessages,
  getPregnancyLmpFromMessages,
  hasPregnancyConfirmation,
  inferClientAction,
  inferClientActionFromMeaning,
  isPregnancyActivationRequest,
  isPregnancyRecordQuestion,
} from "../chatPipeline/intent";

describe("deterministic chat actions", () => {
  it("returns a real sign-out action instead of a verbal promise", () => {
    expect(inferClientAction("Please log me out of this system")).toEqual({
      type: "sign_out",
    });
  });

  it("opens the relevant library result for a food article request", () => {
    expect(inferClientAction("Find me an article about foods I can eat")).toEqual({
      type: "navigate",
      href: "/library",
      search: "foods",
      articleId: 6,
    });
  });

  it("does not navigate merely because a page is mentioned", () => {
    expect(inferClientAction("What is on my dashboard?")).toBeNull();
    expect(inferClientAction("Open my counsellor sessions")).toEqual({
      type: "navigate",
      href: "/sessions",
    });
  });

  it.each([
    ["Luganda", "Ggulawo library", "Open the library", "/library"],
    ["Acholi", "Local navigation command", "Open my dashboard", "/dashboard"],
    ["Lugbara", "Local navigation command", "Show my profile", "/profile"],
    ["Runyankole", "Local navigation command", "Go to counsellors", "/counsellors"],
    ["Ateso", "Local navigation command", "Open my sessions", "/sessions"],
    ["Swahili", "Fungua mipangilio", "Open settings", "/settings"],
  ])(
    "navigates from the translated meaning of a %s command",
    (_language, originalMessage, englishMeaning, href) => {
      expect(
        inferClientActionFromMeaning({ originalMessage, englishMeaning }),
      ).toEqual({ type: "navigate", href });
    },
  );

  it("signs out from a translated local-language command", () => {
    expect(
      inferClientActionFromMeaning({
        originalMessage: "Local sign-out command",
        englishMeaning: "Please sign me out now",
      }),
    ).toEqual({ type: "sign_out" });
  });
});

describe("pregnancy conversation memory", () => {
  const now = new Date("2026-08-04T12:00:00.000Z");

  it("uses pregnancy confirmation from an earlier user turn", () => {
    expect(
      hasPregnancyConfirmation("Update the system now", [
        { role: "assistant", content: "How can I help?" },
        { role: "user", content: "I checked today and I'm pregnant" },
      ]),
    ).toBe(true);
    expect(
      hasPregnancyConfirmation("Update the system now", [
        { role: "assistant", content: "A user might be pregnant" },
      ]),
    ).toBe(false);
  });

  it("recognises English and Luganda pregnancy confirmation", () => {
    expect(hasPregnancyConfirmation("I am 30 days pregnant", [])).toBe(true);
    expect(hasPregnancyConfirmation("Ndi lubuto", [])).toBe(true);
  });

  it("recognises a direct request to switch tracking state", () => {
    expect(
      isPregnancyActivationRequest(
        "Set the system to pregnancy mode; I am not in menstruation",
      ),
    ).toBe(true);
  });

  it("interprets explicit dates day-first and rejects impossible dates", () => {
    const date = getPregnancyLmpFromMessages(["My LMP was 10/06/2026"], now);
    expect(date && [date.getFullYear(), date.getMonth(), date.getDate()]).toEqual(
      [2026, 5, 10],
    );
    expect(
      getPregnancyLmpFromMessages(["My LMP was 31/02/2026"], now),
    ).toBeNull();
  });

  it("derives an LMP from a stated pregnancy duration deterministically", () => {
    expect(
      getPregnancyLmpFromMessages(["I am pregnant 30 days"], now)?.toISOString(),
    ).toBe("2026-07-05T12:00:00.000Z");
    expect(
      getPregnancyLmpFromMessages(["I am pregnant 2 days"], now),
    ).toBeNull();
  });

  it("does not confuse an unlabeled date with a due date", () => {
    expect(
      getPregnancyDueDateFromMessages(["My due date is 12/03/2027"])
        ?.toISOString()
        .slice(0, 10),
    ).toBe("2027-03-12");
    expect(
      getPregnancyDueDateFromMessages(["I visited the clinic on 12/03/2027"]),
    ).toBeNull();
  });

  it("computes due date and trimester from the stored LMP", () => {
    const details = getPregnancyDetailsFromLmp(
      new Date("2026-06-10T12:00:00.000Z"),
      now,
    );
    expect(details.daysPregnant).toBe(55);
    expect(details.weeksPregnant).toBe(7);
    expect(details.trimester).toBe("first");
    expect(details.estimatedDueDate.toISOString().slice(0, 10)).toBe(
      "2027-03-17",
    );
  });

  it("recognises questions that must use the canonical pregnancy record", () => {
    expect(isPregnancyRecordQuestion("What is my estimated due date?")).toBe(
      true,
    );
    expect(isPregnancyRecordQuestion("Tell me about nutrition")).toBe(false);
  });
});
