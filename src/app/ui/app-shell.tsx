import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  ChevronDown,
  CreditCard,
  Home,
  Layers,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import { LogoutButton } from "./logout-button";

type ActiveSection =
  | "cashMovements"
  | "customers"
  | "dashboard"
  | "debts"
  | "expenses"
  | "inventory"
  | "pos"
  | "products"
  | "reports"
  | "sales"
  | "settings";

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
};

type NavDisabledItem = {
  type: "disabled";
  label: string;
  Icon: LucideIcon;
};

type NavItem = NavLinkItem | NavDisabledItem;

const navItems: NavItem[] = [
  { type: "link",     href: "/",               label: "Inicio",        section: "dashboard",     Icon: Home },
  { type: "link",     href: "/sales",           label: "Ventas",        section: "sales",         Icon: ShoppingCart },
  { type: "link",     href: "/products",        label: "Productos",     section: "products",      Icon: Package },
  { type: "link",     href: "/products",        label: "Inventario",    section: "inventory",     Icon: Layers },
  { type: "link",     href: "/customers",       label: "Clientes",      section: "customers",     Icon: Users },
  { type: "link",     href: "/cash-movements",  label: "Caja",          section: "cashMovements", Icon: CreditCard },
  { type: "link",     href: "/reports",         label: "Reportes",      section: "reports",       Icon: BarChart2 },
  { type: "disabled",                           label: "Promociones",                             Icon: Tag },
  { type: "link",     href: "/settings",        label: "Configuración", section: "settings",      Icon: Settings },
  { type: "disabled",                           label: "Licencia",                                Icon: Shield },
];

export function AppShell({ activeSection, eyebrow, title, children }: AppShellProps) {
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
          {navItems.map((item) => {
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
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              T
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">Tienda Demo</p>
              <p className="truncate text-xs text-slate-400">Propietario</p>
            </div>
            <ChevronDown size={15} className="flex-shrink-0 text-slate-500" />
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-white">
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
    </div>
  );
}
