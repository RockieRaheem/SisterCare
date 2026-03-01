import { InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
  /** Additional description or hint text */
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className = "", id: propId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = propId || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="flex flex-col w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-text-primary dark:text-white text-sm font-semibold leading-normal pb-2 px-1"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {hint && (
          <p id={hintId} className="text-text-secondary text-xs mb-2 px-1">
            {hint}
          </p>
        )}
        <div className="relative">
          {icon && (
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              [error ? errorId : null, hint ? hintId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={`
              form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl 
              text-text-primary dark:text-white 
              focus:outline-0 focus:ring-2 focus:ring-primary/20 
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              border border-primary/10 
              bg-background-light dark:bg-background-dark 
              focus:border-primary 
              h-14 
              placeholder:text-text-secondary/50 
              ${icon ? "pl-12" : "p-4"} 
              text-base font-normal leading-normal transition-all
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            className="text-red-500 text-xs mt-1 px-1"
            role="alert"
          >
            <span className="sr-only">Error: </span>
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
