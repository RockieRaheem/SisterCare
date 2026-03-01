/**
 * Accessibility utilities for SisterCare
 * Provides screen reader announcements and other a11y helpers
 */

/**
 * Announce a message to screen readers via the live region
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive' for urgent messages
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  if (typeof window === "undefined") return;

  const liveRegion = document.getElementById("aria-live-region");
  if (liveRegion) {
    // Update aria-live attribute if assertive
    liveRegion.setAttribute("aria-live", priority);

    // Clear then set message (ensures it's announced even if same message)
    liveRegion.textContent = "";

    // Use setTimeout to ensure the DOM update is processed
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = "";
      liveRegion.setAttribute("aria-live", "polite");
    }, 3000);
  }
}

/**
 * Trap focus within an element (useful for modals)
 * @param container - The container element to trap focus within
 * @returns Cleanup function to remove event listener
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener("keydown", handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateAriaId(prefix: string = "aria"): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Format dates in a screen-reader friendly way
 */
export function formatDateForScreenReader(date: Date): string {
  return date.toLocaleDateString("en-UG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
