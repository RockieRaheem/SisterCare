import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (...segments: string[]) =>
  readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("member wellbeing experience", () => {
  const dashboard = read("src", "app", "dashboard", "page.tsx");
  const checkIn = read("src", "app", "wellbeing", "page.tsx");
  const presentation = read("src", "lib", "wellbeingPresentation.ts");
  const picker = read("src", "components", "features", "WellbeingPulsePicker.tsx");
  const dashboardCard = read("src", "components", "features", "DashboardWellbeingCard.tsx");
  const careChoices = read("src", "components", "features", "WellbeingCareChoices.tsx");
  const grounding = read("src", "components", "features", "WellbeingGrounding.tsx");
  const layout = read("src", "app", "layout.tsx");
  const pushNotifications = read("src", "lib", "pushNotifications.ts");
  const followUpNotifier = read("src", "components", "features", "WellbeingFollowUpNotifier.tsx");
  const landing = read("src", "app", "page.tsx");

  it("opens with private support instead of demanding a daily score", () => {
    expect(dashboard).not.toContain("logSymptoms");
    expect(dashboard).not.toContain("handleMoodSelect");
    expect(dashboard).toContain("DashboardWellbeingCard");
    expect(dashboardCard).toContain("You do not need the right words");
    expect(dashboardCard).toContain('href="/chat"');
    expect(dashboardCard).toContain('href="/counsellors"');
    expect(dashboardCard).toContain('href="/wellbeing"');
    expect(dashboardCard).toContain("Today's private check-in is saved");
    expect(dashboardCard).toContain("Review or change");
    expect(dashboard).not.toContain("submitWellbeingCheckIn");
    expect(checkIn).toContain("submitWellbeingCheckIn");
    expect(checkIn).toContain("OFFLINE_QUEUE_CHANGE_EVENT");
    expect(dashboardCard).not.toContain("WellbeingPulsePicker");
  });

  it("turns a check-in into immediate care rather than another survey", () => {
    expect(checkIn).toContain("WellbeingCareChoices");
    expect(careChoices).toContain("Steady this moment");
    expect(careChoices).toContain("Let it out");
    expect(careChoices).toContain("Talk to a person");
    expect(careChoices).toContain("I may not be safe");
    expect(grounding).toContain("Nothing is being recorded");
    expect(grounding).toContain("Step ${step + 1} of ${STEPS.length}");
  });

  it("offers emotional vocabulary, context and a member-selected support path", () => {
    expect(presentation).toContain('value: "anxious"');
    expect(presentation).toContain('value: "lonely"');
    expect(presentation).toContain('value: "numb"');
    expect(presentation).toContain('value: "safety_or_harassment"');
    expect(presentation).toContain('value: "talk_to_someone"');
    expect(checkIn).toContain("choose up to three");
    expect(checkIn).toContain("Add to my private check-in");
    expect(checkIn.indexOf("Choose support for this moment")).toBeLessThan(checkIn.indexOf("<WellbeingPulsePicker selected"));
  });

  it("makes repeat activity an edit to today's reflection", () => {
    expect(checkIn).toContain("todayCheckIn");
    expect(checkIn).toContain("Tap another feeling if it changes");
    expect(checkIn).toContain("entry.localDate === today");
  });

  it("does not require four scoring scales", () => {
    expect(checkIn).toContain("No scores or streaks");
    expect(checkIn).not.toContain("SCORE_AREAS");
    expect(checkIn).not.toContain("Overall mood");
  });

  it("uses one compact, accessible pulse control across phone experiences", () => {
    expect(picker).toContain("grid-cols-3");
    expect(picker).toContain("sm:grid-cols-6");
    expect(picker).toContain("aria-pressed");
    expect(picker).toContain("Choose the feeling closest to today");
    expect(dashboard.indexOf("DashboardWellbeingCard")).toBeLessThan(dashboard.indexOf("Timer & Status Section"));
  });

  it("explains the value and privacy of every wellbeing section", () => {
    expect(checkIn).toContain("Start with what you need—not a questionnaire");
    expect(checkIn).toContain("No scores or streaks");
    expect(checkIn).toContain("Nothing is saved just because you open one of these options");
    expect(checkIn).toContain("Or save one word for today");
    expect(checkIn).not.toContain("Only when useful");
    expect(checkIn).not.toContain("Look back without being scored");
    expect(checkIn).not.toContain("Open timeline");
    expect(checkIn).not.toContain('bg-[#241429]');
  });

  it("does not pressure members with automatic emotional check-in reminders", () => {
    expect(layout).not.toContain("WellbeingReminder");
    expect(pushNotifications).not.toContain("scheduleDailyWellnessCheck");
    expect(pushNotifications).not.toContain("dailyWellnessCheck");
    expect(pushNotifications).not.toContain("Your daily check-in awaits");
  });

  it("offers only member-requested, privacy-safe follow-ups", () => {
    expect(checkIn).toContain("Would you like SisterCare to check back?");
    expect(checkIn).toContain("Later today");
    expect(checkIn).toContain("Remove follow-up");
    expect(followUpNotifier).toContain("markWellbeingFollowUpDelivered");
    expect(followUpNotifier).toContain("The private follow-up you requested is ready.");
    expect(followUpNotifier).not.toContain("entry.note");
    expect(followUpNotifier).not.toContain("entry.feelings");
  });

  it("sets an honest mental-health promise before cycle tracking", () => {
    expect(landing).toContain("Talk about hurt, loss, fear, relationships, harassment");
    expect(landing).toContain("Check-ins use words, never scores");
    expect(landing.indexOf("Emotional wellbeing")).toBeLessThan(landing.indexOf("Menstrual support"));
    expect(landing).not.toContain("Record mood, stress, sleep, and energy");
  });
});
