import type { PilotConsent } from "./pilot";

const OAUTH_TRANSACTION_KEY = "sistercare-oauth-transaction";
const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type OAuthTransaction =
  | {
      version: 1;
      mode: "login";
      createdAt: number;
    }
  | {
      version: 1;
      mode: "signup";
      registrationIntent: "member" | "counsellor";
      pilotConsent: PilotConsent;
      createdAt: number;
    };

export function createOAuthTransaction(input: {
  registrationIntent?: "member" | "counsellor";
  pilotConsent?: PilotConsent;
  now?: number;
}): OAuthTransaction {
  const createdAt = input.now ?? Date.now();
  if (input.registrationIntent && input.pilotConsent) {
    return {
      version: 1,
      mode: "signup",
      registrationIntent: input.registrationIntent,
      pilotConsent: input.pilotConsent,
      createdAt,
    };
  }
  return { version: 1, mode: "login", createdAt };
}

export function writeOAuthTransaction(
  storage: StorageLike,
  transaction: OAuthTransaction,
): void {
  storage.setItem(OAUTH_TRANSACTION_KEY, JSON.stringify(transaction));
}

export function clearOAuthTransaction(storage: StorageLike): void {
  storage.removeItem(OAUTH_TRANSACTION_KEY);
}

export function readOAuthTransaction(
  storage: StorageLike,
  now = Date.now(),
): OAuthTransaction | null {
  const raw = storage.getItem(OAUTH_TRANSACTION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as {
      version?: unknown;
      mode?: unknown;
      registrationIntent?: unknown;
      pilotConsent?: { adultConfirmed?: unknown; consentVersion?: unknown };
      createdAt?: unknown;
    };
    const validBase =
      value.version === 1 &&
      (value.mode === "login" || value.mode === "signup") &&
      typeof value.createdAt === "number" &&
      now - value.createdAt >= 0 &&
      now - value.createdAt <= OAUTH_TRANSACTION_TTL_MS;
    if (!validBase) throw new Error("Invalid or expired OAuth transaction");
    if (value.mode === "login") return value as OAuthTransaction;
    const validSignup =
      (value.registrationIntent === "member" ||
        value.registrationIntent === "counsellor") &&
      value.pilotConsent?.adultConfirmed === true &&
      typeof value.pilotConsent.consentVersion === "string";
    if (!validSignup) throw new Error("Invalid OAuth signup transaction");
    return value as OAuthTransaction;
  } catch {
    clearOAuthTransaction(storage);
    return null;
  }
}
