"use client";

import { useState } from "react";

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

  const handleToggle = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col gap-1">
          {label && (
            <p className="text-text-primary dark:text-white text-base font-bold leading-tight">
              {label}
            </p>
          )}
          {description && (
            <p className="text-text-secondary text-base font-normal leading-normal">
              {description}
            </p>
          )}
        </div>
      )}
      <label
        className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all"
        style={{
          backgroundColor: isChecked ? "#8c30e8" : undefined,
          justifyContent: isChecked ? "flex-end" : "flex-start",
        }}
      >
        <div
          className={`
            relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 transition-all
            ${isChecked ? "bg-primary justify-end" : "bg-border-light dark:bg-border-dark justify-start"}
          `}
          onClick={handleToggle}
        >
          <div
            className="h-full w-[27px] rounded-full bg-white transition-all"
            style={{
              boxShadow:
                "rgba(0, 0, 0, 0.15) 0px 3px 8px, rgba(0, 0, 0, 0.06) 0px 3px 1px",
            }}
          />
        </div>
      </label>
    </div>
  );
}
