"use client";

import { useState } from "react";

const STEPS = [
  { count: 5, prompt: "Notice five things you can see." },
  { count: 4, prompt: "Notice four things your body can feel." },
  { count: 3, prompt: "Notice three sounds around you." },
  { count: 2, prompt: "Notice two things you can smell." },
  { count: 1, prompt: "Notice one thing you can taste, or one slow breath." },
] as const;

export default function WellbeingGrounding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const current = STEPS[step];

  return (
    <div className="rounded-3xl border border-primary/15 bg-[#fff8ff] p-5 dark:border-primary/25 dark:bg-primary/[0.06]" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Ground yourself</p>
          <h3 className="mt-1 text-lg font-black text-text-primary dark:text-white">{complete ? "You made a little room to breathe" : "Come back to what is around you"}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close grounding exercise" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-white dark:hover:bg-card-dark"><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
      </div>

      {complete ? (
        <div className="mt-5 text-center">
          <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">self_improvement</span>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary">Notice whether anything shifted, even slightly. If it did not, that is okay—you can still talk privately or reach a counsellor.</p>
          <button type="button" onClick={onClose} className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-extrabold text-white">Done for now</button>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-soft dark:bg-card-dark">
            <span className="text-5xl font-black text-primary" aria-hidden="true">{current.count}</span>
            <p className="mx-auto mt-3 max-w-sm text-base font-bold leading-7 text-text-primary dark:text-white">{current.prompt}</p>
            <p className="mt-2 text-xs text-text-secondary">Take your time. Nothing is being recorded.</p>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? "w-7 bg-primary" : index < step ? "w-3 bg-primary/40" : "w-3 bg-border-light dark:bg-border-dark"}`} />)}
            </div>
            <button type="button" onClick={() => step === STEPS.length - 1 ? setComplete(true) : setStep((value) => value + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-primary px-4 text-sm font-extrabold text-white">
              {step === STEPS.length - 1 ? "Finish" : "Next"}<span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
