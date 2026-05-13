"use client";

import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Eye,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Users,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { formatARS as formatMoney } from "@/lib/format-currency";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type DebtRecord = {
  id: string;
  customerId: string;
  customer: { name: string };
  totalAmount: string;
  remainingAmount: string;
  createdAt: string;
  updatedAt: string;
};

type DebtPaymentRecord = {
  id: string;
  debtId: string;
  amount: string;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

type Tab = "todas" | "pendientes" | "pagadas";

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500"
];

const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(v: string): string { return dateFmt.format(new Date(v)); }

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let s = 0;
  for (const ch of name) s += ch.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function DebtsList() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [payments, setPayments] = useState<DebtPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeTab, setActiveTab] = useState<Tab>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [detailDebt, setDetailDebt] = useState<DebtRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function load() {
      try {
        const [debtsRes, paymentsRes] = await Promise.all([
          fetch("/api/debts", { headers: { Accept: "application/json" } }),
          fetch("/api/debt-payments", { headers: { Accept: "application/json" } })
        ]);
        const [debtsBody, paymentsBody] = (await Promise.all([
          debtsRes.json(),
          paymentsRes.json()
        ])) as [ApiResponse<DebtRecord[]>, ApiResponse<DebtPaymentRecord[]>];

        if (!isActive) return;

        if (!debtsRes.ok || !debtsBody.data) {
          setLoadError("No se pudieron cargar las deudas.");
          setDebts([]);
          return;
        }

        setDebts(debtsBody.data);
        setPayments(paymentsBody.data ?? []);
        setLoadError(null);
      } catch {
        if (isActive) { setLoadError("No se pudieron cargar las deudas."); setDebts([]); }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void load();
    return () => { isActive = false; };
  }, [refreshKey]);

  // ── Metrics ────────────────────────────────────────────────────────────────

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + Number(d.remainingAmount), 0), [debts]);

  const activeDebtsCount = useMemo(() => debts.filter((d) => Number(d.remainingAmount) > 0).length, [debts]);

  const customersWithDebtCount = useMemo(() => {
    const ids = new Set(debts.filter((d) => Number(d.remainingAmount) > 0).map((d) => d.customerId));
    return ids.size;
  }, [debts]);

  const paymentsThisMonthCount = useMemo(() => {
    const now = new Date();
    return payments.filter((p) => {
      const d = new Date(p.paymentDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [payments]);

  const avgDebt = useMemo(() => (activeDebtsCount > 0 ? totalDebt / activeDebtsCount : 0), [totalDebt, activeDebtsCount]);

  // ── Sidebar data ───────────────────────────────────────────────────────────

  const topDebtors = useMemo(() => {
    const map: Record<string, { name: string; remaining: number }> = {};
    for (const d of debts) {
      const rem = Number(d.remainingAmount);
      if (rem > 0) {
        if (!map[d.customerId]) map[d.customerId] = { name: d.customer.name, remaining: 0 };
        map[d.customerId].remaining += rem;
      }
    }
    return Object.entries(map)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5);
  }, [debts]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5)
      .map((p) => {
        const debt = debts.find((d) => d.id === p.debtId);
        return { ...p, customerName: debt?.customer.name ?? "—" };
      });
  }, [payments, debts]);

  // ── Filter + sort + paginate ───────────────────────────────────────────────

  const filteredDebts = useMemo(() => {
    let result = [...debts];

    if (activeTab === "pendientes") result = result.filter((d) => Number(d.remainingAmount) > 0);
    if (activeTab === "pagadas") result = result.filter((d) => Number(d.remainingAmount) === 0);
    if (filterEstado === "pendiente") result = result.filter((d) => Number(d.remainingAmount) > 0);
    if (filterEstado === "pagada") result = result.filter((d) => Number(d.remainingAmount) === 0);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.customer.name.toLowerCase().includes(q));
    }

    if (sortOrder === "recent") result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortOrder === "amount") result.sort((a, b) => Number(b.remainingAmount) - Number(a.remainingAmount));
    else if (sortOrder === "name") result.sort((a, b) => a.customer.name.localeCompare(b.customer.name));

    return result;
  }, [debts, activeTab, filterEstado, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredDebts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDebts = filteredDebts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changePage(p: number) { setCurrentPage(Math.max(1, Math.min(p, totalPages))); }
  function clearFilters() { setSearchQuery(""); setFilterEstado(""); setSortOrder("recent"); setCurrentPage(1); }

  const hasFilters = Boolean(searchQuery || filterEstado || sortOrder !== "recent");

  function handlePaymentRegistered() {
    setSelectedDebt(null);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Pago registrado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "pendientes", label: "Pendientes" },
    { id: "pagadas", label: "Pagadas" }
  ];

  function openGlobalPayment() {
    const first = debts.find((d) => Number(d.remainingAmount) > 0);
    if (first) setSelectedDebt(first);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Deudas</h1>
          <p className="mt-0.5 text-sm text-slate-500">Controla las deudas y créditos de tus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50" type="button">
            <Plus size={14} />
            Nueva deuda
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            onClick={openGlobalPayment}
            type="button"
          >
            <DollarSign size={14} />
            Registrar pago
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50" type="button">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5 lg:grid-cols-4">
        <MetricCard Icon={AlertCircle} iconClass="bg-rose-100 text-rose-600" title="Total deuda" value={totalDebt} isMoney subtitle="Saldo pendiente total" subtitleClass="text-rose-600" />
        <MetricCard Icon={Clock} iconClass="bg-orange-100 text-orange-600" title="Deudas activas" value={activeDebtsCount} subtitle="Con saldo pendiente" subtitleClass="text-slate-500" />
        <MetricCard Icon={Users} iconClass="bg-blue-100 text-blue-600" title="Clientes con deuda" value={customersWithDebtCount} subtitle="Clientes únicos" subtitleClass="text-slate-500" />
        <MetricCard Icon={CheckCircle} iconClass="bg-emerald-100 text-emerald-600" title="Pagos este mes" value={paymentsThisMonthCount} subtitle="Pagos registrados" subtitleClass="text-emerald-600" />
      </div>

      {/* Body */}
      <div className="flex border-t border-slate-200">
        {/* Center */}
        <div className="min-w-0 flex-1 px-5 py-4">
          {/* Tabs */}
          <div className="mb-4 flex gap-0 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar por cliente..."
                type="text"
                value={searchQuery}
              />
            </div>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
              value={filterEstado}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => setSortOrder(e.target.value)}
              value={sortOrder}
            >
              <option value="recent">Más recientes</option>
              <option value="amount">Mayor deuda</option>
              <option value="name">Cliente A-Z</option>
            </select>
            {hasFilters ? (
              <button className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800" onClick={clearFilters} type="button">
                <RotateCcw size={12} />
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {isLoading ? <LoadingState /> : null}
          {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
          {!isLoading && !loadError && filteredDebts.length === 0 ? <EmptyState /> : null}
          {!isLoading && !loadError && filteredDebts.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Deuda total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo pendiente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedDebts.map((debt) => {
                      const isPaid = Number(debt.remainingAmount) === 0;
                      return (
                        <tr key={debt.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <CustomerAvatar name={debt.customer.name} />
                              <Link
                                className="max-w-[150px] truncate text-sm font-semibold text-slate-950 hover:text-violet-600 hover:underline"
                                href={`/customers/${debt.customerId}`}
                              >
                                {debt.customer.name}
                              </Link>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatMoney(Number(debt.totalAmount))}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <span className={`text-sm font-semibold ${isPaid ? "text-slate-400" : "text-rose-600"}`}>
                              {formatMoney(Number(debt.remainingAmount))}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {isPaid ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Pagada</span>
                            ) : (
                              <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">Pendiente</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{formatDate(debt.createdAt)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {!isPaid ? (
                                <button
                                  className="rounded-md p-1.5 text-slate-400 hover:bg-violet-100 hover:text-violet-700"
                                  onClick={() => setSelectedDebt(debt)}
                                  title="Registrar pago"
                                  type="button"
                                >
                                  <DollarSign size={13} />
                                </button>
                              ) : null}
                              <button
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                onClick={() => setDetailDebt(debt)}
                                title="Ver detalle"
                                type="button"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Mostrando {filteredDebts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredDebts.length)} de {filteredDebts.length} deudas
                </p>
                <div className="flex items-center gap-1">
                  <button className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={safePage === 1} onClick={() => changePage(safePage - 1)} type="button">
                    <ChevronLeft size={14} />
                  </button>
                  {getPageNumbers(safePage, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span className="px-2 text-sm text-slate-400" key={`ell-${i}`}>...</span>
                    ) : (
                      <button
                        className={p === safePage ? "h-7 min-w-[1.75rem] rounded-md bg-violet-600 px-2 text-xs font-semibold text-white" : "h-7 min-w-[1.75rem] rounded-md border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"}
                        key={p}
                        onClick={() => changePage(p as number)}
                        type="button"
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40" disabled={safePage === totalPages} onClick={() => changePage(safePage + 1)} type="button">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 border-l border-slate-200 px-4 py-5">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen de cartera</h3>
              <PortfolioSummary totalDebt={totalDebt} activeDebtsCount={activeDebtsCount} avgDebt={avgDebt} customersWithDebt={customersWithDebtCount} />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Top deudores</h3>
              <TopDebtors debtors={topDebtors} />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Actividad reciente</h3>
              <RecentPayments payments={recentPayments} />
            </div>
          </div>
        </aside>
      </div>

      {/* Quick actions */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Acciones rápidas</span>
          <QuickActionButton Icon={DollarSign} label="Registrar pago" onClick={openGlobalPayment} />
        </div>
      </div>

      {selectedDebt ? (
        <RegisterDebtPaymentModal
          debt={selectedDebt}
          onClose={() => setSelectedDebt(null)}
          onSuccess={handlePaymentRegistered}
        />
      ) : null}

      {detailDebt ? (
        <DebtDetailModal
          debt={detailDebt}
          payments={payments.filter((p) => p.debtId === detailDebt.id)}
          onClose={() => setDetailDebt(null)}
          onPay={() => { setDetailDebt(null); setSelectedDebt(detailDebt); }}
        />
      ) : null}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type MetricCardProps = {
  Icon: LucideIcon;
  iconClass: string;
  title: string;
  value: number;
  isMoney?: boolean;
  subtitle: string;
  subtitleClass: string;
};

function MetricCard({ Icon, iconClass, title, value, isMoney, subtitle, subtitleClass }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{isMoney ? formatMoney(value) : value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`mt-2 text-xs ${subtitleClass}`}>{subtitle}</p>
    </div>
  );
}

function CustomerAvatar({ name }: { name: string }) {
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${getAvatarColor(name)}`}>
      {getInitials(name)}
    </div>
  );
}

function PortfolioSummary({ totalDebt, activeDebtsCount, avgDebt, customersWithDebt }: {
  totalDebt: number; activeDebtsCount: number; avgDebt: number; customersWithDebt: number;
}) {
  return (
    <div className="space-y-2">
      {[
        { label: "Total en deuda", val: formatMoney(totalDebt), cls: "font-bold text-rose-600", bg: "bg-rose-50" },
        { label: "Deudas activas", val: String(activeDebtsCount), cls: "font-semibold text-slate-950", bg: "bg-slate-50" },
        { label: "Promedio por deuda", val: formatMoney(avgDebt), cls: "font-semibold text-slate-950", bg: "bg-slate-50" },
        { label: "Clientes con deuda", val: String(customersWithDebt), cls: "font-semibold text-slate-950", bg: "bg-slate-50" }
      ].map(({ label, val, cls, bg }) => (
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bg}`} key={label}>
          <span className="text-xs text-slate-600">{label}</span>
          <span className={`text-xs ${cls}`}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function TopDebtors({ debtors }: { debtors: { id: string; name: string; remaining: number }[] }) {
  if (debtors.length === 0) return <p className="text-xs text-slate-400">Sin deudas activas</p>;
  return (
    <div className="space-y-2">
      {debtors.map((d, i) => (
        <div className="flex items-center gap-2.5" key={d.id}>
          <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400">{i + 1}</span>
          <CustomerAvatar name={d.name} />
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-950">{d.name}</p>
          <span className="shrink-0 text-xs font-semibold text-rose-600">{formatMoney(d.remaining)}</span>
        </div>
      ))}
    </div>
  );
}

function RecentPayments({ payments }: { payments: Array<{ id: string; amount: string; paymentDate: string; customerName: string }> }) {
  if (payments.length === 0) return <p className="text-xs text-slate-400">Sin pagos registrados</p>;
  return (
    <div className="space-y-2.5">
      {payments.map((p) => (
        <div className="flex items-start justify-between gap-2" key={p.id}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-950">{p.customerName}</p>
            <p className="text-[10px] text-slate-400">{formatDate(p.paymentDate)}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-emerald-600">+{formatMoney(Number(p.amount))}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActionButton({ Icon, label, onClick }: { Icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" onClick={onClick} type="button">
      <Icon size={13} />
      {label}
    </button>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function RegisterDebtPaymentModal({ debt, onClose, onSuccess }: { debt: DebtRecord; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const remaining = Number(debt.remainingAmount);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) { setSubmitError("El monto debe ser mayor a cero."); return; }
    if (paymentAmount > remaining) { setSubmitError(`El pago no puede superar el saldo pendiente de ${formatMoney(remaining)}.`); return; }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/debt-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtId: debt.id, amount: paymentAmount })
      });
      const body = (await response.json()) as ApiResponse<{ id: string }>;
      if (!response.ok || !body.data) {
        setSubmitError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el pago.");
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Registrar pago</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <div className="border-b border-slate-100 px-6 py-4">
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-sm text-slate-500">Cliente</dt><dd className="text-sm font-medium text-slate-950">{debt.customer.name}</dd></div>
            <div className="flex justify-between"><dt className="text-sm text-slate-500">Monto total</dt><dd className="text-sm text-slate-700">{formatMoney(Number(debt.totalAmount))}</dd></div>
            <div className="flex justify-between"><dt className="text-sm text-slate-500">Saldo pendiente</dt><dd className="text-sm font-semibold text-amber-700">{formatMoney(remaining)}</dd></div>
          </dl>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="payment-amount">Monto a pagar</label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="payment-amount"
              max={remaining}
              min="0.01"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
            <p className="mt-1 text-xs text-slate-500">Máximo: {formatMoney(remaining)}</p>
          </div>
          {submitError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3"><p className="text-sm font-medium text-rose-900">{submitError}</p></div> : null}
          <div className="flex justify-end gap-3 pt-2">
            <button className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DebtDetailModal({ debt, payments, onClose, onPay }: {
  debt: DebtRecord;
  payments: DebtPaymentRecord[];
  onClose: () => void;
  onPay: () => void;
}) {
  const isPaid = Number(debt.remainingAmount) === 0;
  const paidAmount = Number(debt.totalAmount) - Number(debt.remainingAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar name={debt.customer.name} />
            <div>
              <h2 className="text-sm font-semibold text-slate-950">{debt.customer.name}</h2>
              <span className={`text-xs ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>
                {isPaid ? "Deuda pagada" : "Saldo pendiente"}
              </span>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Deuda total</p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">{formatMoney(Number(debt.totalAmount))}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Pendiente</p>
            <p className={`mt-0.5 text-sm font-bold ${isPaid ? "text-slate-400" : "text-rose-600"}`}>{formatMoney(Number(debt.remainingAmount))}</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Pagado</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-600">{formatMoney(paidAmount)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Historial de pagos ({payments.length})
          </h3>
          {payments.length === 0 ? (
            <p className="text-xs text-slate-400">Sin pagos registrados</p>
          ) : (
            <div className="space-y-1.5">
              {payments.map((p) => (
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2" key={p.id}>
                  <p className="text-xs text-slate-500">{formatDate(p.paymentDate)}</p>
                  <span className="text-xs font-semibold text-emerald-600">+{formatMoney(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">Cerrar</button>
          {!isPaid ? (
            <button className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700" onClick={onPay} type="button">Registrar pago</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Loading / Error / Empty ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="h-14 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0" key={i} />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5"><p className="text-sm font-medium text-rose-900">{message}</p></div>;
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <Users className="mx-auto mb-3 text-slate-300" size={32} />
      <p className="text-sm font-semibold text-slate-950">No hay deudas que coincidan</p>
      <p className="mt-1 text-sm text-slate-500">Intenta ajustar los filtros o la búsqueda.</p>
    </div>
  );
}
