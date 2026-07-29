import { describe, expect, it } from "vitest";
import { SUPPORT_CONTACTS } from "../supportContacts";

describe("counsellor operations contacts", () => {
  it("provides call, WhatsApp, and email actions", () => {
    expect(SUPPORT_CONTACTS.callUrl).toMatch(/^tel:\+/);
    expect(SUPPORT_CONTACTS.whatsappUrl).toMatch(
      /^https:\/\/wa\.me\/\d+\?text=/,
    );
    expect(SUPPORT_CONTACTS.emailUrl).toMatch(/^mailto:[^?]+\?/);
  });
});
