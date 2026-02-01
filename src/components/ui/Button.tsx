import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  fullWidth?: boolean;
  icon?: string;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  fullWidth = false,
  icon,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "flex items-center justify-center font-bold rounded-xl transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-primary-sm",
    secondary:
      "bg-border-light dark:bg-border-dark text-text-primary dark:text-white hover:bg-opacity-80",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
    ghost: "text-primary hover:bg-primary/10",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-xs gap-1",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-14 px-6 text-base gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {children}
    </button>
  );
}
