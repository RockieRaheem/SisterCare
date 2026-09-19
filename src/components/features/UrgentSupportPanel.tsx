import { UGANDA_EMERGENCY_RESOURCES } from "@/lib/emergencyResources";

export default function UrgentSupportPanel({ compact = false }: { compact?: boolean }) {
  const resources = UGANDA_EMERGENCY_RESOURCES;
  const titleId = compact ? "urgent-support-title-compact" : "urgent-support-title-full";
  return (
    <section aria-labelledby={titleId} className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200">
          <span className="material-symbols-outlined" aria-hidden="true">emergency</span>
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">Human help in Uganda</p>
          <h2 id={titleId} className="mt-0.5 text-lg font-black">Need urgent support?</h2>
          <p className="mt-1 text-sm leading-6 text-rose-800 dark:text-rose-200">If anyone is in immediate danger, call emergency services now or go to the nearest emergency facility. Do not wait for a SisterCare chat, booking or reply.</p>
        </div>
      </div>

      <div className={`mt-4 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>
        <a href="tel:999" className="flex min-h-14 items-center gap-3 rounded-xl border border-rose-200 bg-white px-3 py-2.5 transition hover:border-rose-400 dark:border-rose-900 dark:bg-rose-950/40">
          <span className="material-symbols-outlined text-rose-700 dark:text-rose-300" aria-hidden="true">local_police</span>
          <span><span className="block text-sm font-black">Immediate danger</span><span className="block text-xs">Uganda emergency: {resources.police.number}</span></span>
        </a>
        <a href={`tel:${resources.butabika.tollFreeNumber.replace(/\s/g, "")}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-rose-200 bg-white px-3 py-2.5 transition hover:border-rose-400 dark:border-rose-900 dark:bg-rose-950/40">
          <span className="material-symbols-outlined text-rose-700 dark:text-rose-300" aria-hidden="true">psychiatry</span>
          <span><span className="block text-sm font-black">Mental-health crisis</span><span className="block text-xs">Butabika {resources.butabika.tollFreeNumber}</span></span>
        </a>
        <a href={`tel:${resources.sauti.number}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-rose-200 bg-white px-3 py-2.5 transition hover:border-rose-400 dark:border-rose-900 dark:bg-rose-950/40">
          <span className="material-symbols-outlined text-rose-700 dark:text-rose-300" aria-hidden="true">shield_person</span>
          <span><span className="block text-sm font-black">Child, family or violence support</span><span className="block text-xs">Sauti {resources.sauti.number} · free, 24/7</span></span>
        </a>
        {!compact && (
          <a href={`tel:${resources.ambulance.number}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-rose-200 bg-white px-3 py-2.5 transition hover:border-rose-400 dark:border-rose-900 dark:bg-rose-950/40">
            <span className="material-symbols-outlined text-rose-700 dark:text-rose-300" aria-hidden="true">ambulance</span>
            <span><span className="block text-sm font-black">Medical emergency</span><span className="block text-xs">Medical emergency line {resources.ambulance.number}</span></span>
          </a>
        )}
      </div>

      {!compact && (
        <div className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-xs leading-5 dark:bg-rose-950/30">
          Butabika direct line: <a className="font-bold underline" href={`tel:${resources.butabika.directNumber.replace(/\s/g, "")}`}>{resources.butabika.directNumber}</a>. Legal support: FIDA Uganda <a className="font-bold underline" href={`tel:${resources.fida.tollFreeNumber.replace(/\s/g, "")}`}>{resources.fida.tollFreeNumber}</a>.
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-rose-700 dark:text-rose-300">If a call does not connect, try another emergency number or go to the nearest emergency facility. Outside Uganda, use your local emergency number. SisterCare cannot dispatch or guarantee a response from these services.</p>
      {!compact && <p className="mt-2 text-xs leading-5 text-rose-700 dark:text-rose-300">
        Check official contacts: <a className="underline" href={resources.police.source}>Police</a>, <a className="underline" href="https://alerts.health.go.ug/add-alert">medical emergencies</a>, <a className="underline" href={resources.sauti.source}>Sauti 116</a>, <a className="underline" href={resources.butabika.source}>Butabika</a>.
      </p>}
    </section>
  );
}
