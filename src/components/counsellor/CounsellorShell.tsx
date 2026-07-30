import OperationsShell, {
  type OperationsNavItem,
} from "@/components/operations/OperationsShell";

const links: readonly OperationsNavItem[] = [
  { href: "/counsellor", label: "Care desk", description: "Requests and live sessions", icon: "support_agent" },
  { href: "/counsellor/articles", label: "Knowledge studio", description: "Draft clinical articles", icon: "edit_note" },
  { href: "/counsellor/support", label: "Operations support", description: "Account and service help", icon: "contact_support" },
];

export default function CounsellorShell({ children }: { children: React.ReactNode }) {
  return (
    <OperationsShell mode="counsellor" navigation={links}>
      {children}
    </OperationsShell>
  );
}
