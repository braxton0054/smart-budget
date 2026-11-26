"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/shops", label: "Shops" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/billing", label: "Platform billing" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Superadmin" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-nt-cyan/10 text-nt-cyan"
                : "text-nt-muted hover:bg-nt-raised hover:text-nt-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
