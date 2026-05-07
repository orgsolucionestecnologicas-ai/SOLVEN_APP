"use client";

import {
  Calendar,
  ChevronDown,
  CreditCard as CreditCardIcon,
  DollarSign,
  Download,
  Filter,
  Package,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaleRecord = {
  id: string;
  saleDate: string;
  totalAmount: string;
  paymentType: "CASH" | "CREDIT";
  customerId: string | null;
  customer: { name: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    total: string;
    product: { name: string };
  }>;
};

type ExpenseRecord = {
  id: string;
  expenseDate: string;
  amount: string;
  category: string;
  description: string;
};

type CustomerRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type ApiResponse<T> = { data?: T };

type Tab =
  | "Resumen general"
  | "Ventas"
  | "Productos"
  | "Clientes"
  | "Inventario"
  | "Crecimiento"
  | "Rentabilidad";

const TABS: Tab[] = [
  "Resumen general",
  "Ventas",
  "Productos",
  "Clientes",
  "Inventario",
  "Crecimiento",
  "Rentabilidad",
];

type PeriodMetric = { curr: number; prev: number; pct: number };

type AllMetrics = {
  totalSales: PeriodMetric;
  transactions: PeriodMetric;
  avgTicket: PeriodMetric;
  unitsSold: PeriodMetric;
  newCustomers: PeriodMetric;
  currExpenses: number;
  prevExpenses: number;
};

// ─── Category constants (identical to Inventory view) ─────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Abarrotes: ["arroz", "azúcar", "aceite", "café", "harina", "frijol", "sal", "sopa", "pasta", "cereal", "galleta", "maíz", "lentejas", "atún"],
  Bebidas: ["agua", "refresco", "jugo", "gaseosa", "bebida", "cerveza", "vino", "soda", "té"],
  Lácteos: ["leche", "queso", "yogur", "mantequilla", "crema de leche", "manteca"],
  Carnes: ["pollo", "carne", "res", "cerdo", "pescado", "jamón", "salchicha", "chorizo", "camarón"],
  Limpieza: ["jabón", "detergente", "cloro", "limpiador", "escoba", "trapeador", "desinfectante"],
  "Cuidado Personal": ["shampoo", "pasta dental", "desodorante", "loción", "gel capilar", "pañal"],
  Hogar: ["papel", "servilleta", "bolsa", "foco", "pilas", "vela", "foil"],
  Panadería: ["pan", "bizcocho", "torta", "rosca", "dona"],
  Congelados: ["helado", "hielo", "congelado", "paleta"],
  Snacks: ["papas", "chips", "cacahuate", "pistache", "nuez", "maní", "palomitas", "frituras"],
};

const CHART_ENTRIES: [string, string][] = [
  ["Abarrotes", "#7c3aed"],
  ["Bebidas", "#3b82f6"],
  ["Lácteos", "#22c55e"],
  ["Limpieza", "#f97316"],
  ["Cuidado Personal", "#ec4899"],
  ["Panadería", "#f59e0b"],
  ["Otros", "#94a3b8"],
];

function getProductCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Otros";
}

function getChartCategory(cat: string): string {
  return CHART_ENTRIES.some(([c]) => c === cat) ? cat : "Otros";
}

// ─── Formatters & helpers ─────────────────────────────────────────────────────

const moneyFormatter = new Intl.NumberFormat("es-419", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number | string): string {
  return `$${moneyFormatter.format(Number(value))}`;
}

