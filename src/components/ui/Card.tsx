import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  animate?: boolean;
  glow?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = false,
  padding = "md",
  animate = false,
  glow = false,
}: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`
        bg-white dark:bg-card-dark 
        rounded-2xl 
        border border-border-light dark:border-border-dark 
        shadow-sm
        transition-all duration-300 ease-out
        ${hover ? "card-hover cursor-pointer" : ""}
        ${animate ? "card-animate" : ""}
        ${glow ? "glow-primary" : ""}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
