import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${manrope.variable} font-display bg-background-light dark:bg-background-dark text-text-primary dark:text-white min-h-screen`}
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
