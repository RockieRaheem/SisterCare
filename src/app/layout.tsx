import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import BottomNav from "@/components/layout/BottomNav";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f7f6f8",
};

export const metadata: Metadata = {
  title: "SisterCare - Women's Well-Being & Menstrual Health",
  description:
    "A Digital Support Platform for Women's Well-Being, Guidance, and Menstrual Health. Get menstrual reminders, guidance, and emotional support in a safe, private environment.",
  keywords: [
    "menstrual health",
    "women health",
    "period tracker",
    "emotional support",
    "wellness",
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
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
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
                  if (theme === 'dark') {
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
        className={`${manrope.variable} font-display bg-background-light dark:bg-background-dark text-text-primary dark:text-white min-h-screen antialiased`}
      >
        {/* Skip to main content link - Essential for keyboard/screen reader users */}
        <a href="#main-content" className="skip-link">
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
            <div className="flex flex-col min-h-screen">
              <main id="main-content" tabIndex={-1}>
                {children}
              </main>
            </div>
            <BottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
