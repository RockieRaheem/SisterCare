import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public authentication choices", () => {
  it.each(["login", "signup"])("offers email and Google, not a nonfunctional phone option on %s", (page) => {
    const source = readFileSync(path.join(process.cwd(), "src", "app", "auth", page, "page.tsx"), "utf8");
    expect(source).toContain('label="Email Address"');
    expect(source).toContain("handleGoogleSignIn");
    expect(source).not.toContain("phone_iphone");
    expect(source).not.toContain("signInWithOtp");
  });
});
