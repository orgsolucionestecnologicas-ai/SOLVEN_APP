"use client";

import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  History,
  Info,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatARS } from "@/lib/format-currency";
import { CashRegisterClose } from "./cash-register-close";
import { CashRegisterOpen } from "./cash-register-open";

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

type SessionRecord = {
  id: string;
  cashierName: string;
  branchName: string;
  shift: string | null;
  openedAt: string;
  openingAmount: string;
  status: "OPEN" | "CLOSED";
};

type ClosedSessionRecord = {
  id: string;
  cashierName: string;
  branchName: string;
  shift: string | null;
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  expectedAmount: string | null;
  difference: string | null;
  closingNotes: string | null;
  closingBreakdown: Record<string, number> | null;
};

const DENOMINATION_LABELS: Record<string, { label: string; value: number }> = {
  "20000": { label: "$20.000", value: 20000 },
  "10000": { label: "$10.000", value: 10000 },
  "2000": { label: "$2.000", value: 2000 },
  "1000": { label: "$1.000", value: 1000 },
  "500": { label: "$500", value: 500 },
  "200": { label: "$200", value: 200 },
  "100": { label: "$100", value: 100 },
  "50": { label: "$50", value: 50 },
  "20": { label: "$20", value: 20 },
  c10: { label: "Moneda $10", value: 10 },
  c5: { label: "Moneda $5", value: 5 },
  c2: { label: "Moneda $2", value: 2 },
  c1: { label: "Moneda $1", value: 1 },
};

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
type ApiResponse<T> = { data?: T; pagination?: PaginationMeta; error?: { message: string; details?: string[] } };

const PAGE_SIZE = 10;

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("es-419", { hour: "2-digit", minute: "2-digit", hour12: true });

function fmtMoney(v: number | string) { return formatARS(Number(v)); }
function fmtDate(v: string) { return dateFmt.format(new Date(v)); }
function fmtTime(v: string) { return timeFmt.format(new Date(v)); }

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDescription(m: CashMovementRecord): string {
  switch (m.source) {
    case "SALE":
      return m.referenceId ? `Cobro de factura V-${m.referenceId.slice(-6).toUpperCase()}` : "Cobro de venta";
    case "EXPENSE":
      return m.referenceId ?? "Gasto registrado";
    case "DEBT_PAYMENT":
      return "Pago de deuda cliente";
    case "MANUAL":
      return m.referenceId ?? "Movimiento manual";
    default:
      return m.referenceId ?? m.source;
  }
}

function getCategory(m: CashMovementRecord): string {
  switch (m.source) {
    case "SALE": return "Ventas en efectivo";
    case "EXPENSE": return "Gastos operativos";
    case "DEBT_PAYMENT": return "Cobros a crédito";
    case "MANUAL": return m.type === "IN" ? "Otros ingresos" : "Retiros";
    default: return "Otros";
  }
}