function formatShortMoney(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

function formatPct(value: number): string {
  return `${value >= 0 ? "▲" : "▼"} ${Math.abs(value).toFixed(1)}%`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function getMonthRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getLastNDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function formatDateAbbrev(d: Date): string {
  return new Intl.DateTimeFormat("es-419", { day: "numeric", month: "short" }).format(d);
}

function formatMonthLabel(offset: number): string {
  const now = new Date();
  const { start, end } = getMonthRange(offset);
  const target = offset === 0 ? now : end;
  const fmt = new Intl.DateTimeFormat("es-419", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt.format(start)} - ${fmt.format(target)}`;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchData<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiResponse<T>;
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Reports() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Resumen general");

  useEffect(() => {
    let isActive = true;

    async function load() {
      const [salesRes, expensesRes, customersRes] = await Promise.allSettled([
        fetchData<SaleRecord[]>("/api/sales"),
        fetchData<ExpenseRecord[]>("/api/expenses"),
        fetchData<CustomerRecord[]>("/api/customers"),
        fetchData<unknown>("/api/cash-movements"),
        fetchData<unknown>("/api/products"),
        fetchData<unknown>("/api/debts"),
        fetchData<unknown>("/api/dashboard/summary"),
      ]);

      if (!isActive) return;

      setSales(salesRes.status === "fulfilled" && salesRes.value ? salesRes.value : []);
      setExpenses(expensesRes.status === "fulfilled" && expensesRes.value ? expensesRes.value : []);
      setCustomers(customersRes.status === "fulfilled" && customersRes.value ? customersRes.value : []);
      setIsLoading(false);
    }

    void load();
    return () => { isActive = false; };
  }, []);

  const currentMonth = useMemo(() => getMonthRange(0), []);
  const previousMonth = useMemo(() => getMonthRange(-1), []);

  const currentSales = useMemo(
    () => sales.filter((s) => { const d = new Date(s.saleDate); return d >= currentMonth.start && d <= currentMonth.end; }),
    [sales, currentMonth]
  );
  const previousSales = useMemo(
    () => sales.filter((s) => { const d = new Date(s.saleDate); return d >= previousMonth.start && d <= previousMonth.end; }),
    [sales, previousMonth]
  );
  const currentExpenses = useMemo(
    () => expenses.filter((e) => { const d = new Date(e.expenseDate); return d >= currentMonth.start && d <= currentMonth.end; }),
    [expenses, currentMonth]
  );
  const previousExpenses = useMemo(
    () => expenses.filter((e) => { const d = new Date(e.expenseDate); return d >= previousMonth.start && d <= previousMonth.end; }),
    [expenses, previousMonth]
  );

  const metrics = useMemo<AllMetrics>(() => {
    const currTotal = currentSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const prevTotal = previousSales.reduce((s, x) => s + Number(x.totalAmount), 0);
    const currCount = currentSales.length;
    const prevCount = previousSales.length;
    const currAvg = currCount > 0 ? currTotal / currCount : 0;
    const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;
    const currUnits = currentSales.reduce((s, x) => s + x.items.reduce((si, it) => si + it.quantity, 0), 0);
    const prevUnits = previousSales.reduce((s, x) => s + x.items.reduce((si, it) => si + it.quantity, 0), 0);
    const currNewCust = customers.filter((c) => { const d = new Date(c.createdAt); return d >= currentMonth.start && d <= currentMonth.end; }).length;
    const prevNewCust = customers.filter((c) => { const d = new Date(c.createdAt); return d >= previousMonth.start && d <= previousMonth.end; }).length;
    const currExp = currentExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const prevExp = previousExpenses.reduce((s, e) => s + Number(e.amount), 0);
    return {
      totalSales: { curr: currTotal, prev: prevTotal, pct: pctChange(currTotal, prevTotal) },
      transactions: { curr: currCount, prev: prevCount, pct: pctChange(currCount, prevCount) },
      avgTicket: { curr: currAvg, prev: prevAvg, pct: pctChange(currAvg, prevAvg) },
      unitsSold: { curr: currUnits, prev: prevUnits, pct: pctChange(currUnits, prevUnits) },
      newCustomers: { curr: currNewCust, prev: prevNewCust, pct: pctChange(currNewCust, prevNewCust) },
      currExpenses: currExp,
      prevExpenses: prevExp,
    };
  }, [currentSales, previousSales, currentExpenses, previousExpenses, customers, currentMonth, previousMonth]);

  const sparklines = useMemo(() => {
    const last7 = getLastNDays(7);
    const dailyTotal = (arr: SaleRecord[]) =>
      last7.map((day) => arr.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0));
    const dailyCount = (arr: SaleRecord[]) =>
      last7.map((day) => arr.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).length);
    const dailyUnits = (arr: SaleRecord[]) =>
      last7.map((day) => arr.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + x.items.reduce((si, it) => si + it.quantity, 0), 0));
    const dailyNewCust = () =>
      last7.map((day) => customers.filter((c) => isSameLocalDay(new Date(c.createdAt), day)).length);
    const dailyAvgTicket = (arr: SaleRecord[]) =>
      last7.map((day) => {
        const ds = arr.filter((s) => isSameLocalDay(new Date(s.saleDate), day));
        if (!ds.length) return 0;
        return ds.reduce((s, x) => s + Number(x.totalAmount), 0) / ds.length;
      });
    return {
      totalSales: dailyTotal(sales),
      transactions: dailyCount(sales),
      avgTicket: dailyAvgTicket(sales),
      unitsSold: dailyUnits(sales),
      newCustomers: dailyNewCust(),
    };
  }, [sales, customers]);

  if (isLoading) {
    return (
      <div className="px-5 py-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-32 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="mb-4 grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50 ${i === 0 ? "col-span-2" : ""}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Reportes</h1>
            <p className="mt-1 text-sm text-slate-500">
              Analiza el rendimiento de tu negocio en tiempo real
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
            >
              <Calendar className="text-slate-400" size={14} />
              {formatMonthLabel(0)}
              <ChevronDown className="text-slate-400" size={13} />
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
              type="button"
            >
              Comparar con: {formatMonthLabel(-1)}
              <ChevronDown className="text-slate-400" size={13} />
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
            >
              <Filter className="text-slate-400" size={14} />
              Filtros avanzados
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
              onClick={() => window.print()}
              type="button"
            >
              <Download size={14} />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="border-b border-slate-200 px-5 py-4 sm:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard
            Icon={DollarSign}
            iconBgClass="bg-violet-50"
            iconColorClass="text-violet-600"
            label="Ventas totales"
            pct={metrics.totalSales.pct}
            sparkColor="#7c3aed"
            sparkData={sparklines.totalSales}
            value={formatMoney(metrics.totalSales.curr)}
          />
          <MetricCard
            Icon={ShoppingBag}
            iconBgClass="bg-emerald-50"
            iconColorClass="text-emerald-600"
            label="Transacciones"
            pct={metrics.transactions.pct}
            sparkColor="#10b981"
            sparkData={sparklines.transactions}
            value={String(metrics.transactions.curr)}
          />
          <MetricCard
            Icon={CreditCardIcon}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-600"
            label="Ticket promedio"
            pct={metrics.avgTicket.pct}
            sparkColor="#3b82f6"
            sparkData={sparklines.avgTicket}
            value={formatMoney(metrics.avgTicket.curr)}
          />
          <MetricCard
            Icon={Package}
            iconBgClass="bg-orange-50"
            iconColorClass="text-orange-600"
            label="Productos vendidos"
            pct={metrics.unitsSold.pct}
            sparkColor="#f97316"
            sparkData={sparklines.unitsSold}
            value={String(metrics.unitsSold.curr)}
          />
          <MetricCard
            Icon={Users}
            iconBgClass="bg-rose-50"
            iconColorClass="text-rose-600"
            label="Nuevos clientes"
            pct={metrics.newCustomers.pct}
            sparkColor="#ef4444"
            sparkData={sparklines.newCustomers}
            value={String(metrics.newCustomers.curr)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-5 sm:px-8">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab
                  ? "flex-shrink-0 border-b-2 border-violet-600 px-4 py-3 text-sm font-semibold text-violet-700"
                  : "flex-shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800"
              }
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-5 py-5 sm:px-8">
        {activeTab === "Resumen general" ? (
          <ResumenGeneralTab
            customers={customers}
            currentSales={currentSales}
            metrics={metrics}
            previousSales={previousSales}
            sales={sales}
          />
        ) : (
          <ProximamenteTab tab={activeTab} />
        )}
      </div>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  Icon,
  iconBgClass,
  iconColorClass,
  label,
  value,
  pct,
  sparkData,
  sparkColor,
}: {
  Icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  label: string;
  value: string;
  pct: number;
  sparkData: number[];
  sparkColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
          <Icon className={iconColorClass} size={16} />
        </div>
        <MiniSparkline color={sparkColor} data={sparkData} />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-slate-950">{value}</p>
      <p className={`mt-1 text-xs font-medium ${pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
        {formatPct(pct)} vs período anterior
      </p>
    </div>
  );
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64;
  const h = 24;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h * 0.9 - (v / max) * h * 0.8;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg height={h} viewBox={`0 0 ${w} ${h}`} width={w} xmlns="http://www.w3.org/2000/svg">
      <polyline
        fill="none"
        points={points}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

// ─── ResumenGeneralTab ────────────────────────────────────────────────────────

function ResumenGeneralTab({
  sales,
  currentSales,
  previousSales,
  customers,
  metrics,
}: {
  sales: SaleRecord[];
  currentSales: SaleRecord[];
  previousSales: SaleRecord[];
  customers: CustomerRecord[];
  metrics: AllMetrics;
}) {
  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2">
          <SalesEvolutionPanel sales={sales} />
        </div>
        <CategoryDonutPanel sales={sales} />
        <GrowthSummaryPanel metrics={metrics} />
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-4 gap-4">
        <PaymentMethodPanel sales={currentSales} />
        <TopProductsPanel sales={sales} />
        <TopCustomersPanel customers={customers} sales={sales} />
        <ProfitabilityPanel metrics={metrics} previousSales={previousSales} />
      </div>
    </div>
  );
}

// ─── SalesEvolutionPanel ──────────────────────────────────────────────────────

function SalesEvolutionPanel({ sales }: { sales: SaleRecord[] }) {
  const last21 = useMemo(() => getLastNDays(21), []);
  const prev21 = useMemo(() => getLastNDays(42).slice(0, 21), []);

  const currentValues = useMemo(
    () =>
      last21.map((day) =>
        sales.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0)
      ),
    [sales, last21]
  );

  const previousValues = useMemo(
    () =>
      prev21.map((day) =>
        sales.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0)
      ),
    [sales, prev21]
  );

  const maxValue = Math.max(...currentValues, ...previousValues, 1000);
  const yMax = Math.ceil(maxValue / 1000) * 1000;

  const pLeft = 48;
  const pRight = 12;
  const pTop = 12;
  const pBottom = 36;
  const svgW = 520;
  const svgH = 180;
  const cW = svgW - pLeft - pRight;
  const cH = svgH - pTop - pBottom;

  function xOf(i: number) {
    return pLeft + (i / 20) * cW;
  }
  function yOf(v: number) {
    return pTop + cH * (1 - v / yMax);
  }

  const currentPath = currentValues
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`)
    .join(" ");
  const previousPath = previousValues
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`)
    .join(" ");

  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-950">Evolución de ventas</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-5 rounded-full bg-violet-500" />
              Ventas actuales
            </span>
            <span className="flex items-center gap-1">
              <span className="block h-0.5 w-5" style={{ background: "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 7px)" }} />
              Período anterior
            </span>
          </div>
          <button className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50" type="button">
            Por día
            <ChevronDown className="ml-1 inline" size={11} />
          </button>
        </div>
      </div>
      <svg className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
        {gridFractions.map((f, i) => {
          const y = yOf(yMax * f);
          return (
            <g key={i}>
              <line stroke="#f1f5f9" strokeWidth="1" x1={pLeft} x2={pLeft + cW} y1={y} y2={y} />
              <text dominantBaseline="middle" fill="#94a3b8" fontSize="9" textAnchor="end" x={pLeft - 4} y={y}>
                {formatShortMoney(yMax * f)}
              </text>
            </g>
          );
        })}
        <path d={previousPath} fill="none" stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth="1.5" />
        <path d={currentPath} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        {last21
          .filter((_, i) => i % 4 === 0 || i === 20)
          .map((day, _, arr) => {
            const i = last21.indexOf(day);
            const x = xOf(i);
            return (
              <text
                dominantBaseline="hanging"
                fill="#94a3b8"
                fontSize="9"
                key={i}
                textAnchor="middle"
                x={x}
                y={pTop + cH + 6}
              >
                {formatDateAbbrev(day)}
              </text>
            );
          })}
      </svg>
    </div>
  );
}

