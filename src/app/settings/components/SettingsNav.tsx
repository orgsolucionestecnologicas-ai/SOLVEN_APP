"use client";

import type { LucideIcon } from "lucide-react";
import { CreditCard, Store, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type SettingsNavItem = {
  key: string;
  label: string;
  href: string;
  Icon: LucideIcon;
  hiddenForRoles?: string[];
};

const items: SettingsNavItem[] = [
  { key: "negocio", label: "Mi Negocio", href: "/settings?s=negocio", Icon: Store, hiddenForRoles: ["CASHIER", "READONLY", "SUPERVISOR"] },
  { key: "usuarios", label: "Usuarios", href: "/settings?s=usuarios", Icon: UserCog, hiddenForRoles: ["CASHIER", "INVENTORY", "READONLY", "SUPERVISOR"] },
  { key: "suscripcion", label: "Suscripción", href: "/settings?s=suscripcion", Icon: CreditCard },
];

export function SettingsNav() {
  const searchParams = useSearchParams();
  const active = searchParams.get("s") ?? "negocio";
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: { role?: string } }) => {
        if (body.data?.role) setRole(body.data.role);
      })
      .catch(() => {});
  }, []);

  const visibleItems = items.filter(
    (item) => !(item.hiddenForRoles && role && item.hiddenForRoles.includes(role))
  );

  return (
    <nav className="w-[220px] shrink-0 border-r border-slate-200 px-3 py-6">
      <h2 className="px-3 text-lg font-semibold text-slate-950">Ajustes</h2>
      <div className="mt-6 space-y-1">
        {visibleItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              className={
                isActive
                  ? "flex items-center gap-2.5 rounded-md border-l-2 border-violet-600 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
                  : "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
              }
              href={item.href}
              key={item.key}
            >
              <item.Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
