import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import BottomNav from "@/components/layout/BottomNav";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import WorkspaceBoundary from "@/components/auth/WorkspaceBoundary";
import SessionNotifier from "@/components/features/SessionNotifier";

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
  manifest: "/manifest.json",
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
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
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
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[PWA] Service Worker registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[PWA] Service Worker registration failed:', error);
                    });
                });
              }
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
