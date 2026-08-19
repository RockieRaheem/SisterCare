import PublicPageShell from "@/components/layout/PublicPageShell";
import { BUTABIKA_CONTACT_TEXT, UGANDA_EMERGENCY_RESOURCES } from "@/lib/emergencyResources";

export default function PilotPausedPage() {
  return (
    <PublicPageShell eyebrow="Safety pause" title="SisterCare is temporarily unavailable." description="The pilot team has paused private workspaces while a safety or reliability check is completed. Your existing account information has not been removed.">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="surface p-6"><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">health_and_safety</span><h2 className="mt-3 text-xl font-bold text-text-primary dark:text-white">What to do now</h2><p className="mt-2 text-sm leading-7 text-text-secondary dark:text-gray-300">Please do not keep retrying a sensitive request. The pilot team will restore access only after the check is complete. For account questions, email <a href="mailto:support@sistercare.app" className="font-semibold text-primary hover:underline">support@sistercare.app</a>.</p></section>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100"><h2 className="font-bold">Need urgent help?</h2><p className="mt-2 text-sm leading-7">SisterCare is not an emergency service. In Uganda, call {UGANDA_EMERGENCY_RESOURCES.police.number} for immediate danger, {UGANDA_EMERGENCY_RESOURCES.sauti.number} for Sauti support, or {BUTABIKA_CONTACT_TEXT} for Butabika Hospital mental-health support.</p></section>
      </div>
    </PublicPageShell>
  );
}
