"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { formatARS } from "@/lib/format-currency";
import {
  BarChart2,
  ChevronDown,
  CreditCard,
  FileText,
  Home,
  Layers,
  Loader2,
  Package,
  RotateCcw,
  Search,
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
  | "quotes"
  | "reports"
  | "returns"
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
  { type: "link",     href: "/quotes",          label: "Cotizaciones",  section: "quotes",        Icon: FileText },
  { type: "link",     href: "/reports",         label: "Reportes",      section: "reports",       Icon: BarChart2 },
  { type: "link",     href: "/promotions",      label: "Promociones",   section: "promotions",    Icon: Tag },
  { type: "link",     href: "/settings",        label: "Configuración", section: "settings",      Icon: Settings,  hiddenForRoles: ["CASHIER", "READONLY"] },
  { type: "link",     href: "/usuarios",        label: "Usuarios",      section: "usuarios",      Icon: UserCog,   hiddenForRoles: ["CASHIER", "INVENTORY", "READONLY"] },
  { type: "link",     href: "/cuenta",           label: "Mi cuenta",     section: "cuenta",        Icon: User },
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

type SearchResults = {
  productos: { id: string; name: string; productCode: string | null; salePrice: string; stock: number }[];
  clientes: { id: string; name: string; phone: string | null }[];
  servicios: { id: string; name: string; price: string }[];
};

function SearchResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function SearchResultItem({
  href,
  name,
  subtext,
  onNavigate,
}: {
  href: string;
  name: string;
  subtext: string;
  onNavigate: () => void;
}) {
  return (
    <Link className="flex flex-col gap-0.5 px-3 py-2 hover:bg-violet-50" href={href} onClick={onNavigate}>
      <span className="truncate text-sm text-slate-900">{name}</span>
      <span className="truncate text-xs text-slate-500">{subtext}</span>
    </Link>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmedQuery.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((body: { data?: SearchResults }) => {
          if (body.data) setResults(body.data);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function close() {
    setIsOpen(false);
  }

  const hasResults = !!results && (results.productos.length > 0 || results.clientes.length > 0 || results.servicios.length > 0);
  const showDropdown = isOpen && trimmedQuery.length >= 2;

  return (
    <div className="relative px-2 pb-3 lg:px-1" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-8 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar…"
          type="text"
          value={query}
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500" size={14} />
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {!results ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Buscando…</p>
          ) : !hasResults ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">Sin resultados para &quot;{trimmedQuery}&quot;</p>
          ) : (
            <>
              {results.productos.length > 0 ? (
                <SearchResultSection title="Productos">
                  {results.productos.map((p) => (
                    <SearchResultItem
                      href="/products"
                      key={p.id}
                      name={p.name}
                      onNavigate={close}
                      subtext={`${p.productCode ? `${p.productCode} · ` : ""}${formatARS(Number(p.salePrice))} · stock ${p.stock}`}
                    />
                  ))}
                </SearchResultSection>
              ) : null}
              {results.clientes.length > 0 ? (
                <SearchResultSection title="Clientes">
                  {results.clientes.map((c) => (
                    <SearchResultItem
                      href="/customers"
                      key={c.id}
                      name={c.name}
                      onNavigate={close}
                      subtext={c.phone ?? "Sin teléfono"}
                    />
                  ))}
                </SearchResultSection>
              ) : null}
              {results.servicios.length > 0 ? (
                <SearchResultSection title="Servicios">
                  {results.servicios.map((s) => (
                    <SearchResultItem
                      href="/services"
                      key={s.id}
                      name={s.name}
                      onNavigate={close}
                      subtext={formatARS(Number(s.price))}
                    />
                  ))}
                </SearchResultSection>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
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

        {/* Global search */}
        <div className="mt-4">
          <GlobalSearch />
        </div>

        {/* Navigation */}
        <nav className="mt-1 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-0.5 lg:overflow-visible lg:pb-0">
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

    </div>
  );
}
