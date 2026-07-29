"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  ["/counsellor", "Care desk", "support_agent"],
  ["/counsellor/articles", "Library contributions", "edit_note"],
  ["/counsellor/support", "Operations support", "contact_support"],
] as const;

export default function CounsellorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const leave = async () => { await signOut(); router.replace("/auth/login"); };

  return <div className="min-h-screen bg-[#f7f5fb] text-gray-900 dark:bg-bg-dark dark:text-white">
    <header className="sticky top-0 z-40 border-b border-violet-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-card-dark/95 lg:hidden">
      <div className="flex items-center justify-between gap-3"><Link href="/counsellor" className="flex items-center gap-2 font-extrabold text-primary"><span className="material-symbols-outlined">support_agent</span><span>Care workspace</span></Link><button onClick={leave} className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300">Sign out</button></div>
      <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">{links.map(([href, label]) => <Link key={href} href={href} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${pathname === href ? "bg-primary text-white" : "bg-primary/5 text-primary"}`}>{label}</Link>)}</nav>
    </header>
    <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-violet-100 bg-white px-4 py-6 dark:border-gray-800 dark:bg-card-dark lg:flex">
      <Link href="/counsellor" className="flex items-center gap-3 px-3 text-primary"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white"><span className="material-symbols-outlined">support_agent</span></span><span><span className="block text-lg font-extrabold text-gray-900 dark:text-white">SisterCare</span><span className="block text-xs font-semibold uppercase tracking-wider text-primary">Counsellor workspace</span></span></Link>
      <nav className="mt-10 space-y-1">{links.map(([href, label, icon]) => { const active = href === "/counsellor" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-primary text-white shadow-primary-sm" : "text-gray-600 hover:bg-primary/5 hover:text-primary dark:text-gray-300"}`}><span className="material-symbols-outlined text-lg">{icon}</span>{label}</Link>; })}</nav>
      <div className="mt-auto rounded-2xl bg-primary/5 p-4"><p className="text-xs font-semibold text-primary">Professional care space</p><p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">Session activity, availability, and every publication decision are securely recorded.</p></div>
      <button onClick={leave} className="mt-4 flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700 dark:text-gray-300"><span className="material-symbols-outlined text-lg">logout</span>Sign out</button>
    </aside>
    <main className="min-h-screen lg:ml-72"><div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10">{children}</div></main>
  </div>;
}
