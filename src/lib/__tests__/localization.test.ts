import { describe, expect, it } from "vitest";
import {
  buildLocalizedReasoningMessage,
  buildTranslationPrompt,
} from "@/lib/localization";

describe("localized response pipeline", () => {
  it("uses a dedicated clinical Luganda translation brief", () => {
    const prompt = buildTranslationPrompt("Please visit a health centre today.", "Luganda");
    expect(prompt).toContain("natural contemporary Central-Uganda Luganda");
    expect(prompt).toContain("olubuto");
    expect(prompt).toContain("Return only the finished Luganda response");
  });

  it("keeps reasoning focused on the latest translated turn", () => {
    const message = buildLocalizedReasoningMessage("My head hurts.", "Luganda");
    expect(message).toContain("latest user message only");
    expect(message).toContain("clear English only");
    expect(message).toContain("My head hurts.");
  });
});