// ─── Donut helpers ────────────────────────────────────────────────────────────

function buildDonutSegments(data: { value: number; color: string; label: string }[]) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 36;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return data.map((d) => {
    const pct = total > 0 ? d.value / total : 0;
    const result = { ...d, pct, offset, r, circ };
    offset += pct;
    return result;
  });
}

// ─── CategoryDonutPanel ───────────────────────────────────────────────────────

function CategoryDonutPanel({ sales }: { sales: SaleRecord[] }) {
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const rawCat = getProductCategory(item.product.name);
        const cat = getChartCategory(rawCat);
        totals[cat] = (totals[cat] ?? 0) + Number(item.total);
      }
    }
    return totals;
  }, [sales]);

  const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const segments = buildDonutSegments(
    CHART_ENTRIES.map(([cat, color]) => ({
      label: cat,
      value: categoryTotals[cat] ?? 0,
      color,
    })).filter((d) => d.value > 0)
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Ventas por categoría</h3>
      {total === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Sin datos</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg">
              <circle cx={50} cy={50} fill="none" r={36} stroke="#f1f5f9" strokeWidth={14} />
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx={50}
                  cy={50}
                  fill="none"
                  r={seg.r}
                  stroke={seg.color}
                  strokeDasharray={`${seg.pct * seg.circ} ${seg.circ}`}
                  strokeDashoffset={`${-(seg.offset * seg.circ)}`}
                  strokeWidth={14}
                  transform="rotate(-90 50 50)"
                />
              ))}
              <text dominantBaseline="middle" fill="#94a3b8" fontSize="7" textAnchor="middle" x={50} y={46}>
                Total
              </text>
              <text dominantBaseline="middle" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle" x={50} y={56}>
                {formatShortMoney(total)}
              </text>
            </svg>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {segments.map((seg) => (
              <div className="flex items-center justify-between gap-1 text-xs" key={seg.label}>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: seg.color }} />
                  <span className="truncate text-slate-600">{seg.label}</span>
                </div>
                <span className="flex-shrink-0 font-medium text-slate-700">
                  {(seg.pct * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GrowthSummaryPanel ───────────────────────────────────────────────────────

function GrowthSummaryPanel({ metrics }: { metrics: AllMetrics }) {
  const rows: { label: string; metric: PeriodMetric; isMoney: boolean }[] = [
    { label: "Ventas", metric: metrics.totalSales, isMoney: true },
    { label: "Transacciones", metric: metrics.transactions, isMoney: false },
    { label: "Ticket promedio", metric: metrics.avgTicket, isMoney: true },
    { label: "Productos vendidos", metric: metrics.unitsSold, isMoney: false },
    { label: "Nuevos clientes", metric: metrics.newCustomers, isMoney: false },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen de crecimiento</h3>
      <div className="space-y-2.5">
        {rows.map((row) => {
          const diff = row.metric.curr - row.metric.prev;
          const isPos = diff >= 0;
          return (
            <div className="flex items-center justify-between text-xs" key={row.label}>
              <span className="text-slate-600">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPct(row.metric.pct)}
                </span>
                <span className={`${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                  {isPos ? "+" : ""}
                  {row.isMoney ? formatMoney(diff) : String(Math.round(diff))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PaymentMethodPanel ───────────────────────────────────────────────────────

function PaymentMethodPanel({ sales }: { sales: SaleRecord[] }) {
  const cashTotal = sales.filter((s) => s.paymentType === "CASH").reduce((s, x) => s + Number(x.totalAmount), 0);
  const creditTotal = sales.filter((s) => s.paymentType === "CREDIT").reduce((s, x) => s + Number(x.totalAmount), 0);
  const total = cashTotal + creditTotal;

  const segmentData = [
    { label: "Efectivo", value: cashTotal, color: "#7c3aed" },
    { label: "Fiado", value: creditTotal, color: "#3b82f6" },
    { label: "Tarjeta", value: 0, color: "#10b981" },
    { label: "Otros", value: 0, color: "#f97316" },
  ];

  const segments = buildDonutSegments(segmentData.filter((d) => d.value > 0));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Ventas por método de pago</h3>
      {total === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Sin ventas este período</p>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg">
            <circle cx={50} cy={50} fill="none" r={36} stroke="#f1f5f9" strokeWidth={14} />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={50}
                cy={50}
                fill="none"
                r={seg.r}
                stroke={seg.color}
                strokeDasharray={`${seg.pct * seg.circ} ${seg.circ}`}
                strokeDashoffset={`${-(seg.offset * seg.circ)}`}
                strokeWidth={14}
                transform="rotate(-90 50 50)"
              />
            ))}
            <text dominantBaseline="middle" fill="#94a3b8" fontSize="7" textAnchor="middle" x={50} y={46}>
              Total
            </text>
            <text dominantBaseline="middle" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle" x={50} y={56}>
              {formatShortMoney(total)}
            </text>
          </svg>
          <div className="w-full space-y-1.5">
            {segmentData.map((d) => (
              <div className="flex items-center justify-between text-xs" key={d.label}>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{formatMoney(d.value)}</span>
                  <span className="w-8 text-right text-slate-400">
                    {total > 0 ? ((d.value / total) * 100).toFixed(0) : "0"}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TopProductsPanel ─────────────────────────────────────────────────────────

function TopProductsPanel({ sales }: { sales: SaleRecord[] }) {
  const topProducts = useMemo(() => {
    const byName = new Map<string, { name: string; units: number; total: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const name = item.product.name;
        const existing = byName.get(name) ?? { name, units: 0, total: 0 };
        byName.set(name, {
          name,
          units: existing.units + item.quantity,
          total: existing.total + Number(item.total),
        });
      }
    }
    return [...byName.values()].sort((a, b) => b.units - a.units).slice(0, 5);
  }, [sales]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Top productos más vendidos</h3>
      {topProducts.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Sin datos de ventas</p>
      ) : (
        <>
          <div className="space-y-2">
            {topProducts.map((prod, i) => (
              <div className="flex items-center gap-2" key={prod.name}>
                <span className="w-4 flex-shrink-0 text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                  {prod.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">{prod.name}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-semibold text-slate-900">{prod.units} uds.</p>
                  <p className="text-xs text-slate-400">{formatMoney(prod.total)}</p>
                </div>
              </div>
            ))}
          </div>
          <a className="mt-3 block text-xs font-medium text-violet-600 hover:text-violet-800" href="/products">
            Ver todos los productos →
          </a>
        </>
      )}
    </div>
  );
}

// ─── TopCustomersPanel ────────────────────────────────────────────────────────

function TopCustomersPanel({
  sales,
  customers,
}: {
  sales: SaleRecord[];
  customers: CustomerRecord[];
}) {
  const topCustomers = useMemo(() => {
    const byCustomer = new Map<string, { name: string; count: number; total: number }>();
    for (const sale of sales) {
      if (!sale.customerId || !sale.customer) continue;
      const key = sale.customerId;
      const existing = byCustomer.get(key) ?? { name: sale.customer.name, count: 0, total: 0 };
      byCustomer.set(key, {
        name: sale.customer.name,
        count: existing.count + 1,
        total: existing.total + Number(sale.totalAmount),
      });
    }
    return [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Clientes con más compras</h3>
      {topCustomers.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">
          {customers.length === 0 ? "Sin clientes registrados" : "Sin ventas con cliente asignado"}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {topCustomers.map((cust, i) => (
              <div className="flex items-center gap-2" key={cust.name}>
                <span className="w-4 flex-shrink-0 text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">{cust.name}</p>
                  <p className="text-xs text-slate-400">{cust.count} compra{cust.count !== 1 ? "s" : ""}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-slate-900">
                  {formatMoney(cust.total)}
                </span>
              </div>
            ))}
          </div>
          <a className="mt-3 block text-xs font-medium text-violet-600 hover:text-violet-800" href="/customers">
            Ver todos los clientes →
          </a>
        </>
      )}
    </div>
  );
}

// ─── ProfitabilityPanel ───────────────────────────────────────────────────────

function ProfitabilityPanel({
  metrics,
  previousSales,
}: {
  metrics: AllMetrics;
  previousSales: SaleRecord[];
}) {
  const currProfit = metrics.totalSales.curr - metrics.currExpenses;
  const prevProfit = metrics.totalSales.prev - metrics.prevExpenses;
  const profitPct = pctChange(currProfit, prevProfit);
  const currMargin = metrics.totalSales.curr > 0 ? (currProfit / metrics.totalSales.curr) * 100 : 0;
  const prevMargin = metrics.totalSales.prev > 0 ? (prevProfit / metrics.totalSales.prev) * 100 : 0;
  const marginPct = pctChange(currMargin, prevMargin);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Rentabilidad del período</h3>
      <div className="space-y-4">
        <div>
          <p className="text-xs text-slate-500">Ganancia bruta</p>
          <p className={`text-2xl font-bold ${currProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatMoney(currProfit)}
          </p>
          <p className={`mt-0.5 text-xs font-medium ${profitPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatPct(profitPct)} vs período anterior
          </p>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">Margen de ganancia</p>
          <p className={`text-2xl font-bold ${currMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {currMargin.toFixed(1)}%
          </p>
          <p className={`mt-0.5 text-xs font-medium ${marginPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatPct(marginPct)} vs período anterior
          </p>
        </div>
        <div className="border-t border-slate-100 pt-2">
          <a className="text-xs font-medium text-violet-600 hover:text-violet-800" href="/reports">
            Ver análisis de rentabilidad →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── ProximamenteTab ──────────────────────────────────────────────────────────

function ProximamenteTab({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
        <span className="text-3xl">📊</span>
      </div>
      <h3 className="text-base font-semibold text-slate-950">{tab}</h3>
      <p className="mt-2 text-sm text-slate-500">Este reporte estará disponible próximamente.</p>
    </div>
  );
}
