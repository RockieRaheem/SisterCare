import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function installedVersion(packageName: string): string {
  const manifest = JSON.parse(
    readFileSync(
      join(process.cwd(), "node_modules", packageName, "package.json"),
      "utf8",
    ),
  ) as { version: string };
  return manifest.version;
}

describe("Firebase Admin server runtime", () => {
  it(
    "loads the CommonJS authentication entrypoint without an ESM boundary error",
    () => {
      expect(() =>
        execFileSync(
          process.execPath,
          ["-e", "require('firebase-admin/auth'); process.stdout.write('ok')"],
          { cwd: process.cwd(), timeout: 20_000, stdio: "pipe" },
        ),
      ).not.toThrow();
    },
    30_000,
  );

  it("uses the Vercel-compatible dependency line", () => {
    expect(installedVersion("firebase-admin")).toBe("13.9.0");
    expect(installedVersion("jwks-rsa")).toMatch(/^3\./);
    expect(installedVersion("jose")).toMatch(/^4\./);
  });
});
