import { describe, expect, it } from "vitest";
import {
  getManualInstallKind,
  isRunningAsInstalledApp,
} from "@/lib/pwaInstall";

describe("PWA installation state", () => {
  it("recognizes browser and operating-system standalone signals", () => {
    expect(
      isRunningAsInstalledApp({ displayModeStandalone: true }),
    ).toBe(true);
    expect(
      isRunningAsInstalledApp({
        displayModeStandalone: false,
        navigatorStandalone: true,
      }),
    ).toBe(true);
    expect(
      isRunningAsInstalledApp({
        displayModeStandalone: false,
        referrer: "android-app://com.sistercare",
      }),
    ).toBe(true);
  });

  it("does not treat a normal browser tab as installed", () => {
    expect(
      isRunningAsInstalledApp({
        displayModeStandalone: false,
        navigatorStandalone: false,
        referrer: "https://sister-care.vercel.app/",
      }),
    ).toBe(false);
  });
});

describe("manual PWA installation guidance", () => {
  it("provides Apple mobile instructions outside standalone mode", () => {
    expect(
      getManualInstallKind(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        false,
      ),
    ).toBe("ios");
  });

  it("provides Add to Dock instructions for desktop Safari", () => {
    expect(
      getManualInstallKind(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15",
        false,
      ),
    ).toBe("mac-safari");
  });

  it("does not replace Chromium's native install prompt with instructions", () => {
    expect(
      getManualInstallKind(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        false,
      ),
    ).toBeNull();
  });

  it("never offers instructions inside an installed app", () => {
    expect(
      getManualInstallKind(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
        true,
      ),
    ).toBeNull();
  });
});

