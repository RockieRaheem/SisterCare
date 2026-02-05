import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label className="text-text-primary dark:text-white text-sm font-semibold leading-normal pb-2 px-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
              <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
          )}
          <input
            ref={ref}
            className={`
              form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl 
              text-text-primary dark:text-white 
              focus:outline-0 focus:ring-2 focus:ring-primary/20 
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
        {error && <p className="text-red-500 text-xs mt-1 px-1">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
