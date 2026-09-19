"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { helpHref } from "@/lib/helpNavigation";

export default function HelpLink({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return <Link href={helpHref(pathname || "/")} className={className}>{children}</Link>;
}
