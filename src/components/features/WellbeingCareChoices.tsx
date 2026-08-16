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
      <p className="text-sm font-black text-text-primary dark:text-white">What would feel useful right now?</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <button type="button" onClick={() => setShowGrounding(true)} className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-border-light bg-background-light p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><span className="material-symbols-outlined" aria-hidden="true">self_improvement</span></span>
          <span><span className="block text-sm font-extrabold text-text-primary dark:text-white">Ground me</span><span className="mt-0.5 block text-xs leading-4 text-text-secondary">A quiet 5–4–3–2–1 reset</span></span>
        </button>
        <Link href="/chat" className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-border-light bg-background-light p-3 transition hover:border-primary/30 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span></span>
          <span><span className="block text-sm font-extrabold text-text-primary dark:text-white">Let it out</span><span className="mt-0.5 block text-xs leading-4 text-text-secondary">Talk privately with Sister</span></span>
        </Link>
        <Link href="/counsellors" className="group flex min-h-[82px] items-center gap-3 rounded-2xl border border-border-light bg-background-light p-3 transition hover:border-primary/30 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary"><span className="material-symbols-outlined" aria-hidden="true">support_agent</span></span>
          <span><span className="block text-sm font-extrabold text-text-primary dark:text-white">A real person</span><span className="mt-0.5 block text-xs leading-4 text-text-secondary">See verified counsellors</span></span>
        </Link>
      </div>
    </div>
  );
}
