"use client";

import { useState, useId } from "react";

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
}: ToggleProps) {
  const [isChecked, setIsChecked] = useState(checked);
  const toggleId = useId();
  const descriptionId = useId();

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col gap-1">
          {label && (
            <label
              htmlFor={toggleId}
              id={`${toggleId}-label`}
              className="text-text-primary dark:text-white text-base font-bold leading-tight cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={descriptionId}
              className="text-text-secondary text-base font-normal leading-normal"
            >
              {description}
            </p>
          )}
        </div>
      )}
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-labelledby={label ? `${toggleId}-label` : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
          ${isChecked ? "bg-primary justify-end" : "bg-border-light dark:bg-border-dark justify-start"}
        `}
      >
        <span className="sr-only">{isChecked ? "Enabled" : "Disabled"}</span>
        <div
          className="h-full w-[27px] rounded-full bg-white transition-all"
          style={{
            boxShadow:
              "rgba(0, 0, 0, 0.15) 0px 3px 8px, rgba(0, 0, 0, 0.06) 0px 3px 1px",
          }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
