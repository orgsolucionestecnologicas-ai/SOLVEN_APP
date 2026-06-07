"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { HelpChat } from "@/components/help/HelpChat";
import {
  BarChart2,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Home,
  Layers,
  Package,
  RotateCcw,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  User,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { LogoutButton } from "./logout-button";

type ActiveSection =
  | "cashMovements"
  | "cuenta"
  | "customers"
  | "dashboard"
  | "debts"
  | "expenses"
  | "inventory"
  | "pos"
  | "products"
  | "promotions"
  | "reports"
  | "returns"
  | "ayuda"
  | "sales"
  | "services"
  | "settings"
  | "usuarios";

type AppShellProps = {
  activeSection: ActiveSection;
  eyebrow?: string;
  title?: string;
  children: ReactNode;
};

type NavLinkItem = {
  type: "link";
  href: string;
  label: string;
  section: ActiveSection;
  Icon: LucideIcon;
  hiddenForRoles?: string[];
};

type NavDisabledItem = {
  type: "disabled";
  label: string;
  Icon: LucideIcon;
};

type NavItem = NavLinkItem | NavDisabledItem;

const navItems: NavItem[] = [
  { type: "link",     href: "/dashboard",      label: "Inicio",        section: "dashboard",     Icon: Home },
  { type: "link",     href: "/pos",             label: "Ventas",        section: "pos",           Icon: ShoppingCart },
  { type: "link",     href: "/returns",         label: "Devoluciones",  section: "returns",       Icon: RotateCcw },
  { type: "link",     href: "/products",        label: "Productos",     section: "products",      Icon: Package },
  { type: "link",     href: "/services",        label: "Servicios",     section: "services",      Icon: Wrench },
  { type: "link",     href: "/inventory",       label: "Inventario",    section: "inventory",     Icon: Layers },
  { type: "link",     href: "/customers",       label: "Clientes",      section: "customers",     Icon: Users },
  { type: "link",     href: "/cash-movements",  label: "Caja",          section: "cashMovements", Icon: CreditCard },
  { type: "link",     href: "/reports",         label: "Reportes",      section: "reports",       Icon: BarChart2 },
  { type: "link",     href: "/promotions",      label: "Promociones",   section: "promotions",    Icon: Tag },
  { type: "link",     href: "/settings",        label: "Configuración", section: "settings",      Icon: Settings,  hiddenForRoles: ["CASHIER", "READONLY"] },
  { type: "link",     href: "/usuarios",        label: "Usuarios",      section: "usuarios",      Icon: UserCog,   hiddenForRoles: ["CASHIER", "INVENTORY", "READONLY"] },
  { type: "link",     href: "/cuenta",           label: "Mi cuenta",     section: "cuenta",        Icon: User },
  { type: "link",     href: "/ayuda",            label: "Ayuda",         section: "ayuda",         Icon: HelpCircle },
  { type: "disabled",                           label: "Licencia",                                Icon: Shield },
];

type SubscriptionBannerData = {
  status: string;
  daysLeft: number | null;
} | null;

function SubscriptionBanner() {
  const [data, setData] = useState<SubscriptionBannerData>(null);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((body: { data?: { status: string; daysLeft: number | null } }) => {
        if (body.data) setData(body.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  if (data.status === "TRIAL" && data.daysLeft !== null && data.daysLeft <= 7) {
    return (
      <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-sm text-amber-800 border-b border-amber-200">
        <span>⏳ Tu prueba gratuita vence en <strong>{data.daysLeft} días</strong></span>
        <a
          className="ml-4 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
          href={process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#"}
          rel="noopener noreferrer"
          target="_blank"
        >
          Activar suscripción →
        </a>
      </div>
    );
  }

  if (data.status === "PAST_DUE") {
    return (
      <div className="flex items-center justify-between bg-rose-50 px-4 py-2 text-sm text-rose-800 border-b border-rose-200">
        <span>⚠️ Tu pago falló · Actualizá tu método de pago para continuar</span>
        <a
          className="ml-4 rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600"
          href={process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#"}
          rel="noopener noreferrer"
          target="_blank"
        >
          Actualizar →
        </a>
      </div>
    );
  }

  return null;
}

function SidebarUser() {
  const [businessName, setBusinessName] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((body: { data?: { name: string; businessName: string } }) => {
        if (body.data) {
          setBusinessName(body.data.businessName);
          setUserName(body.data.name);
        }
      })
      .catch(() => {});
  }, []);

  const initial = businessName ? businessName[0].toUpperCase() : "·";

  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {businessName || <span className="text-slate-500">—</span>}
        </p>
        <p className="truncate text-xs text-slate-400">
          {userName || <span className="text-slate-600">—</span>}
        </p>
      </div>
      <ChevronDown size={15} className="flex-shrink-0 text-slate-500" />
    </div>
  );
}

export function AppShell({ activeSection, eyebrow, title, children }: AppShellProps) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: { role?: string } }) => {
        if (body.data?.role) setRole(body.data.role);
      })
      .catch(() => {});
  }, []);

  const visibleNavItems = navItems.filter(
    (item) => !(item.type === "link" && item.hiddenForRoles && role && item.hiddenForRoles.includes(role))
  );

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="bg-slate-900 px-3 py-4 text-white lg:flex lg:min-h-screen lg:w-64 lg:shrink-0 lg:flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 lg:px-1">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
            S
          </div>
          <span className="text-base font-bold tracking-tight text-white">SOLVEN</span>
          <span className="rounded-full bg-violet-900 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
            2.0
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
          {visibleNavItems.map((item) => {
            if (item.type === "disabled") {
              return (
                <div
                  key={item.label}
                  className="flex min-w-max cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 lg:min-w-0"
                >
                  <item.Icon size={17} className="flex-shrink-0" />
                  <span className="hidden lg:block">{item.label}</span>
                </div>
              );
            }

            const isActive = item.section === activeSection;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  isActive
                    ? "flex min-w-max items-center gap-2.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white lg:min-w-0"
                    : "flex min-w-max items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white lg:min-w-0"
                }
              >
                <item.Icon size={17} className="flex-shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom — desktop only */}
        <div className="mt-auto hidden border-t border-slate-800 pt-3 lg:block">
          <SidebarUser />
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
        <SubscriptionBanner />
        {title ? (
          <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
            {eyebrow ? (
              <p className="text-sm font-medium text-slate-500">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
              {title}
            </h1>
          </div>
        ) : null}
        {children}
      </main>

      <HelpChat />
    </div>
  );
}
