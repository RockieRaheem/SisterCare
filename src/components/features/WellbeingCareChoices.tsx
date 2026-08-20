"use client";

import Link from "next/link";
import { useState } from "react";
import WellbeingGrounding from "@/components/features/WellbeingGrounding";

export default function WellbeingCareChoices() {
  const [showGrounding, setShowGrounding] = useState(false);

  if (showGrounding) {
    return <WellbeingGrounding onClose={() => setShowGrounding(false)} />;
  }

  return (
    <div>
      <p className="text-sm font-black text-text-primary dark:text-white">Choose what feels useful. You can change your mind.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link href="/chat" className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-primary bg-primary p-3 text-white shadow-primary-sm transition hover:bg-primary-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span></span>
          <span><span className="block text-sm font-extrabold">Let it out</span><span className="mt-0.5 block text-xs leading-4 text-white/80">Talk privately, without judgement</span></span>
        </Link>
        <button type="button" onClick={() => setShowGrounding(true)} className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-border-light bg-background-light p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><span className="material-symbols-outlined" aria-hidden="true">self_improvement</span></span>
          <span><span className="block text-sm font-extrabold text-text-primary dark:text-white">Steady this moment</span><span className="mt-0.5 block text-xs leading-4 text-text-secondary">A private grounding exercise</span></span>
        </button>
        <Link href="/counsellors" className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-border-light bg-background-light p-3 transition hover:border-primary/30 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><span className="material-symbols-outlined" aria-hidden="true">support_agent</span></span>
          <span><span className="block text-sm font-extrabold text-text-primary dark:text-white">Talk to a person</span><span className="mt-0.5 block text-xs leading-4 text-text-secondary">Choose a verified counsellor</span></span>
        </Link>
        <Link href="/help" className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 transition hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/25">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200"><span className="material-symbols-outlined" aria-hidden="true">emergency_home</span></span>
          <span><span className="block text-sm font-extrabold text-rose-900 dark:text-rose-100">I may not be safe</span><span className="mt-0.5 block text-xs leading-4 text-rose-800 dark:text-rose-200">See immediate support options</span></span>
        </Link>
      </div>
    </div>
  );
}
