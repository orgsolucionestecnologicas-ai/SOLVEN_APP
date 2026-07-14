"use client";

import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Tag,
  Trash2,
  TrendingDown,
  type LucideIcon
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { getDateRangeParams } from "@/lib/date-filter";
import { formatARS as formatMoney } from "@/lib/format-currency";

type ExpenseRecord = {
  id: string;
  amount: string;
  category: string;
  description: string;
  expenseDate: string;
  receiptUrl?: string | null;
  supplierId?: string | null;
  supplier?: { name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type SupplierRecord = { id: string; name: string };

const MAX_RECEIPT_SIZE_BYTES = 2 * 1024 * 1024;

type ExpenseBudgetRecord = { id: string; category: string; monthlyLimit: string };

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
type ApiResponse<T> = { data?: T; pagination?: PaginationMeta; error?: { message: string; details?: string[] } };

type BudgetStatus = "green" | "yellow" | "red";

const BUDGET_STATUS_CLASSES: Record<BudgetStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500"
};

function budgetStatus(spent: number, limit: number): BudgetStatus {
  const pct = (spent / limit) * 100;
  if (pct > 100) return "red";
  if (pct >= 70) return "yellow";
  return "green";
}

const PAGE_SIZE = 10;

const CATEGORY_COLORS = ["#7c3aed", "#3b82f6", "#f97316", "#10b981", "#ef4444", "#eab308", "#ec4899", "#06b6d4"];

const CATEGORY_BADGE_CLASSES = [
  "bg-violet-100 text-violet-800",
  "bg-blue-100 text-blue-800",
  "bg-orange-100 text-orange-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-yellow-100 text-yellow-800",
  "bg-pink-100 text-pink-800",
  "bg-cyan-100 text-cyan-800"
];

const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(v: string): string { return dateFmt.format(new Date(v)); }

function categoryIndex(cat: string): number {
  let s = 0;
  for (const ch of cat) s += ch.charCodeAt(0);
  return s % CATEGORY_COLORS.length;
}

function categoryColor(cat: string): string { return CATEGORY_COLORS[categoryIndex(cat)]; }
function categoryBadge(cat: string): string { return CATEGORY_BADGE_CLASSES[categoryIndex(cat)]; }

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function todayAsInputValue(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function ExpensesList() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [filterDate, setFilterDate] = useState<"todo" | "hoy" | "semana" | "mes">("todo");
  const [currentPage, setCurrentPage] = useState(1);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<ExpenseBudgetRecord[]>([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: { role?: string } }) => {
        if (isActive && body.data?.role) setRole(body.data.role);
      })
      .catch(() => {});
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    fetch("/api/suppliers", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: ApiResponse<SupplierRecord[]>) => {
        if (isActive && body.data) setSuppliers(body.data);
      })
      .catch(() => {});
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadBudgets() {
      try {
        const res = await fetch("/api/expense-budgets", { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<ExpenseBudgetRecord[]>;
        if (!isActive) return;
        if (res.ok && body.data) setBudgets(body.data);
      } catch {
        if (isActive) setBudgets([]);
      }
    }

    void loadBudgets();
    return () => { isActive = false; };
  }, [refreshKey]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function load() {
      try {
        const { from, to } = getDateRangeParams(filterDate);
        const url = `/api/expenses?limit=1000${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<ExpenseRecord[]>;
        if (!isActive) return;
        if (!res.ok || !body.data) {
          setLoadError("No se pudieron cargar los gastos.");
          setExpenses([]);
          return;
        }
        setExpenses(body.data);
        setLoadError(null);
      } catch {
        if (isActive) { setLoadError("No se pudieron cargar los gastos."); setExpenses([]); }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void load();
    return () => { isActive = false; };
  }, [refreshKey, filterDate]);

  useEffect(() => {
    let isActive = true;

    async function loadAll() {
      try {
        const res = await fetch("/api/expenses?limit=1000", { headers: { Accept: "application/json" } });
        const body = (await res.json()) as ApiResponse<ExpenseRecord[]>;
        if (!isActive) return;
        if (res.ok && body.data) setAllExpenses(body.data);
      } catch {
        if (isActive) setAllExpenses([]);
      }
    }

    void loadAll();
    return () => { isActive = false; };
  }, [refreshKey]);

  const totalExpenses = useMemo(() => allExpenses.reduce((s, e) => s + Number(e.amount), 0), [allExpenses]);

  const monthExpenses = useMemo(() => {
    const now = new Date();
    return allExpenses
      .filter((e) => { const d = new Date(e.expenseDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, e) => s + Number(e.amount), 0);
  }, [allExpenses]);

  const avgExpense = useMemo(() => (allExpenses.length > 0 ? totalExpenses / allExpenses.length : 0), [totalExpenses, allExpenses]);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of allExpenses) totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount);
    let best = "—"; let bestAmt = 0;
    for (const [cat, amt] of Object.entries(totals)) { if (amt > bestAmt) { bestAmt = amt; best = cat; } }
    return best;
  }, [allExpenses]);

  const uniqueCategories = useMemo(() => [...new Set(allExpenses.map((e) => e.category))].sort(), [allExpenses]);

  const categoryStats = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of allExpenses) totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount);
    return Object.entries(totals).map(([cat, amt]) => ({ cat, amt })).sort((a, b) => b.amt - a.amt);
  }, [allExpenses]);

  const budgetByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of budgets) map[b.category] = Number(b.monthlyLimit);
    return map;
  }, [budgets]);

  const monthCategoryTotals = useMemo(() => {
    const now = new Date();
    const totals: Record<string, number> = {};
    for (const e of allExpenses) {
      const d = new Date(e.expenseDate);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        totals[e.category] = (totals[e.category] ?? 0) + Number(e.amount);
      }
    }
    return totals;
  }, [allExpenses]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (filterCategory) result = result.filter((e) => e.category === filterCategory);
    if (filterSupplierId) result = result.filter((e) => e.supplierId === filterSupplierId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    return result;
  }, [expenses, filterCategory, filterSupplierId, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredExpenses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changePage(p: number) { setCurrentPage(Math.max(1, Math.min(p, totalPages))); }
  function clearFilters() { setSearchQuery(""); setFilterCategory(""); setFilterSupplierId(""); setFilterDate("todo"); setCurrentPage(1); }

  const hasFilters = Boolean(searchQuery || filterCategory || filterSupplierId || filterDate !== "todo");

  function handleExpenseCreated() {
    setIsCreateModalOpen(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Gasto registrado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Gastos</h1>
          <p className="mt-0.5 text-sm text-slate-500">Registra y controla todos los gastos de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            onClick={() => window.print()}
            type="button"
          >
            <Download size={14} />
            Exportar
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus size={14} />
            Nuevo gasto
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            type="button"
          >
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
        <MetricCard Icon={TrendingDown} iconClass="bg-rose-100 text-rose-600" title="Total gastos" value={totalExpenses} isMoney subtitle={`${expenses.length} registros`} subtitleClass="text-slate-500" />
        <MetricCard Icon={Calendar} iconClass="bg-orange-100 text-orange-600" title="Gastos del mes" value={monthExpenses} isMoney subtitle="Mes actual" subtitleClass="text-slate-500" />
        <MetricCard Icon={BarChart2} iconClass="bg-blue-100 text-blue-600" title="Gasto promedio" value={avgExpense} isMoney subtitle="Por gasto" subtitleClass="text-slate-500" />
        <MetricCard Icon={Tag} iconClass="bg-violet-100 text-violet-600" title="Mayor categoría" valueText={topCategory} subtitle="Mayor gasto acumulado" subtitleClass="text-slate-500" />
      </div>

      {/* Body */}
      <div className="flex border-t border-slate-200">
        {/* Center */}
        <div className="min-w-0 flex-1 px-5 py-4">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar gasto..."
                type="text"
                value={searchQuery}
              />
            </div>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              value={filterCategory}
            >
              <option value="">Categoría</option>
              {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {suppliers.length > 0 ? (
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setFilterSupplierId(e.target.value); setCurrentPage(1); }}
                value={filterSupplierId}
              >
                <option value="">Proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : null}
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
              onChange={(e) => { setFilterDate(e.target.value as "todo" | "hoy" | "semana" | "mes"); setCurrentPage(1); }}
              value={filterDate}
            >
              <option value="todo">Todo</option>
              <option value="hoy">Hoy</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mes</option>
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
          {!isLoading && !loadError && filteredExpenses.length === 0 ? <EmptyState /> : null}
          {!isLoading && !loadError && filteredExpenses.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Fecha", "Categoría", "Descripción", "Monto", "Acciones"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i >= 3 ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{formatDate(expense.expenseDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryBadge(expense.category)}`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-sm text-slate-700">
                          <span className="line-clamp-1">{expense.description}</span>
                          {expense.supplier ? (
                            <span className="block text-xs text-slate-400">Proveedor: {expense.supplier.name}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-rose-600">
                          -{formatMoney(Number(expense.amount))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {expense.receiptUrl ? (
                              <button
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600"
                                onClick={() => window.open(expense.receiptUrl ?? undefined, "_blank", "noopener,noreferrer")}
                                title="Ver comprobante"
                                type="button"
                              >
                                <Paperclip size={13} />
                              </button>
                            ) : null}
                            <button
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              onClick={() => setDetailExpense(expense)}
                              title="Ver detalle"
                              type="button"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                              title="Eliminar (próximamente)"
                              type="button"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Mostrando {filteredExpenses.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredExpenses.length)} de {filteredExpenses.length} gastos
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
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">Gastos por categoría</h3>
                {role === "OWNER" ? (
                  <button
                    className="text-slate-400 hover:text-violet-600"
                    onClick={() => setIsBudgetModalOpen(true)}
                    title="Configurar presupuestos"
                    type="button"
                  >
                    <Settings2 size={14} />
                  </button>
                ) : null}
              </div>
              <CategoryDonutChart
                budgetByCategory={budgetByCategory}
                monthSpendByCategory={monthCategoryTotals}
                onSelectCategory={(cat) => { setFilterCategory(cat); setCurrentPage(1); }}
                selectedCategory={filterCategory}
                stats={categoryStats}
                total={totalExpenses}
              />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Últimos movimientos</h3>
              <RecentExpenses expenses={allExpenses.slice(0, 5)} />
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen del período</h3>
              <PeriodSummary total={totalExpenses} count={expenses.length} avg={avgExpense} topCat={topCategory} />
            </div>
          </div>
        </aside>
      </div>

      {/* Quick actions */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Acciones rápidas</span>
          <QuickActionButton Icon={Plus} label="Nuevo gasto" onClick={() => setIsCreateModalOpen(true)} />
          <QuickActionButton Icon={Download} label="Exportar" onClick={() => exportExpensesToCsv(filteredExpenses)} />
        </div>
      </div>

      {isCreateModalOpen ? <CreateExpenseModal onClose={() => setIsCreateModalOpen(false)} onSuccess={handleExpenseCreated} /> : null}
      {detailExpense ? <ExpenseDetailModal expense={detailExpense} onClose={() => setDetailExpense(null)} /> : null}
      {isBudgetModalOpen ? (
        <BudgetConfigModal
          budgetByCategory={budgetByCategory}
          categories={uniqueCategories}
          onClose={() => setIsBudgetModalOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
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
  value?: number;
  valueText?: string;
  isMoney?: boolean;
  subtitle: string;
  subtitleClass: string;
};

function MetricCard({ Icon, iconClass, title, value, valueText, isMoney, subtitle, subtitleClass }: MetricCardProps) {
  const display = valueText ?? (isMoney ? formatMoney(value ?? 0) : String(value ?? 0));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-950">{display}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`mt-2 text-xs ${subtitleClass}`}>{subtitle}</p>
    </div>
  );
}

function CategoryDonutChart({
  stats,
  total,
  selectedCategory,
  onSelectCategory,
  budgetByCategory,
  monthSpendByCategory
}: {
  stats: { cat: string; amt: number }[];
  total: number;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  budgetByCategory: Record<string, number>;
  monthSpendByCategory: Record<string, number>;
}) {
  if (total === 0 || stats.length === 0) {
    return <div className="flex h-24 items-center justify-center"><p className="text-sm text-slate-400">Sin datos</p></div>;
  }
  const cx = 72, cy = 72, r = 50, sw = 18;
  let angle = 0;
  const slices = stats.map(({ cat, amt }) => {
    const sweep = (amt / total) * 360;
    const start = angle;
    const end = angle + (sweep >= 360 ? 359.9 : sweep);
    angle += sweep;
    return { cat, amt, start, end, color: categoryColor(cat) };
  });

  function toggleCategory(cat: string) {
    onSelectCategory(selectedCategory === cat ? "" : cat);
  }

  return (
    <div>
      <svg className="mx-auto block" height={144} viewBox="0 0 144 144" width={144}>
        <circle cx={cx} cy={cy} fill="none" r={r} stroke="#f1f5f9" strokeWidth={sw} />
        {slices.map((s) => (
          <path
            className="cursor-pointer"
            d={arcPath(cx, cy, r, s.start, s.end)}
            fill="none"
            key={s.cat}
            onClick={() => toggleCategory(s.cat)}
            opacity={selectedCategory && selectedCategory !== s.cat ? 0.3 : 1}
            stroke={s.color}
            strokeLinecap="butt"
            strokeWidth={selectedCategory === s.cat ? sw + 4 : sw}
          >
            <title>{s.cat}</title>
          </path>
        ))}
        <text dominantBaseline="middle" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle" x={cx} y={cy - 7}>
          {formatMoney(total)}
        </text>
        <text dominantBaseline="middle" fill="#94a3b8" fontSize="8" textAnchor="middle" x={cx} y={cy + 7}>
          total
        </text>
      </svg>
      {selectedCategory ? (
        <button
          className="mx-auto mt-2 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
          onClick={() => onSelectCategory("")}
          type="button"
        >
          <RotateCcw size={11} />
          Quitar filtro
        </button>
      ) : null}
      <div className="mt-3 space-y-1.5">
        {slices.slice(0, 6).map(({ cat, amt, color }) => {
          const limit = budgetByCategory[cat];
          const spent = monthSpendByCategory[cat] ?? 0;
          const status = limit ? budgetStatus(spent, limit) : null;
          return (
            <button
              className={`flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left transition-colors ${
                selectedCategory === cat ? "bg-violet-50 ring-1 ring-violet-400" : "hover:bg-slate-50"
              }`}
              key={cat}
              onClick={() => toggleCategory(cat)}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="max-w-[100px] truncate text-xs text-slate-700">{cat}</span>
                {status ? (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${BUDGET_STATUS_CLASSES[status]}`}
                    title={`Presupuesto mensual: ${formatMoney(limit)} · Gastado este mes: ${formatMoney(spent)} (${Math.round((spent / limit) * 100)}%)`}
                  />
                ) : null}
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-950">{formatMoney(amt)}</span>
                <span className="ml-1 text-[10px] text-slate-400">{Math.round((amt / total) * 100)}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecentExpenses({ expenses }: { expenses: ExpenseRecord[] }) {
  if (expenses.length === 0) return <p className="text-xs text-slate-400">Sin gastos recientes</p>;
  return (
    <div className="space-y-2.5">
      {expenses.map((e) => (
        <div className="flex items-start justify-between gap-2" key={e.id}>
          <div className="min-w-0 flex-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryBadge(e.category)}`}>{e.category}</span>
            <p className="mt-0.5 truncate text-xs text-slate-600">{e.description}</p>
            <p className="text-[10px] text-slate-400">{formatDate(e.expenseDate)}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-rose-600">-{formatMoney(Number(e.amount))}</span>
        </div>
      ))}
    </div>
  );
}

function PeriodSummary({ total, count, avg, topCat }: { total: number; count: number; avg: number; topCat: string }) {
  return (
    <div className="space-y-2">
      {[
        { label: "Total gastos", val: formatMoney(total), cls: "font-bold text-rose-600" },
        { label: "Cantidad de gastos", val: String(count), cls: "font-semibold text-slate-950" },
        { label: "Promedio por gasto", val: formatMoney(avg), cls: "font-semibold text-slate-950" },
        { label: "Categoría más frecuente", val: topCat, cls: "truncate font-semibold text-slate-950" }
      ].map(({ label, val, cls }) => (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2" key={label}>
          <span className="text-xs text-slate-600">{label}</span>
          <span className={`max-w-[100px] text-xs ${cls}`}>{val}</span>
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

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportExpensesToCsv(expenses: ExpenseRecord[]) {
  const header = ["Fecha", "Categoría", "Descripción", "Monto"];
  const rows = expenses.map((e) => [
    formatDate(e.expenseDate),
    e.category,
    e.description,
    formatMoney(Number(e.amount))
  ]);
  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gastos-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Modals ────────────────────────────────────────────────────────────────────

function ExpenseDetailModal({ expense, onClose }: { expense: ExpenseRecord; onClose: () => void }) {
  const rows = [
    { label: "ID", val: `#${expense.id.slice(-8).toUpperCase()}` },
    { label: "Fecha", val: formatDate(expense.expenseDate) },
    { label: "Categoría", val: expense.category },
    { label: "Descripción", val: expense.description },
    { label: "Monto", val: `-${formatMoney(Number(expense.amount))}`, highlight: true }
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Detalle del gasto</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <dl className="divide-y divide-slate-100 px-6">
          {rows.map(({ label, val, highlight }) => (
            <div key={label} className="flex items-start justify-between py-3">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className={`max-w-[240px] break-words text-right text-sm font-medium ${highlight ? "text-rose-600" : "text-slate-950"}`}>{val}</dd>
            </div>
          ))}
        </dl>
        {expense.receiptUrl ? (
          <div className="px-6 pb-2">
            <button
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
              onClick={() => window.open(expense.receiptUrl ?? undefined, "_blank", "noopener,noreferrer")}
              type="button"
            >
              <Paperclip size={13} />
              Ver comprobante
            </button>
          </div>
        ) : null}
        <div className="border-t border-slate-200 px-6 py-4">
          <button className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayAsInputValue());
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    fetch("/api/suppliers", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: ApiResponse<SupplierRecord[]>) => {
        if (isActive && body.data) setSuppliers(body.data);
      })
      .catch(() => {});
    return () => { isActive = false; };
  }, []);

  function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setReceiptUrl(null);
      setReceiptFileName(null);
      return;
    }
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      setSubmitError("El comprobante debe pesar menos de 2MB.");
      event.target.value = "";
      setReceiptUrl(null);
      setReceiptFileName(null);
      return;
    }
    setSubmitError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptUrl(typeof reader.result === "string" ? reader.result : null);
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), category: category.trim(), description: description.trim(), receiptUrl, supplierId: supplierId || null })
      });
      const body = (await response.json()) as ApiResponse<ExpenseRecord>;
      if (!response.ok || !body.data) {
        setSubmitError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el gasto.");
        return;
      }
      if (isRecurring) {
        await fetch("/api/recurring-expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: category.trim(),
            amount: Number(amount),
            description: description.trim(),
            dayOfMonth: new Date().getDate()
          })
        });
      }
      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el gasto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Nuevo gasto</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-amount">Monto</label>
            <input autoFocus className={inputCls} disabled={isSubmitting} id="expense-amount" min="0.01" onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required step="0.01" type="number" value={amount} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-category">Categoría</label>
            <input className={inputCls} disabled={isSubmitting} id="expense-category" onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Servicios" required type="text" value={category} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-description">Descripción</label>
            <input className={inputCls} disabled={isSubmitting} id="expense-description" onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Pago de electricidad" required type="text" value={description} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-date">Fecha</label>
            <input className={inputCls} disabled={isSubmitting} id="expense-date" onChange={(e) => setExpenseDate(e.target.value)} required type="date" value={expenseDate} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-receipt">Comprobante (opcional, máx. 2MB)</label>
            <input accept="image/*,.pdf" className={inputCls} disabled={isSubmitting} id="expense-receipt" onChange={handleReceiptChange} type="file" />
            {receiptFileName ? <p className="mt-1 text-xs text-slate-500">Adjunto: {receiptFileName}</p> : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="expense-supplier">Proveedor (opcional)</label>
            <select className={inputCls} disabled={isSubmitting} id="expense-supplier" onChange={(e) => setSupplierId(e.target.value)} value={supplierId}>
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="expense-recurring">
            <input
              checked={isRecurring}
              className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              disabled={isSubmitting}
              id="expense-recurring"
              onChange={(e) => setIsRecurring(e.target.checked)}
              type="checkbox"
            />
            Repetir automáticamente cada mes
          </label>
          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" disabled={isSubmitting} onClick={onClose} type="button">Cancelar</button>
            <button className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Guardando..." : "Guardar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetConfigModal({
  categories,
  budgetByCategory,
  onClose,
  onSaved
}: {
  categories: string[];
  budgetByCategory: Record<string, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cat of categories) initial[cat] = budgetByCategory[cat] ? String(budgetByCategory[cat]) : "";
    return initial;
  });
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(cat: string) {
    const value = Number(limits[cat]);
    if (!Number.isFinite(value) || value <= 0) {
      setError("El límite debe ser un número mayor a cero.");
      return;
    }
    setSavingCategory(cat);
    setError(null);
    try {
      const response = await fetch("/api/expense-budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, monthlyLimit: value })
      });
      if (!response.ok) {
        setError("No se pudo guardar el presupuesto.");
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo guardar el presupuesto.");
    } finally {
      setSavingCategory(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Configurar presupuestos mensuales</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400">No hay categorías registradas todavía.</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div className="flex items-center gap-2" key={cat}>
                  <span className="w-28 shrink-0 truncate text-sm text-slate-700" title={cat}>{cat}</span>
                  <input
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                    min="0"
                    onChange={(e) => setLimits((prev) => ({ ...prev, [cat]: e.target.value }))}
                    placeholder="Sin límite"
                    step="0.01"
                    type="number"
                    value={limits[cat] ?? ""}
                  />
                  <button
                    className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    disabled={savingCategory === cat}
                    onClick={() => handleSave(cat)}
                    type="button"
                  >
                    {savingCategory === cat ? "..." : "Guardar"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
        </div>
        <div className="border-t border-slate-200 px-6 py-4">
          <button className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} type="button">
            Cerrar
          </button>
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
      <TrendingDown className="mx-auto mb-3 text-slate-300" size={32} />
      <p className="text-sm font-semibold text-slate-950">No hay gastos que coincidan</p>
      <p className="mt-1 text-sm text-slate-500">Intenta ajustar los filtros o la búsqueda.</p>
    </div>
  );
}
