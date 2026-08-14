import { PULSE_OPTIONS } from "@/lib/wellbeingPresentation";
import type { WellbeingFeeling } from "@/lib/wellbeing";

export default function WellbeingPulsePicker({
  selected,
  busy = false,
  onSelect,
}: {
  selected: WellbeingFeeling | null;
  busy?: boolean;
  onSelect: (feeling: WellbeingFeeling) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Choose the feeling closest to today</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PULSE_OPTIONS.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              aria-label={`${option.label}: ${option.prompt}`}
              disabled={busy}
              onClick={() => onSelect(option.value)}
              className={`relative flex min-h-[82px] min-w-0 flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                active
                  ? "border-primary bg-primary/[0.08] text-primary shadow-primary-sm"
                  : "border-border-light bg-white text-text-primary hover:border-primary/35 hover:bg-primary/[0.03] dark:border-border-dark dark:bg-card-dark dark:text-white"
              } disabled:cursor-wait disabled:opacity-55`}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                  <span className="material-symbols-outlined text-[12px]">check</span>
                </span>
              )}
              <span className="text-[28px] leading-none" aria-hidden="true">{option.emoji}</span>
              <span className="mt-2 truncate text-xs font-extrabold sm:text-[13px]">{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
