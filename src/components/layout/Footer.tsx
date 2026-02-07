import Link from "next/link";

interface FooterProps {
  variant?: "landing" | "app";
}

export default function Footer({ variant = "landing" }: FooterProps) {
  if (variant === "app") {
    return (
      <footer className="bg-white dark:bg-card-dark border-t border-border-light dark:border-border-dark py-8 pb-[calc(2rem+var(--bottom-nav-height,72px)+env(safe-area-inset-bottom))] lg:pb-8">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-primary/60">
            <span className="material-symbols-outlined">health_and_safety</span>
            <span className="text-sm font-medium">
              SisterCare © 2026. Your health data is encrypted.
            </span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-text-secondary">
            <Link
              href="/privacy"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link href="/help" className="hover:text-primary transition-colors">
              Help Center
            </Link>
            <a
              href="tel:116"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">call</span>
              Sauti 116
            </a>
          </div>
        </div>
      </footer>
    );
  }

  // Landing page footer
  return (
    <footer className="px-6 lg:px-40 py-12 pb-[calc(3rem+var(--bottom-nav-height,72px)+env(safe-area-inset-bottom))] lg:pb-12 border-t border-border-light dark:border-border-dark bg-white dark:bg-background-dark">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-2xl">favorite</span>
            <h2 className="text-xl font-bold">SisterCare</h2>
          </div>
          <p className="text-text-secondary text-sm max-w-sm">
            Empowering women and girls through accessible education, emotional
            support, and personalized health tracking. You are never alone.
          </p>
          {/* Uganda Emergency Support */}
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
            <p className="text-red-700 dark:text-red-300 font-bold text-sm mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                emergency
              </span>
              Need Urgent Help?
            </p>
            <div className="space-y-1 text-xs text-red-600 dark:text-red-400">
              <p>
                <strong>Sauti 116:</strong> Free 24/7 helpline for children &
                women
              </p>
              <p>
                <strong>Police:</strong> 999 or 112
              </p>
              <p>
                <strong>FIDA Uganda:</strong> 0414 530 848 (Legal support)
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4">Quick Links</h4>
          <ul className="flex flex-col gap-2 text-sm text-text-secondary">
            <li>
              <Link
                href="/about"
                className="hover:text-primary transition-colors"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                href="/library"
                className="hover:text-primary transition-colors"
              >
                Health Library
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="hover:text-primary transition-colors"
              >
                Terms of Service
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">Get Support</h4>
          <ul className="flex flex-col gap-2 text-sm text-text-secondary">
            <li>
              <Link
                href="/chat"
                className="hover:text-primary transition-colors"
              >
                Chat with Sister
              </Link>
            </li>
            <li>
              <Link
                href="/help"
                className="hover:text-primary transition-colors"
              >
                Help Center
              </Link>
            </li>
            <li>
              <a
                href="mailto:support@sistercare.app"
                className="hover:text-primary transition-colors"
              >
                Email Support
              </a>
            </li>
          </ul>
          <div className="flex gap-4 mt-4">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">share</span>
            </div>
            <a
              href="mailto:support@sistercare.app"
              className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">mail</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-12 pt-8 border-t border-primary/5 text-center text-xs text-text-secondary">
        © 2026 SisterCare. All rights reserved. Professional medical advice
        should always be sought from a qualified healthcare provider.
      </div>
    </footer>
  );
}
