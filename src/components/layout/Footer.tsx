import Link from "next/link";

interface FooterProps {
  variant?: "landing" | "app";
}

export default function Footer({ variant = "landing" }: FooterProps) {
  if (variant === "app") {
    return (
      <footer className="bg-white dark:bg-card-dark border-t border-border-light dark:border-border-dark py-8">
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
          </div>
        </div>
      </footer>
    );
  }

  // Landing page footer
  return (
    <footer className="px-6 lg:px-40 py-12 border-t border-border-light dark:border-border-dark bg-white dark:bg-background-dark">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-2xl">female</span>
            <h2 className="text-xl font-bold">SisterCare</h2>
          </div>
          <p className="text-text-secondary text-sm max-w-sm">
            Empowering women and girls through accessible education, emotional
            support, and personalized health tracking. You are never alone.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-4">Quick Links</h4>
          <ul className="flex flex-col gap-2 text-sm text-text-secondary">
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                About Us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Our Experts
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4">Stay Connected</h4>
          <div className="flex gap-4">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">share</span>
            </div>
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary cursor-pointer hover:bg-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined text-lg">mail</span>
            </div>
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
