import { describe, expect, it } from "vitest";
import { CONTROLLED_PILOT } from "../pilot";
import {
  clearOAuthTransaction,
  createOAuthTransaction,
  readOAuthTransaction,
  writeOAuthTransaction,
} from "../oauthTransaction";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("Google OAuth transactions", () => {
  it("keeps login and signup intent in tab-scoped storage", () => {
    const storage = new MemoryStorage();
    const transaction = createOAuthTransaction({
      registrationIntent: "counsellor",
      pilotConsent: {
        adultConfirmed: true,
        consentVersion: CONTROLLED_PILOT.consentVersion,
      },
      now: 1_000,
    });

    writeOAuthTransaction(storage, transaction);
    expect(readOAuthTransaction(storage, 2_000)).toEqual(transaction);
    clearOAuthTransaction(storage);
    expect(readOAuthTransaction(storage, 2_000)).toBeNull();
  });

  it("rejects expired or malformed transactions", () => {
    const storage = new MemoryStorage();
    writeOAuthTransaction(
      storage,
      createOAuthTransaction({ now: 1_000 }),
    );
    expect(readOAuthTransaction(storage, 1_000 + 11 * 60 * 1_000)).toBeNull();

    storage.setItem("sistercare-oauth-transaction", "not-json");
    expect(readOAuthTransaction(storage)).toBeNull();
  });
});
