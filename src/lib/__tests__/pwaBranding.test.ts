import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(join(root, "public", "manifest.json"), "utf8"),
) as {
  theme_color: string;
  icons: Array<{ src: string; sizes: string; purpose: string }>;
};
const serviceWorker = readFileSync(
  join(root, "public", "sw.js"),
  "utf8",
);

describe("pink PWA identity", () => {
  it("uses only versioned pink artwork in install metadata", () => {
    expect(manifest.theme_color).toBe("#ff00ff");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(5);
    for (const icon of manifest.icons) {
      expect(icon.src).toContain("sistercare-pink-v3");
      expect(existsSync(join(root, "public", icon.src))).toBe(true);
    }
  });

  it("provides separate regular and maskable phone icons", () => {
    expect(
      manifest.icons.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "any",
      ),
    ).toBe(true);
    expect(
      manifest.icons.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
      ),
    ).toBe(true);
  });

  it("forces a new service-worker cache without legacy icon references", () => {
    expect(serviceWorker).toContain('CACHE_VERSION = "v3-pink-brand"');
    expect(serviceWorker).toContain("sistercare-pink-v3-192x192.png");
    expect(serviceWorker).not.toContain('"/icons/icon-');
    expect(serviceWorker).not.toContain('"/icons/icon.svg"');
  });
});
