import { describe, expect, it } from "vitest";
import {
  readVoiceRepliesPreference,
  speechLocale,
  VOICE_REPLIES_STORAGE_KEY,
} from "../voicePlayback";

describe("voice reply accessibility preferences", () => {
  it("uses Ugandan language tags for device speech fallback", () => {
    expect(speechLocale("eng")).toBe("en-UG");
    expect(speechLocale("lug")).toBe("lg-UG");
    expect(speechLocale("swa")).toBe("sw-UG");
  });

  it("requires an explicit opt-in before sensitive replies play aloud", () => {
    expect(readVoiceRepliesPreference({ getItem: () => null })).toBe(false);
    expect(readVoiceRepliesPreference({
      getItem: (key) => key === VOICE_REPLIES_STORAGE_KEY ? "true" : null,
    })).toBe(true);
  });
});
