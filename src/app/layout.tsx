import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import BottomNav from "@/components/layout/BottomNav";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import WorkspaceBoundary from "@/components/auth/WorkspaceBoundary";
import SessionNotifier from "@/components/features/SessionNotifier";
import WellbeingReminder from "@/components/features/WellbeingReminder";
import InstallAppPrompt from "@/components/features/InstallAppPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#faf8fc",
};

export const metadata: Metadata = {
  title: "SisterCare - Private Support Without Judgment",
  description:
    "Ask sensitive questions privately, track menstrual and emotional wellbeing, and reach verified counsellor support without shame or judgment.",
  keywords: [
    "menstrual health",
    "women's health",
    "private support",
    "emotional support",
    "anonymous counselling",
    "mental wellbeing",
  ],
  manifest: "/manifest.json?v=pink-v3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SisterCare",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/icons/sistercare-pink-v3.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        url: "/icons/sistercare-pink-v3-favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/sistercare-pink-v3-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/sistercare-pink-v3-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/icons/sistercare-pink-v3-favicon.png",
    apple: [
      {
        url: "/icons/sistercare-pink-v3-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="">
      <head>
        {/* The icon font is shared by every App Router page from this root layout. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('sistercare-theme');
                  var isDark = false;
                  if (theme === 'dark') {
                    isDark = true;
                  } else if (theme === 'system' || !theme) {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
              
              // Register Service Worker for PWA
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js?v=private-runtime-v4', { updateViaCache: 'none' })
                    .then(function(registration) {
                      console.log('[PWA] Service Worker registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[PWA] Service Worker registration failed:', error);
                  });
                });
              }

              // Capture the one-time native install event before React hydrates.
              window.addEventListener('beforeinstallprompt', function(event) {
                event.preventDefault();
                window.__sisterCareInstallPrompt = event;
              });
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="font-display bg-background-light dark:bg-background-dark text-text-primary dark:text-white min-h-screen antialiased"
      >
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[200] -translate-y-20 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-primary-lg transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        {/* Live region for screen reader announcements */}
        <div
          id="aria-live-region"
          className="live-region"
          aria-live="polite"
          aria-atomic="true"
        />

        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <OfflineIndicator />
              <SessionNotifier />
              <WellbeingReminder />
              <InstallAppPrompt />
              <div className="flex flex-col min-h-screen">
                <main id="main-content" tabIndex={-1}>
                  <WorkspaceBoundary>{children}</WorkspaceBoundary>
                </main>
              </div>
              <BottomNav />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
