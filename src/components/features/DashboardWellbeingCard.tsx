import Link from "next/link";
import Card from "@/components/ui/Card";
import WellbeingPulsePicker from "@/components/features/WellbeingPulsePicker";
import { wellbeingSupportMessage } from "@/lib/wellbeingPresentation";
import type { WellbeingFeeling } from "@/lib/wellbeing";
import type { WellbeingCheckIn } from "@/types";

export default function DashboardWellbeingCard({
  checkIn,
  busy,
  error,
  onSelect,
}: {
  checkIn: WellbeingCheckIn | null;
  busy: boolean;
  error: string | null;
  onSelect: (feeling: WellbeingFeeling) => void;
}) {
  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            <span className="material-symbols-outlined text-base" aria-hidden="true">favorite</span>
            A moment for you
          </span>
          <h2 className="mt-2 text-2xl font-black text-text-primary dark:text-white">How are you, really?</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-text-secondary">Choose what feels closest. That is enough for today.</p>
        </div>
        <Link href="/analytics" aria-label="See wellbeing patterns" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/[0.07] text-primary">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">insights</span>
        </Link>
      </div>

      <div className="mt-5 rounded-2xl bg-background-light p-2 dark:bg-background-dark">
        <WellbeingPulsePicker selected={checkIn?.feelings?.[0] || null} busy={busy} onSelect={onSelect} />
      </div>
      {checkIn ? (
        <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4">
          <p className="flex items-center gap-2 text-sm font-black text-text-primary dark:text-white"><span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">check_circle</span>Saved for today</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{wellbeingSupportMessage(checkIn).message}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/wellbeing" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">Add context <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></Link>
            <Link href="/chat" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary">Talk privately <span className="material-symbols-outlined text-lg" aria-hidden="true">chat_bubble</span></Link>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-text-secondary">One tap saves privately. You can change it later.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
    </Card>
  );
}
