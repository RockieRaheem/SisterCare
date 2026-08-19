import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require("../../../next.config.js") as {
  headers: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>>;
};

describe("browser security headers", () => {
  it("monitors a restrictive content policy before enforcement", async () => {
    const rules = await nextConfig.headers();
    const global = rules.find((rule) => rule.source === "/:path*");
    const policy = global?.headers.find((header) => header.key === "Content-Security-Policy-Report-Only")?.value || "";
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("default-src *");
  });

  it("prevents private support pages from being cached", async () => {
    const rules = await nextConfig.headers();
    for (const source of ["/chat/:path*", "/sessions/:path*", "/wellbeing/:path*", "/counsellors/:path*", "/report/:path*"]) {
      const route = rules.find((rule) => rule.source === source);
      expect(route?.headers).toContainEqual(expect.objectContaining({ key: "Cache-Control", value: expect.stringContaining("no-store") }));
    }
  });
});
