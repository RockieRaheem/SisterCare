import { describe, expect, it } from "vitest";
import {
  readVoiceRepliesPreference,
  readVoiceSelections,
  selectedVoiceForLanguage,
  speechLocale,
  VOICE_REPLIES_STORAGE_KEY,
  VOICE_SELECTIONS_STORAGE_KEY,
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

  it("replaces stored legacy voices with the approved language voice", () => {
    const selections = readVoiceSelections({
      getItem: (key) => key === VOICE_SELECTIONS_STORAGE_KEY
        ? JSON.stringify({ lug: "waxal_lug_0006", eng: "not-a-real-voice" })
        : null,
    });
    expect(selectedVoiceForLanguage("lug", selections)).toBe("waxal_lug_0003");
    expect(selectedVoiceForLanguage("eng", selections)).toBe("salt_eng_0001");
    expect(selectedVoiceForLanguage("lgg", selections)).toBeUndefined();
  });
});
