"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getManualInstallKind,
  isRunningAsInstalledApp,
  type ManualInstallKind,
} from "@/lib/pwaInstall";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface Window {
    __sisterCareInstallPrompt?: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = "sistercare-install-dismissed";

const HIDDEN_PATH_PREFIXES = ["/chat", "/sessions/", "/onboarding"];

function wasDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setDismissedThisSession(value: boolean) {
  try {
    if (value) {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } else {
      sessionStorage.removeItem(DISMISSED_KEY);
    }
  } catch {
    // Installation must still work when browser storage is unavailable.
  }
}

function hasMemberBottomNavigation(pathname: string): boolean {
  const pathsWithoutMemberNavigation = [
    "/",
    "/about",
    "/help",
    "/privacy",
    "/terms",
    "/onboarding",
  ];

  return (
    !pathsWithoutMemberNavigation.includes(pathname) &&
    !pathname.startsWith("/auth/") &&
    !pathname.startsWith("/admin") &&
    pathname !== "/counsellor" &&
    !pathname.startsWith("/counsellor/")
  );
}

function instructionContent(kind: ManualInstallKind) {
  if (kind === "mac-safari") {
    return {
      title: "Install SisterCare on your Mac",
      description:
        "Safari installs SisterCare from its menu and keeps it in your Dock like an app.",
      steps: [
        { icon: "web_asset", text: "Keep this page open in Safari." },
        { icon: "menu", text: "Choose File, then Add to Dock." },
        { icon: "add_to_home_screen", text: "Confirm by selecting Add." },
      ],
    };
  }

  if (kind === "ios") {
    return {
      title: "Add SisterCare to your device",
      description:
        "Apple devices install SisterCare from the browser sharing menu.",
      steps: [
        { icon: "ios_share", text: "Tap the Share button in your browser." },
        {
          icon: "add_box",
          text: "Choose Add to Home Screen or Add to Dock.",
        },
        { icon: "add", text: "Tap Add to finish installing." },
      ],
    };
  }

  return {
    title: "Add SisterCare to your device",
    description:
      "Your browser can install SisterCare from its main menu.",
    steps: [
      { icon: "more_vert", text: "Open your browser's main menu." },
      {
        icon: "install_mobile",
        text: "Choose Install app or Add to Home Screen.",
      },
      { icon: "add", text: "Confirm the installation." },
    ],
  };
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [manualKind, setManualKind] = useState<ManualInstallKind>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & { standalone?: boolean };

    const readInstalledState = () =>
      isRunningAsInstalledApp({
        displayModeStandalone: displayMode.matches,
        navigatorStandalone: nav.standalone,
        referrer: document.referrer,
      });

    const initialInstalledState = readInstalledState();
    setInstalled(initialInstalledState);
    setManualKind(
      getManualInstallKind(navigator.userAgent, initialInstalledState),
    );
    setDismissed(wasDismissedThisSession());
    if (window.__sisterCareInstallPrompt) {
      setDeferredPrompt(window.__sisterCareInstallPrompt);
    }
    setReady(true);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installPrompt = event as BeforeInstallPromptEvent;
      window.__sisterCareInstallPrompt = installPrompt;
      setDeferredPrompt(installPrompt);
      setDismissed(wasDismissedThisSession());
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      delete window.__sisterCareInstallPrompt;
      setInstructionsOpen(false);
      setDismissedThisSession(false);
      setStatus("SisterCare was installed successfully.");
    };

    const onDisplayModeChange = () => {
      const nowInstalled = readInstalledState();
      setInstalled(nowInstalled);
      if (nowInstalled) {
        setDeferredPrompt(null);
        delete window.__sisterCareInstallPrompt;
        setInstructionsOpen(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  useEffect(() => {
    if (!instructionsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInstructionsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    dialogCloseRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [instructionsOpen]);

  const hiddenForFocusedExperience = HIDDEN_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const canOfferInstall =
    ready &&
    !installed &&
    !dismissed &&
    Boolean(deferredPrompt || manualKind) &&
    !hiddenForFocusedExperience;

  const positionClass = hasMemberBottomNavigation(pathname)
    ? "bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] md:bottom-6"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]";

  const content = useMemo(
    () => instructionContent(manualKind),
    [manualKind],
  );

  const dismiss = () => {
    setDismissedThisSession(true);
    setDismissed(true);
    setInstructionsOpen(false);
    setStatus("Install suggestion dismissed for this browser session.");
  };

  const install = async () => {
    if (!deferredPrompt) {
      setInstructionsOpen(true);
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      delete window.__sisterCareInstallPrompt;

      if (choice.outcome === "accepted") {
        setStatus("Installing SisterCare.");
      } else {
        setDismissedThisSession(true);
        setDismissed(true);
        setStatus("Installation was cancelled.");
      }
    } catch {
      setStatus(
        "Your browser could not open the installer. Use its menu and choose Install app.",
      );
      setInstructionsOpen(true);
    } finally {
      setBusy(false);
    }
  };

  if (!canOfferInstall) {
    return (
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    );
  }

  return (
    <>
      <aside
        aria-label="Install SisterCare"
        className={`fixed left-3 right-3 z-[70] mx-auto max-w-[390px] rounded-2xl border border-primary/15 bg-white/95 p-3.5 shadow-[0_18px_50px_rgba(39,34,42,0.18)] backdrop-blur-xl dark:border-primary/25 dark:bg-card-dark/95 sm:left-auto sm:right-5 ${positionClass}`}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/icons/sistercare-pink-v3-192x192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-xl shadow-primary-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-text-primary dark:text-white">
              Keep SisterCare close
            </p>
            <p className="mt-0.5 text-xs leading-4 text-text-secondary dark:text-gray-400">
              Install for faster, full-screen access.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install suggestion"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-secondary transition hover:bg-black/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10 dark:hover:text-white"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={install}
          disabled={busy}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-primary-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-xl" aria-hidden="true">
            {busy ? "progress_activity" : "install_mobile"}
          </span>
          {busy ? "Opening installer…" : "Install SisterCare"}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {status}
        </span>
      </aside>

      {instructionsOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setInstructionsOpen(false)}
            aria-label="Close installation instructions"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            aria-describedby="install-app-description"
            className="relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl dark:bg-card-dark sm:rounded-3xl sm:p-7"
          >
            <button
              ref={dialogCloseRef}
              type="button"
              onClick={() => setInstructionsOpen(false)}
              aria-label="Close installation instructions"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition hover:bg-black/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-white/10 dark:hover:text-white"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>

            <Image
              src="/icons/sistercare-pink-v3-192x192.png"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl shadow-primary-sm"
            />
            <h2
              id="install-app-title"
              className="mt-5 pr-10 text-2xl font-extrabold text-text-primary dark:text-white"
            >
              {content.title}
            </h2>
            <p
              id="install-app-description"
              className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-400"
            >
              {content.description}
            </p>

            <ol className="mt-6 space-y-3">
              {content.steps.map((step, index) => (
                <li
                  key={step.text}
                  className="flex items-center gap-3 rounded-2xl bg-background-light p-3 dark:bg-background-dark"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span
                      className="material-symbols-outlined text-xl"
                      aria-hidden="true"
                    >
                      {step.icon}
                    </span>
                  </span>
                  <p className="text-sm font-semibold text-text-primary dark:text-white">
                    <span className="mr-1 text-primary">{index + 1}.</span>
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => setInstructionsOpen(false)}
              className="mt-6 h-12 w-full rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-primary-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </section>
        </div>
      )}
    </>
  );
}
