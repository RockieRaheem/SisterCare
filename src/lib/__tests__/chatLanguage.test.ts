import { describe, expect, it } from "vitest";
import { resolveChatLanguage } from "../chatLanguage";

describe("chat language policy", () => {
  it("keeps the chat selector authoritative over automatic detection", () => {
    expect(
      resolveChatLanguage({
        clientLanguage: "eng",
        storedLanguage: "lug",
        inferredLanguage: "lug",
      }),
    ).toBe("eng");
  });

  it("uses an explicit in-message request for that response", () => {
    expect(
      resolveChatLanguage({
        requestedLanguage: "eng",
        clientLanguage: "lug",
        storedLanguage: "lug",
      }),
    ).toBe("eng");
    expect(
      resolveChatLanguage({
        requestedLanguage: "lug",
        clientLanguage: "eng",
      }),
    ).toBe("lug");
  });

  it("only detects a language when no explicit preference is available", () => {
    expect(resolveChatLanguage({ inferredLanguage: "lug" })).toBe("lug");
    expect(resolveChatLanguage({})).toBe("eng");
  });
});
