import OperationsShell, {
  type OperationsNavItem,
} from "@/components/operations/OperationsShell";

const links: readonly OperationsNavItem[] = [
  { href: "/doctor", label: "Clinical desk", description: "Bookings and consultations", icon: "medical_services" },
  { href: "/doctor/prescriptions", label: "Prescriptions", description: "Doctor-issued treatment records", icon: "prescriptions" },
];

export default function DoctorShell({ children }: { children: React.ReactNode }) {
  return (
    <OperationsShell mode="doctor" navigation={links}>
      {children}
    </OperationsShell>
  );
}
