import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  fullWidth?: boolean;
  icon?: string;
  /** Accessible label for screen readers (use when button only has an icon) */
  ariaLabel?: string;
  /** Whether the button controls an expanded/collapsed element */
  ariaExpanded?: boolean;
  /** ID of the element this button controls */
  ariaControls?: string;
  /** Enable premium animation effects */
  premium?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  fullWidth = false,
  icon,
  ariaLabel,
  ariaExpanded,
  ariaControls,
  premium = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "group inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors duration-200 ease-out btn-press disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]";

  const variantStyles = {
    primary:
      "bg-primary text-white shadow-primary-sm hover:bg-primary-dark",
    secondary:
      "bg-white dark:bg-card-dark border border-border-light dark:border-border-dark text-text-primary dark:text-white shadow-soft hover:border-primary/30 hover:bg-primary/5",
    outline:
      "border border-primary/35 bg-transparent text-primary hover:border-primary hover:bg-primary/5",
    ghost: "text-primary hover:bg-primary/10",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md",
  };

  const sizeStyles = {
    sm: "h-9 px-3.5 text-xs gap-1.5",
    md: "h-11 px-5 text-sm gap-2",
    lg: "h-14 px-6 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${premium ? "btn-premium" : ""} ${className}`}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      {...props}
    >
      {icon && (
        <span
          className="material-symbols-outlined transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
