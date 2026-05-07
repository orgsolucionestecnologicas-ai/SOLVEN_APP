"use client";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Minus,
  Plus,
  Search,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type CashMovementRecord = {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  source: string;
  referenceId: string | null;
  movementDate: string;
  createdAt: string;
  updatedAt: string;
};

type Tab = "all" | "in" | "out";
type DateFilter = "today" | "week" | "month" | "all";
type SourceFilter = "all" | "SALE" | "EXPENSE" | "DEBT_PAYMENT" | "MANUAL";
type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const SOURCE_LABELS: Record<string, string> = {
  SALE: "Venta en efectivo",
  EXPENSE: "Gasto registrado",
  DEBT_PAYMENT: "Pago de deuda",
  MANUAL: "Movimiento manual",
};

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "SALE", label: "Venta" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "DEBT_PAYMENT", label: "Pago de deuda" },
  { value: "MANUAL", label: "Manual" },
];

const moneyFormatter = new Intl.NumberFormat("es-419", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatMoney(value: number | string): string {
  return `$${moneyFormatter.format(Number(value))}`;
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function formatShortMoney(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function getLast7Days(): { date: Date; dayAbbr: string; dayNum: string }[] {
  const abbrevs = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    result.push({ date: d, dayAbbr: abbrevs[d.getDay()], dayNum: String(d.getDate()) });
  }
  return result;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CashMovementsList() {
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [detailMovement, setDetailMovement] = useState<CashMovementRecord | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function load() {
      try {
        const res = await fetch("/api/cash-movements", {
          headers: { Accept: "application/json" },
        });
        const body = (await res.json()) as ApiResponse<CashMovementRecord[]>;
        if (!isActive) return;
        if (!res.ok || !body.data) {
          setLoadError("No se pudieron cargar los movimientos de caja.");
          setMovements([]);
          return;
        }
        setMovements(body.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudieron cargar los movimientos de caja.");
          setMovements([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void load();
    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const metrics = useMemo(() => {
    const now = new Date();
    const todayMovements = movements.filter((m) =>
      isSameLocalDay(new Date(m.movementDate), now)
    );
    const totalIn = movements
      .filter((m) => m.type === "IN")
      .reduce((s, m) => s + Number(m.amount), 0);
    const totalOut = movements
      .filter((m) => m.type === "OUT")
      .reduce((s, m) => s + Number(m.amount), 0);
    const todayIn = todayMovements
      .filter((m) => m.type === "IN")
      .reduce((s, m) => s + Number(m.amount), 0);
    const todayOut = todayMovements
      .filter((m) => m.type === "OUT")
      .reduce((s, m) => s + Number(m.amount), 0);
    return {
      balance: totalIn - totalOut,
      totalIn,
      totalOut,
      todayIn,
      todayOut,
      todayCount: todayMovements.length,
    };
  }, [movements]);

  const filteredMovements = useMemo(() => {
    let result = movements;

    if (activeTab === "in") result = result.filter((m) => m.type === "IN");
    if (activeTab === "out") result = result.filter((m) => m.type === "OUT");

    if (dateFilter !== "all") {
      const now = new Date();
      if (dateFilter === "today") {
        result = result.filter((m) => isSameLocalDay(new Date(m.movementDate), now));
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter((m) => new Date(m.movementDate) >= weekAgo);
      } else if (dateFilter === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter((m) => new Date(m.movementDate) >= monthStart);
      }
    }

    if (sourceFilter !== "all") {
      result = result.filter((m) => m.source === sourceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          getSourceLabel(m.source).toLowerCase().includes(q) ||
          (m.referenceId ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [movements, activeTab, dateFilter, sourceFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / 10));
  const safePage = Math.min(currentPage, totalPages);
  const pagedMovements = filteredMovements.slice((safePage - 1) * 10, safePage * 10);

  function changePage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  function clearFilters() {
    setSearchQuery("");
    setDateFilter("all");
    setSourceFilter("all");
    setActiveTab("all");
    setCurrentPage(1);
  }

  function handleMovementCreated() {
    setShowCreateModal(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Movimiento registrado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 || dateFilter !== "all" || sourceFilter !== "all";
  const hasAnyFilter = hasActiveFilters || activeTab !== "all";

  const tabCounts = {
    all: movements.length,
    in: movements.filter((m) => m.type === "IN").length,
    out: movements.filter((m) => m.type === "OUT").length,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Caja</h1>
            <p className="mt-1 text-sm text-slate-500">
              Control de entradas y salidas de dinero
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              onClick={() => setShowCreateModal(true)}
              type="button"
            >
              <Plus size={15} />
              Nueva entrada
            </button>
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              href="/expenses"
            >
              <Minus size={15} />
              Nuevo gasto
            </Link>
            <div className="relative">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setShowMoreActions((v) => !v)}
                type="button"
              >
                Más acciones
                <ChevronDown size={14} />
              </button>
              {showMoreActions ? (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMoreActions(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      type="button"
                    >
                      Exportar CSV
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      type="button"
                    >
                      Imprimir reporte
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {successMessage ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
          </div>
        ) : null}
      </div>

      {/* Metric cards */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              Icon={Wallet}
              iconBgClass="bg-violet-50"
              iconColorClass="text-violet-600"
              title="Saldo actual"
              value={formatMoney(metrics.balance)}
              valueColorClass={metrics.balance >= 0 ? "text-emerald-700" : "text-rose-700"}
            />
            <MetricCard
              Icon={ArrowDownLeft}
              iconBgClass="bg-emerald-50"
              iconColorClass="text-emerald-600"
              title="Entradas del día"
              value={formatMoney(metrics.todayIn)}
              valueColorClass="text-emerald-700"
            />
            <MetricCard
              Icon={ArrowUpRight}
              iconBgClass="bg-rose-50"
              iconColorClass="text-rose-600"
              title="Salidas del día"
              value={formatMoney(metrics.todayOut)}
              valueColorClass="text-rose-700"
            />
            <MetricCard
              Icon={Activity}
              iconBgClass="bg-blue-50"
              iconColorClass="text-blue-600"
              title="Movimientos hoy"
              value={String(metrics.todayCount)}
              valueColorClass="text-slate-900"
            />
          </div>
        )}
      </div>

      {/* Two-column area */}
      <div className="flex min-h-0 flex-1">
        {/* Left: filters + table */}
        <div className="flex min-w-0 flex-1 flex-col px-5 py-5 sm:px-8">
          {/* Tabs */}
          <div className="mb-4 flex border-b border-slate-200">
            {(
              [
                { value: "all", label: "Todos" },
                { value: "in", label: "Entradas" },
                { value: "out", label: "Salidas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                className={
                  activeTab === tab.value
                    ? "flex items-center gap-1.5 border-b-2 border-violet-600 px-4 py-2.5 text-sm font-semibold text-violet-700"
                    : "flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800"
                }
                onClick={() => {
                  setActiveTab(tab.value);
                  setCurrentPage(1);
                }}
                type="button"
              >
                {tab.label}
                <span
                  className={
                    activeTab === tab.value
                      ? "rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-700"
                      : "rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500"
                  }
                >
                  {tabCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Search and filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar movimiento..."
                type="text"
                value={searchQuery}
              />
            </div>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => {
                setDateFilter(e.target.value as DateFilter);
                setCurrentPage(1);
              }}
              value={dateFilter}
            >
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="all">Todo</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => {
                setSourceFilter(e.target.value as SourceFilter);
                setCurrentPage(1);
              }}
              value={sourceFilter}
            >
              {SOURCE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {hasActiveFilters ? (
              <button
                className="text-sm text-violet-600 hover:text-violet-800"
                onClick={clearFilters}
                type="button"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {/* Content */}
          {isLoading ? (
            <LoadingState />
          ) : loadError ? (
            <ErrorState message={loadError} />
          ) : filteredMovements.length === 0 ? (
            <EmptyState hasFilters={hasAnyFilter} onClear={clearFilters} />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Descripción
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Referencia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Fecha y hora
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pagedMovements.map((movement) => (
                      <MovementRow
                        key={movement.id}
                        movement={movement}
                        onDetail={() => setDetailMovement(movement)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Mostrando {(safePage - 1) * 10 + 1}–
                    {Math.min(safePage * 10, filteredMovements.length)} de{" "}
                    {filteredMovements.length} movimientos
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      disabled={safePage === 1}
                      onClick={() => changePage(safePage - 1)}
                      type="button"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {getPageNumbers(safePage, totalPages).map((p, i) =>
                      p === "..." ? (
                        <span className="px-2 text-sm text-slate-400" key={`ellipsis-${i}`}>
                          ...
                        </span>
                      ) : (
                        <button
                          className={
                            p === safePage
                              ? "h-7 min-w-[1.75rem] rounded-md bg-violet-600 px-2 text-xs font-semibold text-white"
                              : "h-7 min-w-[1.75rem] rounded-md border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"
                          }
                          key={p}
                          onClick={() => changePage(p)}
                          type="button"
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                      disabled={safePage === totalPages}
                      onClick={() => changePage(safePage + 1)}
                      type="button"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="w-80 shrink-0 border-l border-slate-200 px-4 py-5">
          <div className="space-y-6">
            <FinancialSummary metrics={metrics} />
            <div className="border-t border-slate-100 pt-5">
              <CashFlowBarChart movements={movements} />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <SourceBreakdown movements={movements} />
            </div>
          </div>
        </aside>
      </div>

      {/* Quick actions bar */}
      <QuickActionsBar onNewEntry={() => setShowCreateModal(true)} />

      {/* Modals */}
      {detailMovement ? (
        <MovementDetailModal
          movement={detailMovement}
          onClose={() => setDetailMovement(null)}
        />
      ) : null}
      {showCreateModal ? (
        <CreateMovementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleMovementCreated}
        />
      ) : null}
    </div>
  );
}

function MetricCard({
  Icon,
  iconColorClass,
  iconBgClass,
  title,
  value,
  valueColorClass,
}: {
  Icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  title: string;
  value: string;
  valueColorClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className={`mt-1 text-xl font-bold ${valueColorClass}`}>{value}</p>
        </div>
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
        >
          <Icon className={iconColorClass} size={18} />
        </div>
      </div>
    </div>
  );
}

function MovementRow({
  movement,
  onDetail,
}: {
  movement: CashMovementRecord;
  onDetail: () => void;
}) {
  const isIn = movement.type === "IN";
  const ref = movement.referenceId;
  const shortRef = ref ? (ref.length > 12 ? `${ref.slice(0, 8)}...` : ref) : "—";

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${isIn ? "bg-emerald-100" : "bg-rose-100"}`}
        >
          {isIn ? (
            <ArrowDownLeft className="text-emerald-600" size={15} />
          ) : (
            <ArrowUpRight className="text-rose-600" size={15} />
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
        {getSourceLabel(movement.source)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{shortRef}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
        {formatDateTime(movement.movementDate)}
      </td>
      <td
        className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${isIn ? "text-emerald-700" : "text-rose-700"}`}
      >
        {isIn ? "+" : "-"}
        {formatMoney(movement.amount)}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={onDetail}
          title="Ver detalle"
          type="button"
        >
          <Eye size={15} />
        </button>
      </td>
    </tr>
  );
}

function MovementDetailModal({
  movement,
  onClose,
}: {
  movement: CashMovementRecord;
  onClose: () => void;
}) {
  const isIn = movement.type === "IN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Detalle del movimiento</h2>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${isIn ? "bg-emerald-100" : "bg-rose-100"}`}
            >
              {isIn ? (
                <ArrowDownLeft className="text-emerald-600" size={18} />
              ) : (
                <ArrowUpRight className="text-rose-600" size={18} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {getSourceLabel(movement.source)}
              </p>
              <span
                className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isIn ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {isIn ? "Entrada" : "Salida"}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className={`text-2xl font-bold ${isIn ? "text-emerald-700" : "text-rose-700"}`}>
              {isIn ? "+" : "-"}
              {formatMoney(movement.amount)}
            </p>
          </div>

          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Origen</dt>
              <dd className="font-medium text-slate-900">{movement.source}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Referencia</dt>
              <dd className="break-all font-medium text-slate-900">
                {movement.referenceId ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Fecha y hora</dt>
              <dd className="font-medium text-slate-900">
                {formatDateTime(movement.movementDate)}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-mono text-xs text-slate-500">{movement.id}</dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateMovementModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: "IN",
          amount: parsedAmount,
          source: "MANUAL",
          referenceId: description.trim() || "Entrada manual",
        }),
      });
      const body = (await res.json()) as ApiResponse<CashMovementRecord>;
      if (!res.ok) {
        setError(body.error?.message ?? "No se pudo registrar el movimiento.");
        return;
      }
      onSuccess();
    } catch {
      setError("No se pudo registrar el movimiento.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Nueva entrada de caja</h2>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5">
                <p className="text-sm text-rose-800">{error}</p>
              </div>
            ) : null}
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="cm-amount"
              >
                Monto <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-7 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                  id="cm-amount"
                  min="0.01"
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </div>
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-slate-700"
                htmlFor="cm-description"
              >
                Concepto
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                id="cm-description"
                maxLength={100}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Pago de cliente, depósito inicial, etc."
                type="text"
                value={description}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Registrando..." : "Registrar entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FinancialSummary({
  metrics,
}: {
  metrics: { balance: number; totalIn: number; totalOut: number };
}) {
  const margin =
    metrics.totalIn > 0 ? ((metrics.totalIn - metrics.totalOut) / metrics.totalIn) * 100 : 0;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen financiero</h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Saldo actual</p>
          <p
            className={`text-2xl font-bold ${metrics.balance >= 0 ? "text-emerald-700" : "text-rose-700"}`}
          >
            {formatMoney(metrics.balance)}
          </p>
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total entradas</span>
            <span className="font-semibold text-emerald-700">{formatMoney(metrics.totalIn)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total salidas</span>
            <span className="font-semibold text-rose-700">{formatMoney(metrics.totalOut)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Margen</span>
            <span
              className={`font-semibold ${margin >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {margin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashFlowBarChart({ movements }: { movements: CashMovementRecord[] }) {
  const days = useMemo(() => getLast7Days(), []);

  const dayData = useMemo(
    () =>
      days.map((day) => {
        const dayMovements = movements.filter((m) =>
          isSameLocalDay(new Date(m.movementDate), day.date)
        );
        const inTotal = dayMovements
          .filter((m) => m.type === "IN")
          .reduce((s, m) => s + Number(m.amount), 0);
        const outTotal = dayMovements
          .filter((m) => m.type === "OUT")
          .reduce((s, m) => s + Number(m.amount), 0);
        return { ...day, inTotal, outTotal };
      }),
    [movements, days]
  );

  const maxValue = Math.max(...dayData.flatMap((d) => [d.inTotal, d.outTotal]), 1);

  const pTop = 15;
  const pBottom = 38;
  const pLeft = 42;
  const pRight = 8;
  const svgW = 280;
  const svgH = 175;
  const cW = svgW - pLeft - pRight;
  const cH = svgH - pTop - pBottom;
  const groupW = cW / 7;
  const bW = Math.floor((groupW - 6) / 2);
  const bGap = 2;
  const gPad = (groupW - bW * 2 - bGap) / 2;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-950">
        Flujo de caja (últimos 7 días)
      </h3>
      <div className="mb-2 flex gap-3">
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-500">Entradas</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-rose-400" />
          <span className="text-xs text-slate-500">Salidas</span>
        </div>
      </div>
      <svg
        className="w-full"
        viewBox={`0 0 ${svgW} ${svgH}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {[0, 0.33, 0.67, 1].map((fraction, i) => {
          const y = pTop + cH * (1 - fraction);
          return (
            <g key={i}>
              <line
                stroke="#f1f5f9"
                strokeWidth="1"
                x1={pLeft}
                x2={pLeft + cW}
                y1={y}
                y2={y}
              />
              <text
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize="9"
                textAnchor="end"
                x={pLeft - 4}
                y={y}
              >
                {formatShortMoney(maxValue * fraction)}
              </text>
            </g>
          );
        })}

        {dayData.map((day, i) => {
          const gX = pLeft + i * groupW + gPad;
          const inH = (day.inTotal / maxValue) * cH;
          const outH = (day.outTotal / maxValue) * cH;
          const inX = gX;
          const outX = gX + bW + bGap;
          const baseY = pTop + cH;
          const cX = pLeft + i * groupW + groupW / 2;

          return (
            <g key={i}>
              {day.inTotal > 0 ? (
                <rect
                  fill="#10b981"
                  height={inH}
                  rx="2"
                  width={bW}
                  x={inX}
                  y={baseY - inH}
                />
              ) : null}
              {day.outTotal > 0 ? (
                <rect
                  fill="#f87171"
                  height={outH}
                  rx="2"
                  width={bW}
                  x={outX}
                  y={baseY - outH}
                />
              ) : null}
              <text
                dominantBaseline="hanging"
                fill="#64748b"
                fontSize="9"
                textAnchor="middle"
                x={cX}
                y={baseY + 5}
              >
                {day.dayAbbr}
              </text>
              <text
                dominantBaseline="hanging"
                fill="#94a3b8"
                fontSize="8"
                textAnchor="middle"
                x={cX}
                y={baseY + 16}
              >
                {day.dayNum}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SourceBreakdown({ movements }: { movements: CashMovementRecord[] }) {
  const breakdown = useMemo(() => {
    const total = movements.reduce((s, m) => s + Number(m.amount), 0);
    const sources: { key: string; label: string; colorClass: string }[] = [
      { key: "SALE", label: "Ventas", colorClass: "text-emerald-700" },
      { key: "EXPENSE", label: "Gastos", colorClass: "text-rose-700" },
      { key: "DEBT_PAYMENT", label: "Pagos de deuda", colorClass: "text-blue-700" },
      { key: "MANUAL", label: "Manual", colorClass: "text-violet-700" },
    ];
    return sources.map((s) => {
      const amount = movements
        .filter((m) => m.source === s.key)
        .reduce((acc, m) => acc + Number(m.amount), 0);
      const pct = total > 0 ? (amount / total) * 100 : 0;
      return { ...s, amount, pct };
    });
  }, [movements]);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Desglose por origen</h3>
      <div className="space-y-2.5">
        {breakdown.map((row) => (
          <div className="flex items-center justify-between" key={row.key}>
            <span className="text-sm text-slate-600">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${row.colorClass}`}>
                {formatMoney(row.amount)}
              </span>
              <span className="w-9 text-right text-xs text-slate-400">
                {row.pct.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionsBar({ onNewEntry }: { onNewEntry: () => void }) {
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Acciones rápidas
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            onClick={onNewEntry}
            type="button"
          >
            <Plus size={12} />
            Nueva entrada
          </button>
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href="/expenses"
          >
            <Minus size={12} />
            Registrar gasto
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href="/reports"
          >
            Ver reportes
          </Link>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-400"
            disabled
            type="button"
          >
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="h-14 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
          key={i}
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-medium text-rose-900">{message}</p>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        {hasFilters
          ? "No hay movimientos que coincidan con los filtros."
          : "No hay movimientos de caja registrados."}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {hasFilters
          ? "Prueba ajustando los filtros de búsqueda."
          : "Las entradas y salidas aparecerán aquí cuando existan movimientos."}
      </p>
      {hasFilters ? (
        <button
          className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-800"
          onClick={onClear}
          type="button"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
