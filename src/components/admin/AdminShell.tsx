import OperationsShell, {
  type OperationsNavItem,
} from "@/components/operations/OperationsShell";

const links: readonly OperationsNavItem[] = [
  { href: "/admin", label: "Overview", description: "Network priorities", icon: "space_dashboard" },
  { href: "/admin/counsellors", label: "Care network", description: "KYC, shifts and capacity", icon: "verified_user" },
  { href: "/admin/articles", label: "Clinical review", description: "Publication queue", icon: "edit_note" },
  { href: "/admin/crisis", label: "Crisis monitor", description: "Time-to-human response", icon: "emergency" },
  { href: "/admin/incidents", label: "Incidents", description: "Acknowledge and resolve", icon: "assignment_late" },
  { href: "/admin/reports", label: "Member reports", description: "Safety, privacy and conduct", icon: "report" },
  { href: "/admin/operations", label: "Service health", description: "Reliability and outcomes", icon: "monitoring" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <OperationsShell mode="admin" navigation={links}>
      {children}
    </OperationsShell>
  );
}