function getMovementCategoryStyle(m: CashMovementRecord): { label: string; className: string } {
  if (m.source === "SALE") return { label: "Venta", className: "bg-emerald-100 text-emerald-700" };
  if (m.source === "EXPENSE") return { label: "Gasto", className: "bg-orange-100 text-orange-700" };
  if (m.source === "MANUAL" && m.type === "OUT") return { label: "Retiro", className: "bg-rose-100 text-rose-700" };
  return { label: "Ajuste", className: "bg-slate-100 text-slate-600" };
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "SALE": return "Venta";
    case "EXPENSE": return "Gasto";
    case "DEBT_PAYMENT": return "Pago de deuda";
    case "MANUAL": return "Manual";
    default: return source;
  }
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportCashMovementsToCsv(movements: CashMovementRecord[]) {
  const header = ["Fecha", "Tipo", "Monto", "Origen", "Referencia"];
  const rows = movements.map((m) => [
    `${fmtDate(m.movementDate)} ${fmtTime(m.movementDate)}`,
    m.type === "IN" ? "Ingreso" : "Salida",
    fmtMoney(m.amount),
    getSourceLabel(m.source),
    m.referenceId ?? "",
  ]);
  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `caja_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function CashMovementsList() {
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [sessionStatus, setSessionStatus] = useState<"loading" | "noSession" | "open">("loading");
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [sessionRefreshKey, setSessionRefreshKey] = useState(0);
  const [view, setView] = useState<"movements" | "closing" | "history">("movements");

  const [typeFilter, setTypeFilter] = useState<"all" | "IN" | "OUT">("all");
  const [dateFilterDate, setDateFilterDate] = useState(todayISO());
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailMovement, setDetailMovement] = useState<CashMovementRecord | null>(null);
  const [todayMovements, setTodayMovements] = useState<CashMovementRecord[]>([]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const dateParams = showAllMovements ? "" : `&from=${dateFilterDate}&to=${dateFilterDate}`;
        const res = await fetch(`/api/cash-movements?limit=1000${dateParams}`, { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<CashMovementRecord[]>;
        if (!active) return;
        if (!res.ok || !body.data) { setLoadError("No se pudieron cargar los movimientos de caja."); setMovements([]); return; }
        setMovements(body.data);
        setLoadError(null);
      } catch {
        if (active) { setLoadError("No se pudieron cargar los movimientos de caja."); setMovements([]); }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [refreshKey, showAllMovements, dateFilterDate]);

  useEffect(() => {
    let active = true;

    async function loadToday() {
      try {
        const today = todayISO();
        const res = await fetch(`/api/cash-movements?limit=1000&from=${today}&to=${today}`, { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<CashMovementRecord[]>;
        if (!active) return;
        if (res.ok && body.data) setTodayMovements(body.data);
      } catch {
        if (active) setTodayMovements([]);
      }
    }

    void loadToday();
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const res = await fetch("/api/cash-register", { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<SessionRecord | null>;
        if (!active) return;
        if (res.ok && body.data !== undefined) {
          if (body.data === null) { setSessionStatus("noSession"); setCurrentSession(null); }
          else { setSessionStatus("open"); setCurrentSession(body.data); }
        } else { setSessionStatus("noSession"); }
      } catch {
        if (active) setSessionStatus("noSession");
      }
    }

    void loadSession();
    return () => { active = false; };
  }, [sessionRefreshKey]);

  const now = new Date();

  const todayIN = useMemo(() => todayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + Number(m.amount), 0), [todayMovements]);
  const todayOUT = useMemo(() => todayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + Number(m.amount), 0), [todayMovements]);
  const todayINCount = useMemo(() => todayMovements.filter((m) => m.type === "IN").length, [todayMovements]);
  const todayOUTCount = useMemo(() => todayMovements.filter((m) => m.type === "OUT").length, [todayMovements]);
  const balanceMovements = todayIN - todayOUT;
  const openingAmount = currentSession ? Number(currentSession.openingAmount) : 0;
  const expectedCash = openingAmount + balanceMovements;

  const categorySums = useMemo(() => {
    const map: Record<string, number> = {
      "Ventas en efectivo": 0,
      "Cobros a crédito": 0,
      "Retiros": 0,
      "Gastos operativos": 0,
      "Compras": 0,
      "Otros ingresos": 0,
    };
    for (const m of todayMovements) {
      const cat = getCategory(m);
      map[cat] = (map[cat] ?? 0) + Number(m.amount);
    }
    return map;
  }, [todayMovements]);

  const filteredMovements = useMemo(() => {
    let result = movements;
    if (typeFilter === "IN") result = result.filter((m) => m.type === "IN");
    if (typeFilter === "OUT") result = result.filter((m) => m.type === "OUT");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) =>
        getDescription(m).toLowerCase().includes(q) ||
        getCategory(m).toLowerCase().includes(q) ||
        (m.referenceId ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [movements, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedMovements = filteredMovements.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changePage(p: number) { setCurrentPage(Math.max(1, Math.min(p, totalPages))); }

  function reloadSession() { setSessionRefreshKey((k) => k + 1); setView("movements"); }

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (sessionStatus === "noSession") return <CashRegisterOpen onOpened={reloadSession} />;

  if (view === "closing" && currentSession) {
    return (
      <CashRegisterClose
        onBack={() => setView("movements")}
        onClosed={() => { setSessionRefreshKey((k) => k + 1); setView("movements"); }}
        session={currentSession}
      />
    );
  }

  if (view === "history") {
    return <CashRegisterHistoryView onBack={() => setView("movements")} />;
  }

  const todayFull = `${fmtDate(now.toISOString())} · ${DAY_NAMES[now.getDay()]}`;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800" href="/">
            <ArrowLeft size={15} />
            Volver a caja
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Wallet className="text-violet-600" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-950">Movimientos de caja</h1>
              <p className="text-xs text-slate-500">Registra ingresos o salidas de dinero durante el día.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
            onClick={() => setView("closing")}
            type="button"
          >
            Cierre de caja
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setView("history")}
            type="button"
          >
            <History size={13} />
            Historial de cierres
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => alert("Exportar estará disponible próximamente.")}
            type="button"
          >
            <Download size={13} />
            Exportar
          </button>
          <Link
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            href="/cash-movements/new"
          >
            <Plus size={13} />
            Nuevo movimiento
          </Link>
        </div>
      </div>

      {/* Info bar */}
      {currentSession ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-slate-100 bg-slate-50 px-6 py-2.5">
          <InfoBarItem label="Caja actual" value="Caja 1 - Mostrador" />
          <InfoBarItem
            label="Cajero"
            value={
              <span className="flex items-center gap-1.5">
                {currentSession.cashierName}
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Activo</span>
              </span>
            }
          />
          <InfoBarItem label="Fecha" value={todayFull} />
          <InfoBarItem
            label="Apertura de caja"
            value={`${fmtTime(currentSession.openedAt)} · Monto inicial: ${fmtMoney(currentSession.openingAmount)}`}
          />
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 border-b border-slate-200 px-6 py-4 lg:grid-cols-4">
        <MetricCard
          Icon={ArrowUpCircle}
          iconClass="text-emerald-500"
          label="Ingresos del día"
          sub={`${todayINCount} movimiento${todayINCount !== 1 ? "s" : ""}`}
          value={fmtMoney(todayIN)}
          valueClass="text-emerald-600"
        />
        <MetricCard
          Icon={ArrowDownCircle}
          iconClass="text-rose-500"
          label="Salidas del día"
          sub={`${todayOUTCount} movimiento${todayOUTCount !== 1 ? "s" : ""}`}
          value={fmtMoney(todayOUT)}
          valueClass="text-rose-600"
        />
        <MetricCard
          Icon={ArrowRight}
          iconClass="text-blue-500"
          label="Balance de movimientos"
          sub="Ingresos − Salidas"
          value={fmtMoney(balanceMovements)}
          valueClass={balanceMovements >= 0 ? "text-blue-600" : "text-rose-600"}
        />
        <MetricCard
          Icon={Wallet}
          iconClass="text-violet-500"
          label="Efectivo actual esperado"
          sub="Monto inicial + Balance"
          value={fmtMoney(expectedCash)}
          valueClass="text-violet-600"
        />
      </div>

      {/* Body */}
      <div className="flex flex-1">
        {/* Left */}
        <div className="min-w-0 flex-1 px-6 py-4">
          {/* Filters row */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => { setTypeFilter(e.target.value as "all" | "IN" | "OUT"); setCurrentPage(1); }}
              value={typeFilter}
            >
              <option value="all">Todos los tipos</option>
              <option value="IN">Ingreso</option>
              <option value="OUT">Salida</option>
            </select>
            {!showAllMovements ? (
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setDateFilterDate(e.target.value); setCurrentPage(1); }}
                type="date"
                value={dateFilterDate}
              />
            ) : null}
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => { setShowAllMovements((v) => !v); setCurrentPage(1); }}
              type="button"
            >
              {showAllMovements ? "← Filtrar por fecha" : "Ver todo"}
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => exportCashMovementsToCsv(filteredMovements)}
              type="button"
            >
              <Download size={13} />
              Exportar CSV
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Descripción o referencia..."
                type="text"
                value={searchQuery}
              />
            </div>
            <button
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              type="button"
            >
              <Filter size={13} />
              Filtros avanzados
            </button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Lista de movimientos</h3>
              <p className="text-xs text-slate-400">{filteredMovements.length} resultado{filteredMovements.length !== 1 ? "s" : ""}</p>
            </div>

            {isLoading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="h-14 animate-pulse bg-slate-50" key={i} />
                ))}
              </div>
            ) : loadError ? (
              <div className="p-6">
                <p className="text-sm text-rose-700">{loadError}</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="p-10 text-center">
                <Wallet className="mx-auto mb-3 text-slate-300" size={32} />
                <p className="text-sm font-semibold text-slate-950">Sin movimientos</p>
                <p className="mt-1 text-xs text-slate-400">No hay movimientos para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Hora", "Tipo", "Descripción", "Categoría", "Referencia", "Monto", ""].map((h, i) => (
                        <th
                          className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i === 5 ? "text-right" : "text-left"}`}
                          key={h || i}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedMovements.map((m) => {
                      const isIN = m.type === "IN";
                      const ref = m.referenceId;
                      const shortRef = ref ? (ref.length > 14 ? `${ref.slice(0, 10)}...` : ref) : "—";
                      const categoryStyle = getMovementCategoryStyle(m);
                      return (
                        <tr className="hover:bg-slate-50/50" key={m.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                            {fmtTime(m.movementDate)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isIN ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                              >
                                {isIN ? "↑ Ingreso" : "↓ Salida"}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${categoryStyle.className}`}
                              >
                                {categoryStyle.label}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-slate-950">
                            {getDescription(m)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                            {getCategory(m)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-400">
                            {shortRef}
                          </td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${isIN ? "text-emerald-600" : "text-rose-600"}`}>
                            {isIN ? "+" : "−"}{fmtMoney(m.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                onClick={() => setDetailMovement(m)}
                                type="button"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                className="hidden rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                type="button"
                              >
                                <MoreHorizontal size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredMovements.length > PAGE_SIZE ? (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Mostrando {(safePage - 1) * PAGE_SIZE + 1} a{" "}
                  {Math.min(safePage * PAGE_SIZE, filteredMovements.length)} de{" "}
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
                      <span className="px-2 text-xs text-slate-400" key={`el-${i}`}>...</span>
                    ) : (
                      <button
                        className={p === safePage ? "h-7 min-w-[1.75rem] rounded-md bg-violet-600 px-2 text-xs font-semibold text-white" : "h-7 min-w-[1.75rem] rounded-md border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"}
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
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              href="/cash-movements/new?type=IN"
            >
              <ArrowUpCircle size={13} />
              Registrar ingreso
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
              href="/cash-movements/new?type=OUT"
            >
              <ArrowDownCircle size={13} />
              Registrar salida
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href="/cash-movements/new?type=OUT&category=Retiros"
            >
              <Wallet size={13} />
              Retiro de efectivo
            </Link>
            <Link
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              href="/cash-movements/new?type=OUT&category=Compras"
            >
              <Truck size={13} />
              Pago a proveedor
            </Link>
          </div>

          {/* Info banner */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <Info className="shrink-0 text-slate-400" size={14} />
            <p className="text-xs text-slate-500">
              Los movimientos de caja se registran en tiempo real y no se pueden eliminar, solo anular.
            </p>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 border-l border-slate-200 px-4 py-5">
          <div className="space-y-5">
            {/* Panel 1: Resumen del día */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen del día</h3>
              <div className="space-y-2">
                <SidebarRow label="Monto inicial" value={fmtMoney(openingAmount)} valueClass="text-slate-950" />
                <SidebarRow label="(+) Ingresos" value={`+ ${fmtMoney(todayIN)}`} valueClass="text-emerald-600" />
                <SidebarRow label="(−) Salidas" value={`− ${fmtMoney(todayOUT)}`} valueClass="text-rose-600" />
              </div>
              <div className="my-3 border-t border-slate-100" />
              <div>
                <p className="text-xs text-slate-500">Efectivo actual esperado</p>
                <p className="mt-0.5 text-xl font-bold text-violet-600">{fmtMoney(expectedCash)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Monto inicial + ingresos − salidas</p>
              </div>
            </div>

            {/* Panel 2: Categorías más usadas */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Categorías más usadas</h3>
              <CategoryBreakdown categorySums={categorySums} />
              <button className="mt-3 hidden text-xs font-medium text-violet-600 hover:text-violet-800" type="button">
                Ver todas las categorías →
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Detail modal */}
      {detailMovement ? (
        <MovementDetailModal movement={detailMovement} onClose={() => setDetailMovement(null)} />
      ) : null}
    </div>
  );
}

function CashRegisterHistoryView({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<ClosedSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClosedSessionRecord | null>(null);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { headers: { Accept: "application/json" } });
        const body = await res.json();
        if (active && res.ok && body.data?.businessName) setBusinessName(body.data.businessName);
      } catch { /* keep default */ }
    }

    void loadSettings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/cash-register/sessions?page=${page}&limit=10`, { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<ClosedSessionRecord[]>;
        if (!active) return;
        if (!res.ok || !body.data) { setLoadError("No se pudo cargar el historial de cierres."); setSessions([]); return; }
        setSessions(body.data);
        setPagination(body.pagination ?? null);
        setLoadError(null);
      } catch {
        if (active) { setLoadError("No se pudo cargar el historial de cierres."); setSessions([]); }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [page]);

  return (
    <>
    <div className="flex min-h-full flex-col print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800" onClick={onBack} type="button">
            <ArrowLeft size={15} />
            Volver a movimientos
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <History className="text-violet-600" size={16} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-950">Historial de cierres</h1>
              <p className="text-xs text-slate-500">Consultá el resumen de cierre de cualquier sesión anterior.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-4">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-950">Sesiones cerradas</h3>
            <p className="text-xs text-slate-400">{pagination ? `${pagination.total} sesión${pagination.total !== 1 ? "es" : ""}` : ""}</p>
          </div>

          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div className="h-14 animate-pulse bg-slate-50" key={i} />
              ))}
            </div>
          ) : loadError ? (
            <div className="p-6">
              <p className="text-sm text-rose-700">{loadError}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-10 text-center">
              <History className="mx-auto mb-3 text-slate-300" size={32} />
              <p className="text-sm font-semibold text-slate-950">Sin cierres registrados</p>
              <p className="mt-1 text-xs text-slate-400">Todavía no hay sesiones de caja cerradas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Apertura", "Cierre", "Cajero", "Monto apertura", "Monto cierre", "Diferencia", ""].map((h, i) => (
                      <th
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i >= 3 && i <= 5 ? "text-right" : "text-left"}`}
                        key={h || i}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => {
                    const diff = s.difference !== null ? Number(s.difference) : 0;
                    const diffIsZero = Math.abs(diff) < 0.005;
                    return (
                      <tr className="cursor-pointer hover:bg-slate-50/50" key={s.id} onClick={() => setSelectedSession(s)}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                          {fmtDate(s.openedAt)} · {fmtTime(s.openedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                          {s.closedAt ? `${fmtDate(s.closedAt)} · ${fmtTime(s.closedAt)}` : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-950">
                          {s.cashierName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                          {fmtMoney(s.openingAmount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                          {s.closingAmount !== null ? fmtMoney(s.closingAmount) : "—"}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold ${diffIsZero ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-rose-600"}`}>
                          {s.difference !== null ? `${diff > 0 ? "+" : ""}${fmtMoney(s.difference)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Eye className="inline text-slate-400" size={13} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

    </div>
    {selectedSession ? (
      <ClosedSessionDetailModal
        businessName={businessName}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
      />
    ) : null}
    </>
  );
}

function ClosedSessionDetailModal({
  businessName, session, onClose
}: {
  businessName: string;
  session: ClosedSessionRecord;
  onClose: () => void;
}) {
  const diff = session.difference !== null ? Number(session.difference) : 0;
  const diffIsZero = Math.abs(diff) < 0.005;
  const breakdownEntries = session.closingBreakdown
    ? Object.entries(session.closingBreakdown).filter(([, count]) => count > 0)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:static print:block print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <h2 className="text-sm font-semibold text-slate-950">Detalle del cierre</h2>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="hidden px-6 pt-6 text-center print:block">
          <p className="text-lg font-bold text-slate-950">{businessName || "SOLVEN"}</p>
          <p className="text-xs text-slate-500">Resumen de cierre de caja</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <dl className="space-y-2.5">
            {[
              { label: "Cajero", value: session.cashierName },
              { label: "Sucursal", value: session.branchName },
              { label: "Apertura", value: `${fmtDate(session.openedAt)} · ${fmtTime(session.openedAt)}` },
              { label: "Cierre", value: session.closedAt ? `${fmtDate(session.closedAt)} · ${fmtTime(session.closedAt)}` : "—" },
              { label: "Monto de apertura", value: fmtMoney(session.openingAmount) },
              { label: "Monto esperado", value: session.expectedAmount !== null ? fmtMoney(session.expectedAmount) : "—" },
              { label: "Monto contado", value: session.closingAmount !== null ? fmtMoney(session.closingAmount) : "—" },
            ].map(({ label, value }) => (
              <div className="flex justify-between text-sm" key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="max-w-[220px] text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className={`rounded-xl p-4 text-center ${diffIsZero ? "bg-emerald-50" : "bg-amber-50"}`}>
            <p className="text-xs text-slate-500">Diferencia</p>
            <p className={`text-xl font-bold ${diffIsZero ? "text-emerald-600" : diff > 0 ? "text-blue-600" : "text-rose-600"}`}>
              {session.difference !== null ? `${diff > 0 ? "+" : ""}${fmtMoney(session.difference)}` : "—"}
            </p>
          </div>

          {breakdownEntries.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Desglose de denominaciones</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {breakdownEntries.map(([key, count]) => {
                  const denom = DENOMINATION_LABELS[key];
                  const subtotal = denom ? denom.value * count : 0;
                  return (
                    <div className="flex items-center justify-between px-3 py-2 text-sm" key={key}>
                      <span className="text-slate-600">{denom?.label ?? key} × {count}</span>
                      <span className="font-medium text-slate-950">{fmtMoney(subtotal)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {session.closingNotes ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Notas</p>
              <p className="text-sm text-slate-700">{session.closingNotes}</p>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 print:hidden">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={14} />
            Descargar PDF
          </button>
          <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBarItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-400">{label}:</span>
      <span className="text-xs font-medium text-slate-700">{value}</span>
    </div>
  );
}

function MetricCard({
  Icon, iconClass, label, value, valueClass, sub
}: {
  Icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  valueClass: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
        <Icon className={iconClass} size={18} />
      </div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function SidebarRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function CategoryBreakdown({ categorySums }: { categorySums: Record<string, number> }) {
  const entries = Object.entries(categorySums).filter(([, v]) => v > 0);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  const COLORS: Record<string, string> = {
    "Ventas en efectivo": "bg-emerald-500",
    "Cobros a crédito": "bg-blue-500",
    "Retiros": "bg-orange-500",
    "Gastos operativos": "bg-rose-500",
    "Compras": "bg-amber-500",
    "Otros ingresos": "bg-violet-500",
  };

  if (entries.length === 0) {
    return <p className="text-xs text-slate-400">Sin movimientos hoy</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => (
          <div key={cat}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-600">{cat}</span>
              <span className="text-xs font-semibold text-slate-950">
                {fmtMoney(amt)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${COLORS[cat] ?? "bg-slate-400"}`}
                style={{ width: `${(amt / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function MovementDetailModal({ movement, onClose }: { movement: CashMovementRecord; onClose: () => void }) {
  const isIN = movement.type === "IN";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Detalle del movimiento</h2>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isIN ? "bg-emerald-100" : "bg-rose-100"}`}>
              {isIN ? <ArrowUpCircle className="text-emerald-600" size={18} /> : <ArrowDownCircle className="text-rose-600" size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{getDescription(movement)}</p>
              <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${isIN ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {isIN ? "↑ Ingreso" : "↓ Salida"}
              </span>
            </div>
          </div>
          <div className={`rounded-xl p-4 text-center ${isIN ? "bg-emerald-50" : "bg-rose-50"}`}>
            <p className={`text-2xl font-bold ${isIN ? "text-emerald-600" : "text-rose-600"}`}>
              {isIN ? "+" : "−"}{fmtMoney(movement.amount)}
            </p>
          </div>
          <dl className="space-y-2.5">
            {[
              { label: "Categoría", value: getCategory(movement) },
              { label: "Descripción", value: getDescription(movement) },
              { label: "Referencia", value: movement.referenceId ?? "—" },
              { label: "Fecha y hora", value: `${fmtDate(movement.movementDate)} · ${fmtTime(movement.movementDate)}` },
            ].map(({ label, value }) => (
              <div className="flex justify-between text-sm" key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="max-w-[200px] text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
