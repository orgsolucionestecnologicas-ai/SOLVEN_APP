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
import Link from "next/link";
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

type ProductRecord = {
  id: string;
  name: string;
  costPrice: string;
  salePrice: string;
  stock: number;
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
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Resumen general");

  useEffect(() => {
    let isActive = true;

    async function load() {
      const [salesRes, expensesRes, customersRes, , productsRes] = await Promise.allSettled([
        fetchData<SaleRecord[]>("/api/sales"),
        fetchData<ExpenseRecord[]>("/api/expenses"),
        fetchData<CustomerRecord[]>("/api/customers"),
        fetchData<unknown>("/api/cash-movements"),
        fetchData<ProductRecord[]>("/api/products"),
        fetchData<unknown>("/api/debts"),
        fetchData<unknown>("/api/dashboard/summary"),
      ]);

      if (!isActive) return;

      setSales(salesRes.status === "fulfilled" && salesRes.value ? salesRes.value : []);
      setExpenses(expensesRes.status === "fulfilled" && expensesRes.value ? expensesRes.value : []);
      setCustomers(customersRes.status === "fulfilled" && customersRes.value ? customersRes.value : []);
      setProducts(productsRes.status === "fulfilled" && productsRes.value ? productsRes.value : []);
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
        ) : activeTab === "Ventas" ? (
          <VentasTab sales={sales} />
        ) : activeTab === "Productos" ? (
          <ProductosTab products={products} sales={sales} />
        ) : activeTab === "Clientes" ? (
          <ClientesTab customers={customers} sales={sales} />
        ) : activeTab === "Inventario" ? (
          <InventarioTab products={products} />
        ) : activeTab === "Crecimiento" ? (
          <CrecimientoTab sales={sales} />
        ) : activeTab === "Rentabilidad" ? (
          <RentabilidadTab expenses={expenses} sales={sales} />
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
      {/* Row 3 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-2">
          <SalesHeatmapPanel sales={sales} />
        </div>
        <MonthlyComparisonPanel sales={sales} />
        <KeyIndicatorsPanel sales={sales} />
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
          <Link className="mt-3 block text-xs font-medium text-violet-600 hover:text-violet-800" href="/customers">
            Ver todos los clientes →
          </Link>
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

// ─── SalesHeatmapPanel ────────────────────────────────────────────────────────

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOURS = [6, 8, 10, 12, 14, 16, 18, 20];

function SalesHeatmapPanel({ sales }: { sales: SaleRecord[] }) {
  const grid = useMemo(() => {
    const counts: number[][] = Array.from({ length: HOURS.length }, () => Array(7).fill(0));
    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      const hour = d.getHours();
      const dow = d.getDay();
      const hi = HOURS.findIndex((h, i) => h <= hour && (HOURS[i + 1] === undefined || HOURS[i + 1] > hour));
      if (hi !== -1) counts[hi][dow]++;
    }
    return counts;
  }, [sales]);

  const maxCount = Math.max(...grid.flat(), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Mapa de calor de ventas</h3>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex gap-0.5 pl-8 mb-0.5">
            {WEEKDAYS.map((d) => (
              <div className="w-8 text-center text-[10px] text-slate-400" key={d}>{d}</div>
            ))}
          </div>
          {HOURS.map((h, hi) => (
            <div className="flex items-center gap-0.5 mb-0.5" key={h}>
              <div className="w-7 flex-shrink-0 text-right pr-1 text-[10px] text-slate-400">{h}h</div>
              {WEEKDAYS.map((_, dow) => {
                const val = grid[hi][dow];
                const intensity = val / maxCount;
                const bg =
                  intensity === 0
                    ? "#f8fafc"
                    : intensity < 0.25
                    ? "#ede9fe"
                    : intensity < 0.5
                    ? "#c4b5fd"
                    : intensity < 0.75
                    ? "#7c3aed"
                    : "#4c1d95";
                return (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded text-[9px] font-medium"
                    key={dow}
                    style={{ background: bg, color: intensity > 0.4 ? "#fff" : "#6d28d9" }}
                    title={`${WEEKDAYS[dow]} ${h}h: ${val} venta${val !== 1 ? "s" : ""}`}
                  >
                    {val > 0 ? val : ""}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="mt-2 flex items-center gap-1 pl-8">
            <span className="text-[10px] text-slate-400 mr-1">Menos</span>
            {["#f8fafc", "#ede9fe", "#c4b5fd", "#7c3aed", "#4c1d95"].map((c) => (
              <div className="h-3 w-5 rounded-sm" key={c} style={{ background: c }} />
            ))}
            <span className="text-[10px] text-slate-400 ml-1">Más</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MonthlyComparisonPanel ───────────────────────────────────────────────────

function MonthlyComparisonPanel({ sales }: { sales: SaleRecord[] }) {
  const data = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const offset = i - 11;
      const { start, end } = getMonthRange(offset);
      const monthSales = sales.filter((s) => {
        const d = new Date(s.saleDate);
        return d >= start && d <= end;
      });
      const curr = monthSales.reduce((s, x) => s + Number(x.totalAmount), 0);
      const label = new Intl.DateTimeFormat("es-419", { month: "short" }).format(start);
      const isCurrent = offset === 0;
      return { label, curr, isCurrent };
    });
  }, [sales]);

  const maxVal = Math.max(...data.map((d) => d.curr), 1);

  const svgW = 300;
  const svgH = 120;
  const pLeft = 8;
  const pRight = 8;
  const pTop = 8;
  const pBottom = 28;
  const barW = (svgW - pLeft - pRight) / 12 - 2;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Comparación mensual</h3>
      <svg className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
        {data.map((d, i) => {
          const x = pLeft + i * ((svgW - pLeft - pRight) / 12);
          const barH = ((svgH - pTop - pBottom) * d.curr) / maxVal;
          const y = pTop + (svgH - pTop - pBottom) - barH;
          return (
            <g key={i}>
              <rect
                fill={d.isCurrent ? "#7c3aed" : "#e2e8f0"}
                height={Math.max(barH, 2)}
                rx="2"
                width={barW}
                x={x + 1}
                y={y}
              />
              <text
                dominantBaseline="hanging"
                fill={d.isCurrent ? "#7c3aed" : "#94a3b8"}
                fontSize="8"
                fontWeight={d.isCurrent ? "700" : "400"}
                textAnchor="middle"
                x={x + barW / 2 + 1}
                y={svgH - pBottom + 4}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-violet-600" />
          Mes actual
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-slate-200" />
          Meses anteriores
        </span>
      </div>
    </div>
  );
}

// ─── KeyIndicatorsPanel ───────────────────────────────────────────────────────

function KeyIndicatorsPanel({ sales }: { sales: SaleRecord[] }) {
  const indicators = useMemo(() => {
    if (sales.length === 0) return null;

    const byDay = new Map<string, number>();
    const byHour: number[] = Array(24).fill(0);
    const byCat: Record<string, number> = {};

    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      const dayKey = d.toLocaleDateString("es-419", { weekday: "long" });
      byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + Number(sale.totalAmount));
      byHour[d.getHours()] += Number(sale.totalAmount);
      for (const item of sale.items) {
        const cat = getProductCategory(item.product.name);
        byCat[cat] = (byCat[cat] ?? 0) + Number(item.total);
      }
    }

    const bestDay = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    const peakHour = byHour.reduce((best, v, i) => (v > byHour[best] ? i : best), 0);
    const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const bestCat = sortedCats[0];
    const worstCat = sortedCats[sortedCats.length - 1];

    return { bestDay, peakHour, bestCat, worstCat };
  }, [sales]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-950">Indicadores clave</h3>
      {!indicators ? (
        <p className="py-4 text-center text-xs text-slate-400">Sin datos</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg bg-violet-50 p-2.5">
            <p className="text-[10px] font-medium text-violet-500 uppercase tracking-wide">Mejor día</p>
            <p className="mt-0.5 text-sm font-bold text-violet-900 capitalize">{indicators.bestDay?.[0] ?? "—"}</p>
            <p className="text-xs text-violet-600">{formatMoney(indicators.bestDay?.[1] ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-wide">Hora pico</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-900">
              {indicators.peakHour}:00 – {indicators.peakHour + 1}:00
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-2.5">
            <p className="text-[10px] font-medium text-blue-500 uppercase tracking-wide">Mejor categoría</p>
            <p className="mt-0.5 text-sm font-bold text-blue-900">{indicators.bestCat?.[0] ?? "—"}</p>
            <p className="text-xs text-blue-600">{formatMoney(indicators.bestCat?.[1] ?? 0)}</p>
          </div>
          {indicators.worstCat && indicators.worstCat[0] !== indicators.bestCat?.[0] && (
            <div className="rounded-lg bg-rose-50 p-2.5">
              <p className="text-[10px] font-medium text-rose-500 uppercase tracking-wide">Menor categoría</p>
              <p className="mt-0.5 text-sm font-bold text-rose-900">{indicators.worstCat[0]}</p>
              <p className="text-xs text-rose-600">{formatMoney(indicators.worstCat[1])}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VentasTab ────────────────────────────────────────────────────────────────

function VentasTab({ sales }: { sales: SaleRecord[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sales
      .slice()
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .filter((s) => {
        if (!q) return true;
        const folio = s.id.slice(-6).toUpperCase();
        return folio.includes(q.toUpperCase()) || (s.customer?.name.toLowerCase().includes(q) ?? false);
      });
  }, [sales, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const last30 = useMemo(() => getLastNDays(30), []);
  const dailyRevenue = useMemo(
    () =>
      last30.map((day) =>
        sales.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0)
      ),
    [sales, last30]
  );

  const maxRev = Math.max(...dailyRevenue, 1);
  const svgW = 600;
  const svgH = 140;
  const pL = 44;
  const pR = 12;
  const pT = 12;
  const pB = 28;
  const cW = svgW - pL - pR;
  const cH = svgH - pT - pB;

  const linePath = dailyRevenue
    .map((v, i) => {
      const x = pL + (i / 29) * cW;
      const y = pT + cH * (1 - v / maxRev);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">Evolución de ventas — últimos 30 días</h3>
        <svg className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = pT + cH * (1 - f);
            return (
              <g key={i}>
                <line stroke="#f1f5f9" strokeWidth="1" x1={pL} x2={pL + cW} y1={y} y2={y} />
                <text dominantBaseline="middle" fill="#94a3b8" fontSize="9" textAnchor="end" x={pL - 4} y={y}>
                  {formatShortMoney(maxRev * f)}
                </text>
              </g>
            );
          })}
          <path d={linePath} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          {last30
            .filter((_, i) => i % 6 === 0 || i === 29)
            .map((day, _, arr) => {
              const i = last30.indexOf(day);
              const x = pL + (i / 29) * cW;
              return (
                <text dominantBaseline="hanging" fill="#94a3b8" fontSize="9" key={i} textAnchor="middle" x={x} y={pT + cH + 6}>
                  {formatDateAbbrev(day)}
                </text>
              );
            })}
        </svg>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-950">Historial de ventas</h3>
          <input
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Buscar por folio o cliente…"
            type="text"
            value={search}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Folio</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fecha</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Cliente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Productos</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Pago</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-slate-400" colSpan={7}>
                    {search ? "Sin resultados" : "Sin ventas registradas"}
                  </td>
                </tr>
              ) : (
                paginated.map((sale) => (
                  <tr className="border-b border-slate-50 hover:bg-slate-50" key={sale.id}>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      #{sale.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {new Date(sale.saleDate).toLocaleDateString("es-419", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">
                      {sale.customer?.name ?? <span className="text-slate-400">Sin cliente</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {sale.items.length} ítem{sale.items.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {sale.paymentType === "CASH" ? "Efectivo" : "Fiado"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">
                      {formatMoney(sale.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Completada
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              {filtered.length} ventas · página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                Anterior
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ProductosTab ─────────────────────────────────────────────────────────────

function ProductosTab({ sales, products }: { sales: SaleRecord[]; products: ProductRecord[] }) {
  const productStats = useMemo(() => {
    const byName = new Map<string, { name: string; category: string; units: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const name = item.product.name;
        const category = getProductCategory(name);
        const existing = byName.get(name) ?? { name, category, units: 0, revenue: 0 };
        byName.set(name, {
          name,
          category,
          units: existing.units + item.quantity,
          revenue: existing.revenue + Number(item.total),
        });
      }
    }
    return [...byName.values()].sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const totalRevenue = productStats.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = productStats.reduce((s, p) => s + p.units, 0);

  const catColors: Record<string, string> = Object.fromEntries(CHART_ENTRIES);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Productos en catálogo</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{products.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Unidades vendidas</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{totalUnits}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ingresos totales</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(totalRevenue)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-950">Rendimiento por producto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Producto</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Categoría</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Unidades</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Ingresos</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">% del total</th>
              </tr>
            </thead>
            <tbody>
              {productStats.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-slate-400" colSpan={6}>Sin ventas registradas</td>
                </tr>
              ) : (
                productStats.map((prod, i) => {
                  const color = catColors[prod.category] ?? "#94a3b8";
                  return (
                    <tr className="border-b border-slate-50 hover:bg-slate-50" key={prod.name}>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{prod.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: `${color}20`, color }}
                        >
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-700">{prod.units}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">{formatMoney(prod.revenue)}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-500">
                        {totalRevenue > 0 ? ((prod.revenue / totalRevenue) * 100).toFixed(1) : "0"}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ClientesTab ──────────────────────────────────────────────────────────────

function ClientesTab({ sales, customers }: { sales: SaleRecord[]; customers: CustomerRecord[] }) {
  const customerStats = useMemo(() => {
    const byId = new Map<string, { name: string; purchases: number; total: number; lastDate: Date }>();
    for (const sale of sales) {
      if (!sale.customerId || !sale.customer) continue;
      const existing = byId.get(sale.customerId) ?? {
        name: sale.customer.name,
        purchases: 0,
        total: 0,
        lastDate: new Date(0),
      };
      const saleDate = new Date(sale.saleDate);
      byId.set(sale.customerId, {
        name: sale.customer.name,
        purchases: existing.purchases + 1,
        total: existing.total + Number(sale.totalAmount),
        lastDate: saleDate > existing.lastDate ? saleDate : existing.lastDate,
      });
    }
    return [...byId.values()].sort((a, b) => b.total - a.total);
  }, [sales]);

  function getSegment(purchases: number): { label: string; color: string } {
    if (purchases >= 10) return { label: "VIP", color: "#7c3aed" };
    if (purchases >= 5) return { label: "Frecuente", color: "#3b82f6" };
    if (purchases >= 2) return { label: "Regular", color: "#10b981" };
    return { label: "Nuevo", color: "#f97316" };
  }

  const totalSpent = customerStats.reduce((s, c) => s + c.total, 0);
  const totalPurchases = customerStats.reduce((s, c) => s + c.purchases, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Clientes registrados</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total compras</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{totalPurchases}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ingresos de clientes</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(totalSpent)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-950">Clientes por valor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Cliente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Segmento</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Compras</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Total gastado</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-slate-400" colSpan={6}>Sin ventas con cliente asignado</td>
                </tr>
              ) : (
                customerStats.map((cust, i) => {
                  const seg = getSegment(cust.purchases);
                  return (
                    <tr className="border-b border-slate-50 hover:bg-slate-50" key={cust.name}>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{cust.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: `${seg.color}20`, color: seg.color }}
                        >
                          {seg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-700">{cust.purchases}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">{formatMoney(cust.total)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {cust.lastDate.getTime() > 0
                          ? cust.lastDate.toLocaleDateString("es-419", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── InventarioTab ────────────────────────────────────────────────────────────

function InventarioTab({ products }: { products: ProductRecord[] }) {
  const rows = useMemo(
    () =>
      products
        .map((p) => {
          const category = getProductCategory(p.name);
          const cost = Number(p.costPrice);
          const sale = Number(p.salePrice);
          const value = cost * p.stock;
          const status =
            p.stock === 0
              ? { label: "Agotado", color: "#ef4444" }
              : p.stock < 5
              ? { label: "Bajo", color: "#f97316" }
              : { label: "Normal", color: "#10b981" };
          return { ...p, category, cost, sale, value, status };
        })
        .sort((a, b) => a.stock - b.stock),
    [products]
  );

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const lowStock = rows.filter((r) => r.stock < 5).length;
  const outOfStock = rows.filter((r) => r.stock === 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Valor del inventario</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(totalValue)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Stock bajo</p>
          <p className={`mt-1 text-2xl font-bold ${lowStock > 0 ? "text-orange-600" : "text-slate-950"}`}>{lowStock}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Sin stock</p>
          <p className={`mt-1 text-2xl font-bold ${outOfStock > 0 ? "text-rose-600" : "text-slate-950"}`}>{outOfStock}</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-950">Estado del inventario</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Producto</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Categoría</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Stock</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Costo</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Precio</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Valor total</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-xs text-slate-400" colSpan={7}>Sin productos registrados</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr className="border-b border-slate-50 hover:bg-slate-50" key={row.id}>
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.category}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">{row.stock}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-600">{formatMoney(row.cost)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-600">{formatMoney(row.sale)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-slate-900">{formatMoney(row.value)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: `${row.status.color}20`, color: row.status.color }}
                      >
                        {row.status.label}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CrecimientoTab ───────────────────────────────────────────────────────────

function CrecimientoTab({ sales }: { sales: SaleRecord[] }) {
  const last30 = useMemo(() => getLastNDays(30), []);

  const { cumulative, daily } = useMemo(() => {
    const d = last30.map((day) =>
      sales.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0)
    );
    let acc = 0;
    const c = d.map((v) => { acc += v; return acc; });
    return { daily: d, cumulative: c };
  }, [sales, last30]);

  const prev30 = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (59 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return days.map((day) =>
      sales.filter((s) => isSameLocalDay(new Date(s.saleDate), day)).reduce((s, x) => s + Number(x.totalAmount), 0)
    );
  }, [sales]);

  const currTotal = daily.reduce((s, v) => s + v, 0);
  const prevTotal = prev30.reduce((s, v) => s + v, 0);
  const growthPct = pctChange(currTotal, prevTotal);
  const bestDay = Math.max(...daily, 0);
  const avgDay = daily.length > 0 ? currTotal / daily.length : 0;
  const activeDays = daily.filter((v) => v > 0).length;

  const maxCumul = Math.max(...cumulative, 1);
  const svgW = 600;
  const svgH = 160;
  const pL = 52;
  const pR = 12;
  const pT = 12;
  const pB = 28;
  const cW = svgW - pL - pR;
  const cH = svgH - pT - pB;

  const linePath = cumulative
    .map((v, i) => {
      const x = pL + (i / 29) * cW;
      const y = pT + cH * (1 - v / maxCumul);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const kpis = [
    { label: "Ingresos 30 días", value: formatMoney(currTotal), delta: formatPct(growthPct), pos: growthPct >= 0 },
    { label: "Mejor día", value: formatMoney(bestDay), delta: null, pos: true },
    { label: "Promedio diario", value: formatMoney(avgDay), delta: null, pos: true },
    { label: "Días activos", value: `${activeDays} / 30`, delta: null, pos: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={k.label}>
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-950">{k.value}</p>
            {k.delta && (
              <p className={`mt-1 text-xs font-medium ${k.pos ? "text-emerald-600" : "text-rose-600"}`}>{k.delta} vs período ant.</p>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">Ventas acumuladas — últimos 30 días</h3>
        <svg className="w-full" viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = pT + cH * (1 - f);
            return (
              <g key={i}>
                <line stroke="#f1f5f9" strokeWidth="1" x1={pL} x2={pL + cW} y1={y} y2={y} />
                <text dominantBaseline="middle" fill="#94a3b8" fontSize="9" textAnchor="end" x={pL - 4} y={y}>
                  {formatShortMoney(maxCumul * f)}
                </text>
              </g>
            );
          })}
          <path d={linePath} fill="none" stroke="#7c3aed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
          {last30
            .filter((_, i) => i % 6 === 0 || i === 29)
            .map((day) => {
              const i = last30.indexOf(day);
              const x = pL + (i / 29) * cW;
              return (
                <text dominantBaseline="hanging" fill="#94a3b8" fontSize="9" key={i} textAnchor="middle" x={x} y={pT + cH + 6}>
                  {formatDateAbbrev(day)}
                </text>
              );
            })}
        </svg>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">Métricas de crecimiento</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Crecimiento vs mes anterior", value: growthPct, isPercent: true },
            { label: "Variación en ingresos", value: currTotal - prevTotal, isMoney: true },
          ].map((m) => (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5" key={m.label}>
              <span className="text-xs text-slate-600">{m.label}</span>
              <span
                className={`text-sm font-bold ${
                  "value" in m && m.value >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {"isPercent" in m && m.isPercent ? formatPct(m.value) : formatMoney(m.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RentabilidadTab ──────────────────────────────────────────────────────────

function RentabilidadTab({ sales, expenses }: { sales: SaleRecord[]; expenses: ExpenseRecord[] }) {
  const { start: currStart, end: currEnd } = useMemo(() => getMonthRange(0), []);

  const currRevenue = useMemo(
    () =>
      sales
        .filter((s) => { const d = new Date(s.saleDate); return d >= currStart && d <= currEnd; })
        .reduce((s, x) => s + Number(x.totalAmount), 0),
    [sales, currStart, currEnd]
  );

  const currExpenses = useMemo(
    () =>
      expenses
        .filter((e) => { const d = new Date(e.expenseDate); return d >= currStart && d <= currEnd; })
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses, currStart, currEnd]
  );

  const profit = currRevenue - currExpenses;
  const margin = currRevenue > 0 ? (profit / currRevenue) * 100 : 0;

  const donutData = [
    { label: "Ganancia", value: Math.max(profit, 0), color: "#7c3aed" },
    { label: "Gastos", value: currExpenses, color: "#f1f5f9" },
  ];
  const donutSegments = buildDonutSegments(donutData.filter((d) => d.value > 0));

  const catRevenue = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const sale of sales) {
      const d = new Date(sale.saleDate);
      if (d < currStart || d > currEnd) continue;
      for (const item of sale.items) {
        const cat = getChartCategory(getProductCategory(item.product.name));
        byCat[cat] = (byCat[cat] ?? 0) + Number(item.total);
      }
    }
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  }, [sales, currStart, currEnd]);

  const expByCategory = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const exp of expenses) {
      const d = new Date(exp.expenseDate);
      if (d < currStart || d > currEnd) continue;
      byCat[exp.category] = (byCat[exp.category] ?? 0) + Number(exp.amount);
    }
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  }, [expenses, currStart, currEnd]);

  const paymentBreakdown = useMemo(() => {
    const cash = sales
      .filter((s) => { const d = new Date(s.saleDate); return d >= currStart && d <= currEnd && s.paymentType === "CASH"; })
      .reduce((s, x) => s + Number(x.totalAmount), 0);
    const credit = sales
      .filter((s) => { const d = new Date(s.saleDate); return d >= currStart && d <= currEnd && s.paymentType === "CREDIT"; })
      .reduce((s, x) => s + Number(x.totalAmount), 0);
    return { cash, credit };
  }, [sales, currStart, currEnd]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Ganancia bruta</p>
          <p className={`mt-1 text-3xl font-bold ${profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatMoney(profit)}
          </p>
          <p className={`mt-1 text-sm font-medium ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            Margen: {margin.toFixed(1)}%
          </p>
          <div className="mt-4 space-y-1.5 w-full">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Ingresos</span>
              <span className="font-semibold text-slate-900">{formatMoney(currRevenue)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Gastos</span>
              <span className="font-semibold text-rose-700">{formatMoney(currExpenses)}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-950">Ganancia vs Gastos</h3>
          <div className="flex items-center justify-center">
            <svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg">
              <circle cx={50} cy={50} fill="none" r={36} stroke="#f1f5f9" strokeWidth={14} />
              {donutSegments.map((seg, i) => (
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
              <text dominantBaseline="middle" fill="#94a3b8" fontSize="7" textAnchor="middle" x={50} y={46}>Margen</text>
              <text dominantBaseline="middle" fill="#0f172a" fontSize="9" fontWeight="bold" textAnchor="middle" x={50} y={56}>
                {margin.toFixed(0)}%
              </text>
            </svg>
          </div>
          <div className="mt-2 space-y-1">
            {donutData.map((d) => (
              <div className="flex items-center justify-between text-xs" key={d.label}>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-slate-600">{d.label}</span>
                </div>
                <span className="font-semibold text-slate-700">{formatMoney(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-950">Ingresos por categoría</h3>
          {catRevenue.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {catRevenue.slice(0, 6).map(([cat, rev]) => {
                const color = Object.fromEntries(CHART_ENTRIES)[cat] ?? "#94a3b8";
                const pct = currRevenue > 0 ? (rev / currRevenue) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600">{cat}</span>
                      <span className="font-semibold text-slate-800">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-950">Desglose de cobro</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-600">Efectivo</span>
                <span className="font-semibold text-slate-800">{formatMoney(paymentBreakdown.cash)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-violet-500"
                  style={{ width: `${currRevenue > 0 ? (paymentBreakdown.cash / currRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-600">Fiado</span>
                <span className="font-semibold text-slate-800">{formatMoney(paymentBreakdown.credit)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${currRevenue > 0 ? (paymentBreakdown.credit / currRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          {expByCategory.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-700">Gastos por categoría</p>
              <div className="space-y-1">
                {expByCategory.slice(0, 4).map(([cat, amt]) => (
                  <div className="flex justify-between text-xs" key={cat}>
                    <span className="truncate text-slate-500">{cat}</span>
                    <span className="ml-2 flex-shrink-0 font-medium text-slate-700">{formatMoney(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
