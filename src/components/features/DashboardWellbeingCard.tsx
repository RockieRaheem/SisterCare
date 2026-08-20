"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { localWellbeingDate } from "@/lib/wellbeing";
import { getWellbeingCheckIns } from "@/lib/wellbeingClient";

export default function DashboardWellbeingCard() {
  const { user } = useAuth();
  const [todaySaved, setTodaySaved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getWellbeingCheckIns(user.uid)
      .then((entries) => {
        if (active) setTodaySaved(entries.some((entry) => entry.localDate === localWellbeingDate()));
      })
      .catch(() => {
        if (active) setTodaySaved(null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-white dark:bg-card-dark">
      <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-primary/[0.07]" aria-hidden="true" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
          <span className="material-symbols-outlined text-base" aria-hidden="true">lock</span>
          Private support
        </span>
        <h2 className="mt-3 max-w-xl text-2xl font-black leading-tight text-text-primary dark:text-white sm:text-3xl">
          You do not need the right words.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
          If something hurt, frightened, embarrassed, exhausted, or overwhelmed you, start wherever you can. Sister will listen without judgement and help you choose what happens next.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Link href="/chat" className="group flex min-h-16 items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-white shadow-primary-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <span className="material-symbols-outlined" aria-hidden="true">chat_bubble</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black">Talk about what happened</span>
              <span className="mt-0.5 block text-xs text-white/80">A private conversation, at your pace</span>
            </span>
            <span className="material-symbols-outlined ml-auto transition-transform group-hover:translate-x-0.5" aria-hidden="true">arrow_forward</span>
          </Link>
          <Link href="/counsellors" className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-border-light bg-background-light px-5 py-3 text-sm font-extrabold text-text-primary transition hover:border-primary/35 hover:bg-primary/[0.04] dark:border-border-dark dark:bg-background-dark dark:text-white">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">support_agent</span>
            Find a counsellor
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-3 dark:border-border-dark">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold leading-5 text-text-secondary">
            {todaySaved === true && <span className="material-symbols-outlined text-base text-emerald-600" aria-hidden="true">check_circle</span>}
            {todaySaved === true ? "Today's private check-in is saved." : "Not ready to talk? A private check-in takes one tap."}
          </p>
          <Link href="/wellbeing" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">
            {todaySaved === true ? "Review or change" : "Check in quietly"} <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}
