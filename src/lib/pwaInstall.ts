export type ManualInstallKind = "ios" | "mac-safari" | null;

interface StandaloneSignals {
  displayModeStandalone: boolean;
  navigatorStandalone?: boolean;
  referrer?: string;
}

export function isRunningAsInstalledApp({
  displayModeStandalone,
  navigatorStandalone = false,
  referrer = "",
}: StandaloneSignals): boolean {
  return (
    displayModeStandalone ||
    navigatorStandalone ||
    referrer.startsWith("android-app://")
  );
}

export function getManualInstallKind(
  userAgent: string,
  installed: boolean,
): ManualInstallKind {
  if (installed) return null;

  const isAppleMobile = /iPad|iPhone|iPod/i.test(userAgent);
  if (isAppleMobile) return "ios";

  const isMac = /Macintosh/i.test(userAgent);
  const isSafari =
    /Safari/i.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(userAgent);

  return isMac && isSafari ? "mac-safari" : null;
}

