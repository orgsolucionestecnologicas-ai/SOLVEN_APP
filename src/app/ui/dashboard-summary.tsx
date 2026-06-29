"use client";

import { useEffect, useState } from "react";
import { formatARS } from "@/lib/format-currency";
import Link from "next/link";
import {
  BarChart2,
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Trophy,
  UserPlus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Summary = {
  totalSalesAmount: string;
  totalExpensesAmount: string;
  totalCashIn: string;
  totalCashOut: string;
  currentCashBalance: string;
  totalDebtRemaining: string;
  totalProducts: number;
  lowStockProductsCount: number;
};

type Sale = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
  debtId?: string | null;
  customer?: { name: string } | null;
};

type CashMovement = {
  id: string;
  movementDate: string;
  type: "IN" | "OUT";
  amount: string;
  source: string;
  referenceId: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
  salePrice: string;
};

type Customer = {
  id: string;
  name: string;
};

type TopProduct = {
  id: string;
  name: string;
  units: number;
  total: number;
};

type ExpiringQuote = {
  id: string;
  quoteNumber: string;
  customerName: string;
  totalAmount: string;
  validUntil: string;
};

type CashRegisterSession = {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
};

type TopSeller = {
  id: string;
  name: string;
  totalAmount: number;
  salesCount: number;
};

type Debt = {
  id: string;
  customerId: string;
  totalAmount: string;
  remainingAmount: string;
  customer: { name: string };
};

type DayTotal = { date: string; total: number };

type DateFilterOption = "today" | "week" | "month" | "custom";

type DashboardState = {
  summary: Summary | null;
  sales: Sale[] | null;
  cashMovements: CashMovement[] | null;
  products: Product[] | null;
  customers: Customer[] | null;
  debts: Debt[] | null;
  loading: boolean;
};

// ── Main export ────────────────────────────────────────────────────────────────

export function DashboardSummary() {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    sales: null,
    cashMovements: null,
    products: null,
    customers: null,
    debts: null,
    loading: true,
  });
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const range = getDateRange(dateFilter, customFrom, customTo);
    if (!range) return;
    const { from, to } = range;

    let active = true;
    setState((prev) => ({ ...prev, loading: true }));

    async function load() {
      const salesUrl = `/api/sales?from=${from}&to=${to}`;
      const cashUrl   = `/api/cash-movements?from=${from}&to=${to}`;

      const [summaryRes, salesRes, cashRes, productsRes, customersRes, debtsRes] =
        await Promise.allSettled([
          fetch("/api/dashboard/summary", { headers: { Accept: "application/json" } }).then((r) => r.json()),
          fetch(salesUrl,                 { headers: { Accept: "application/json" } }).then((r) => r.json()),
          fetch(cashUrl,                  { headers: { Accept: "application/json" } }).then((r) => r.json()),
          fetch("/api/products",          { headers: { Accept: "application/json" } }).then((r) => r.json()),
          fetch("/api/customers",         { headers: { Accept: "application/json" } }).then((r) => r.json()),
          fetch("/api/debts",             { headers: { Accept: "application/json" } }).then((r) => r.json()),
        ]);

      if (!active) return;

      setState({
        summary:       summaryRes.status   === "fulfilled" ? (summaryRes.value.data   as Summary        ?? null) : null,
        sales:         salesRes.status     === "fulfilled" ? (salesRes.value.data     as Sale[]         ?? null) : null,
        cashMovements: cashRes.status      === "fulfilled" ? (cashRes.value.data      as CashMovement[] ?? null) : null,
        products:      productsRes.status  === "fulfilled" ? (productsRes.value.data  as Product[]      ?? null) : null,
        customers:     customersRes.status === "fulfilled" ? (customersRes.value.data as Customer[]     ?? null) : null,
        debts:         debtsRes.status     === "fulfilled" ? (debtsRes.value.data     as Debt[]         ?? null) : null,
        loading: false,
      });
    }

    void load();
    return () => { active = false; };
  }, [dateFilter, customFrom, customTo]);

  if (state.loading) {
    return <DashboardSkeleton />;
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const now = new Date();
  const todayStr     = now.toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const monthStr     = todayStr.slice(0, 7);
  const last7Dates   = Array.from({ length: 7 }, (_, i) =>
    new Date(now.getTime() - (6 - i) * 86_400_000).toISOString().slice(0, 10)
  );

  const allSales = state.sales ?? [];
  const allCash  = state.cashMovements ?? [];

  const todaySalesTotal     = sumSales(allSales.filter((s) => s.saleDate.slice(0, 10) === todayStr));
  const yesterdaySalesTotal = sumSales(allSales.filter((s) => s.saleDate.slice(0, 10) === yesterdayStr));
  const monthSalesTotal     = sumSales(allSales.filter((s) => s.saleDate.slice(0, 7) === monthStr));

  const todayCashOut = allCash
    .filter((m) => m.movementDate.slice(0, 10) === todayStr && m.type === "OUT")
    .reduce((s, m) => s + Number(m.amount), 0);
  const todayProfit = todaySalesTotal - todayCashOut;

  const pendingDebtsCount = (state.debts ?? []).filter((d) => Number(d.remainingAmount) > 0).length;

  const salesByDay: DayTotal[] = last7Dates.map((date) => ({
    date,
    total: sumSales(allSales.filter((s) => s.saleDate.slice(0, 10) === date)),
  }));

  const profitByDay = last7Dates.map((date, i) => {
    const dayOut = allCash
      .filter((m) => m.movementDate.slice(0, 10) === date && m.type === "OUT")
      .reduce((s, m) => s + Number(m.amount), 0);
    return salesByDay[i].total - dayOut;
  });

  const monthDailyMap: Record<string, number> = {};
  for (const s of allSales.filter((s) => s.saleDate.slice(0, 7) === monthStr)) {
    const d = s.saleDate.slice(0, 10);
    monthDailyMap[d] = (monthDailyMap[d] ?? 0) + Number(s.totalAmount);
  }
  const monthSparkData = Object.values(monthDailyMap);

  const todayVsDiff    = todaySalesTotal - yesterdaySalesTotal;
  const todayVsLabel   = yesterdaySalesTotal > 0 ? `${todayVsDiff >= 0 ? "▲" : "▼"} ${formatCompact(Math.abs(todayVsDiff))} vs ayer` : null;
  const todayVsPositive = todayVsDiff >= 0;

  return (
    <div className="min-h-full bg-slate-50">
      <OpenCashRegisterAlert />
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hola, Propietario 👋</h1>
          <p className="mt-0.5 text-sm text-slate-500">Aquí tienes el resumen de tu negocio</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar size={15} className="text-slate-400" />
            <span>{formatFullDate(now)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        {/* ── Period selector ── */}
        <PeriodSelector
          value={dateFilter}
          onChange={setDateFilter}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Ventas del día"
            value={formatARS(todaySalesTotal)}
            IconEl={<DollarSign size={18} />}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            trendLabel={todayVsLabel}
            trendPositive={todayVsPositive}
            sparkData={salesByDay.map((d) => d.total)}
            sparkColor="#7c3aed"
            href="/sales"
          />
          <MetricCard
            title="Ventas del mes"
            value={formatARS(monthSalesTotal)}
            IconEl={<ShoppingBag size={18} />}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            trendLabel={null}
            trendPositive={true}
            sparkData={monthSparkData}
            sparkColor="#16a34a"
            href="/sales"
          />
          <MetricCard
            title="Ganancia del día"
            value={formatARS(todayProfit)}
            IconEl={<TrendingUp size={18} />}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            trendLabel={null}
            trendPositive={true}
            sparkData={profitByDay}
            sparkColor="#2563eb"
            href="/reports"
          />
          {/* Low stock card */}
          <Link
            href="/inventory"
            className="block cursor-pointer rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:ring-2 hover:ring-violet-500/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Productos bajos</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {state.summary?.lowStockProductsCount ?? "—"}
                </p>
              </div>
              <div className="rounded-lg bg-orange-100 p-2">
                <Package size={18} className="text-orange-600" />
              </div>
            </div>
            <span className="mt-3 inline-flex items-center text-xs font-medium text-orange-600">
              Ver inventario →
            </span>
          </Link>
        </div>

        {/* ── Pending quotes + Top sellers ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PendingQuotesWidget />
          <TopSellersWidget />
        </div>

        {/* ── Chart + Top products ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MainSalesChart salesByDay={salesByDay} />
          </div>
          <div className="lg:col-span-2">
            <TopProductsPanel />
          </div>
        </div>

        {/* ── Bottom row ── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <CashMovementsPanel cashMovements={state.cashMovements} />
          <AlertsPanel
            lowStockCount={state.summary?.lowStockProductsCount ?? 0}
            pendingDebtsCount={pendingDebtsCount}
          />
          <QuickSummaryPanel
            todaySalesTotal={todaySalesTotal}
            todayProfit={todayProfit}
            totalProducts={state.summary?.totalProducts ?? (state.products?.length ?? 0)}
            totalCustomers={(state.customers ?? []).length}
            pendingDebtsCount={pendingDebtsCount}
          />
        </div>

        {/* ── Quick actions ── */}
        <QuickActions />
      </div>
    </div>
  );
}

// ── MetricCard ─────────────────────────────────────────────────────────────────

function MetricCard({
  title, value, IconEl, iconBg, iconColor, trendLabel, trendPositive, sparkData, sparkColor, href,
}: {
  title: string;
  value: string;
  IconEl: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trendLabel: string | null;
  trendPositive: boolean;
  sparkData: number[];
  sparkColor: string;
  href?: string;
}) {
  const cardClassName = `rounded-xl border border-slate-100 bg-white p-5 shadow-sm${
    href ? " cursor-pointer transition hover:ring-2 hover:ring-violet-500/30" : ""
  }`;

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {trendLabel ? (
            <p className={`mt-1 text-xs font-medium ${trendPositive ? "text-green-600" : "text-red-500"}`}>
              {trendLabel}
            </p>
          ) : null}
        </div>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <span className={iconColor}>{IconEl}</span>
        </div>
      </div>
      {sparkData.length > 1 ? (
        <div className="mt-3">
          <SparkLine data={sparkData} color={sparkColor} />
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${cardClassName}`}>
        {content}
      </Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}

// ── PeriodSelector ─────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { id: DateFilterOption; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mes" },
  { id: "custom", label: "Personalizado" },
];

function PeriodSelector({
  value, onChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: {
  value: DateFilterOption;
  onChange: (v: DateFilterOption) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            value === opt.id
              ? "bg-violet-600 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
      {value === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-950 focus:border-violet-400 focus:outline-none"
          />
          <span className="text-sm text-slate-400">a</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-950 focus:border-violet-400 focus:outline-none"
          />
        </div>
      ) : null}
    </div>
  );
}

// ── SparkLine ──────────────────────────────────────────────────────────────────

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 80;
  const h = 28;
  const n = data.length;
  if (n < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg aria-hidden width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

// ── MainSalesChart ─────────────────────────────────────────────────────────────

const CW_MAIN = 480;
const CH_MAIN = 180;
const ML_MAIN = 52;
const MR_MAIN = 16;
const MT_MAIN = 12;
const MB_MAIN = 38;
const PW = CW_MAIN - ML_MAIN - MR_MAIN;
const PH = CH_MAIN - MT_MAIN - MB_MAIN;

function MainSalesChart({ salesByDay }: { salesByDay: DayTotal[] }) {
  const hasData = salesByDay.some((d) => d.total > 0);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-900">Ventas de los últimos 7 días</p>
      </div>
      {!hasData ? (
        <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">Sin ventas registradas</p>
        </div>
      ) : (
        <SalesAreaChart data={salesByDay} />
      )}
    </div>
  );
}

function SalesAreaChart({ data }: { data: DayTotal[] }) {
  const maxVal = Math.max(...data.map((d) => d.total));
  const yMax   = niceMax(maxVal);
  const n      = data.length;

  function xOf(i: number) {
    if (n <= 1) return ML_MAIN + PW / 2;
    return ML_MAIN + (i / (n - 1)) * PW;
  }
  function yOf(v: number) {
    return MT_MAIN + PH - (v / yMax) * PH;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    value: yMax * f,
    y: MT_MAIN + PH - f * PH,
  }));

  const bottomY    = MT_MAIN + PH;
  const polyPts    = data.map((d, i) => `${xOf(i)},${yOf(d.total)}`).join(" ");
  const areaPath   = [
    `M ${xOf(0)},${bottomY}`,
    ...data.map((d, i) => `L ${xOf(i)},${yOf(d.total)}`),
    `L ${xOf(n - 1)},${bottomY}`,
    "Z",
  ].join(" ");

  return (
    <svg aria-hidden className="w-full" viewBox={`0 0 ${CW_MAIN} ${CH_MAIN}`}>
      <defs>
        <linearGradient id="violet-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => (
        <line
          key={t.value}
          x1={ML_MAIN} x2={CW_MAIN - MR_MAIN}
          y1={t.y}      y2={t.y}
          stroke="#e2e8f0" strokeWidth="1"
        />
      ))}
      {yTicks.map((t) => (
        <text
          key={t.value}
          x={ML_MAIN - 5} y={t.y}
          textAnchor="end" dominantBaseline="middle"
          fill="#94a3b8" fontSize="10"
        >
          {formatYLabel(t.value)}
        </text>
      ))}

      <path d={areaPath} fill="url(#violet-fill)" />
      <polyline
        points={polyPts}
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {data.map((d, i) => (
        <circle
          key={d.date}
          cx={xOf(i)} cy={yOf(d.total)}
          r="3" fill="#7c3aed"
        />
      ))}

      {data.map((d, i) => (
        <text
          key={d.date}
          x={xOf(i)} y={CH_MAIN - MB_MAIN + 14}
          textAnchor="middle" fill="#94a3b8" fontSize="10"
        >
          {formatXAxisLabel(d.date)}
        </text>
      ))}
    </svg>
  );
}

// ── TopProductsPanel ───────────────────────────────────────────────────────────

function TopProductsPanel() {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/top-products", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: TopProduct[] }) => {
        if (body.data) setProducts(body.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Productos más vendidos</p>
        <Link href="/products" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          Ver todos
        </Link>
      </div>
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200">
          <p className="px-4 text-center text-sm text-slate-400">
            Sin datos de ventas en los últimos 30 días
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((prod, i) => (
            <li key={prod.id} className="flex items-center gap-3">
              <span className="w-5 flex-shrink-0 text-xs font-bold text-slate-400">{i + 1}</span>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                {prod.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{prod.name}</p>
                <p className="text-[11px] text-slate-400">{formatARS(prod.total)}</p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-slate-700">{prod.units} uds.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── PendingQuotesWidget ────────────────────────────────────────────────────────

function PendingQuotesWidget() {
  const [quotes, setQuotes] = useState<ExpiringQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/pending-quotes", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: ExpiringQuote[] }) => {
        if (body.data) setQuotes(body.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Cotizaciones pendientes</p>
        <Link href="/quotes" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          Ver todas
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <FileText size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">Sin cotizaciones pendientes</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {quotes.map((q) => {
            const days = daysUntil(q.validUntil);
            const semaphoreClass =
              days > 7
                ? "bg-green-50 text-green-700"
                : days >= 3
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-red-50 text-red-600";
            return (
              <li key={q.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{q.quoteNumber}</p>
                  <p className="truncate text-[11px] text-slate-400">{q.customerName || "Sin cliente"}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-slate-700">
                  {formatARS(Number(q.totalAmount))}
                </span>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${semaphoreClass}`}>
                  {days >= 0 ? `${days}d` : "Vencida"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── TopSellersWidget ───────────────────────────────────────────────────────────

const SELLER_MEDALS = ["🥇", "🥈", "🥉"];

function TopSellersWidget() {
  const [sellers, setSellers] = useState<TopSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/top-sellers", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: TopSeller[] }) => {
        if (body.data) setSellers(body.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-slate-900">Top vendedores hoy</p>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <Trophy size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">Sin ventas registradas hoy</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sellers.map((seller, i) => (
            <li key={seller.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex-shrink-0 text-lg">{SELLER_MEDALS[i] ?? "🎗️"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{seller.name}</p>
                <p className="text-[11px] text-slate-400">
                  {seller.salesCount} {seller.salesCount === 1 ? "venta" : "ventas"}
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-slate-700">
                {formatARS(seller.totalAmount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── OpenCashRegisterAlert ──────────────────────────────────────────────────────

function OpenCashRegisterAlert() {
  const [session, setSession] = useState<CashRegisterSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cash-register", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: CashRegisterSession | null }) => {
        setSession(body.data ?? null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !session || session.status !== "OPEN") return null;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const openedDateStr = new Date(session.openedAt).toISOString().slice(0, 10);
  const isLateHour = now.getHours() >= 20;
  const openedOnPreviousDay = openedDateStr < todayStr;

  if (!isLateHour && !openedOnPreviousDay) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-amber-800">
        ⚠️ La caja sigue abierta. Recordá cerrarla antes de terminar el día.
      </p>
      <Link
        href="/cash-movements"
        className="inline-flex w-fit flex-shrink-0 items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
      >
        Ir a Caja
      </Link>
    </div>
  );
}

// ── CashMovementsPanel ─────────────────────────────────────────────────────────

function CashMovementsPanel({ cashMovements }: { cashMovements: CashMovement[] | null }) {
  const items = (cashMovements ?? []).slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Movimientos de caja</p>
        <Link href="/cash-movements" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          Ver todos
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Sin movimientos</p>
      ) : (
        <ul className="space-y-3">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  m.type === "IN" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                }`}
              >
                {m.type === "IN" ? "↑" : "↓"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-700">{sourceLabel(m.source)}</p>
                <p className="text-[11px] text-slate-400">{formatTime(m.movementDate)}</p>
              </div>
              <span
                className={`flex-shrink-0 text-xs font-semibold ${
                  m.type === "IN" ? "text-green-600" : "text-red-500"
                }`}
              >
                {m.type === "IN" ? "+" : "-"}{formatARS(Number(m.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── AlertsPanel ────────────────────────────────────────────────────────────────

function AlertsPanel({
  lowStockCount,
  pendingDebtsCount,
}: {
  lowStockCount: number;
  pendingDebtsCount: number;
}) {
  const [expiringQuotes, setExpiringQuotes] = useState<ExpiringQuote[]>([]);

  useEffect(() => {
    fetch("/api/quotes/expiring", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: ExpiringQuote[] }) => {
        if (body.data) setExpiringQuotes(body.data);
      })
      .catch(() => {});
  }, []);

  const hasAlerts = lowStockCount > 0 || pendingDebtsCount > 0 || expiringQuotes.length > 0;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Alertas importantes</p>
        <Link href="/quotes" className="text-xs font-medium text-violet-600 hover:text-violet-700">
          Ver todas
        </Link>
      </div>
      {!hasAlerts ? (
        <p className="py-4 text-center text-sm text-slate-400">Sin alertas activas</p>
      ) : (
        <ul className="space-y-3">
          {lowStockCount > 0 ? (
            <li className="flex items-start gap-3 rounded-lg bg-orange-50 p-3">
              <span className="mt-0.5 flex-shrink-0 text-orange-500">⚠</span>
              <div>
                <p className="text-xs font-semibold text-orange-800">Stock bajo</p>
                <p className="mt-0.5 text-xs text-orange-600">
                  {lowStockCount} {lowStockCount === 1 ? "producto" : "productos"} con stock ≤ 5
                </p>
              </div>
            </li>
          ) : null}
          {pendingDebtsCount > 0 ? (
            <li className="flex items-start gap-3 rounded-lg bg-yellow-50 p-3">
              <span className="mt-0.5 flex-shrink-0 text-yellow-500">!</span>
              <div>
                <p className="text-xs font-semibold text-yellow-800">Pagos pendientes</p>
                <p className="mt-0.5 text-xs text-yellow-600">
                  {pendingDebtsCount} {pendingDebtsCount === 1 ? "deuda activa" : "deudas activas"} sin saldar
                </p>
              </div>
            </li>
          ) : null}
          {expiringQuotes.length > 0 ? (
            <li className="flex items-start gap-3 rounded-lg bg-violet-50 p-3">
              <span className="mt-0.5 flex-shrink-0 text-violet-500">📋</span>
              <div>
                <p className="text-xs font-semibold text-violet-800">Cotizaciones por vencer</p>
                <p className="mt-0.5 text-xs text-violet-600">
                  {expiringQuotes.length} {expiringQuotes.length === 1 ? "cotización vence" : "cotizaciones vencen"} en las próximas 24 hs
                </p>
                <Link href="/quotes" className="mt-1 block text-[11px] font-medium text-violet-700 hover:underline">
                  Ver cotizaciones →
                </Link>
              </div>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

// ── QuickSummaryPanel ──────────────────────────────────────────────────────────

function QuickSummaryPanel({
  todaySalesTotal,
  todayProfit,
  totalProducts,
  totalCustomers,
  pendingDebtsCount,
}: {
  todaySalesTotal: number;
  todayProfit: number;
  totalProducts: number;
  totalCustomers: number;
  pendingDebtsCount: number;
}) {
  const rows = [
    { label: "Ventas de hoy",           value: formatARS(todaySalesTotal), highlight: false },
    { label: "Ganancia de hoy",         value: formatARS(todayProfit),     highlight: todayProfit < 0 },
    { label: "Productos en inventario", value: String(totalProducts),       highlight: false },
    { label: "Clientes registrados",    value: String(totalCustomers),      highlight: false },
    { label: "Ventas pendientes",       value: String(pendingDebtsCount),   highlight: pendingDebtsCount > 0 },
  ];

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-slate-900">Resumen rápido</p>
      <ul className="space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">{row.label}</span>
            <span
              className={`text-xs font-semibold ${row.highlight ? "text-red-600" : "text-slate-800"}`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── QuickActions ───────────────────────────────────────────────────────────────

const quickActions = [
  { label: "Nueva venta",     href: "/pos",              Icon: ShoppingCart },
  { label: "Nuevo producto",  href: "/products/new",     Icon: Package },
  { label: "Abrir caja",      href: "/cash-movements",   Icon: CreditCard },
  { label: "Ver reportes",    href: "/reports",          Icon: BarChart2 },
  { label: "Nuevo cliente",   href: "/customers/new",    Icon: UserPlus },
  { label: "Ajuste de stock", href: "/inventory/adjust", Icon: RefreshCw },
];

function QuickActions() {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-900">Acciones rápidas</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-violet-200 hover:bg-violet-50"
          >
            <action.Icon size={20} className="text-violet-600" />
            <span className="text-center text-xs font-medium text-slate-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── DashboardSkeleton ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-full bg-slate-50 px-6 py-6">
      <div className="mb-6 h-16 animate-pulse rounded-xl bg-white" />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-64 animate-pulse rounded-xl bg-white lg:col-span-3" />
        <div className="h-64 animate-pulse rounded-xl bg-white lg:col-span-2" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sumSales(sales: Sale[]): number {
  return sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
}

function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function getDateRange(
  filter: DateFilterOption,
  customFrom: string,
  customTo: string
): { from: string; to: string } | null {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);

  if (filter === "today") {
    return { from: toStr, to: toStr };
  }
  if (filter === "week") {
    const day = today.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(today.getTime() - diffToMonday * 86_400_000);
    return { from: monday.toISOString().slice(0, 10), to: toStr };
  }
  if (filter === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: first.toISOString().slice(0, 10), to: toStr };
  }
  return customFrom && customTo ? { from: customFrom, to: customTo } : null;
}

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const n   = value / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function formatFullDate(date: Date): string {
  const weekday = new Intl.DateTimeFormat("es-419", { weekday: "long" }).format(date);
  const day     = date.getDate();
  const month   = new Intl.DateTimeFormat("es-419", { month: "long" }).format(date);
  const year    = date.getFullYear();
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized}, ${day} ${month} ${year}`;
}

function formatXAxisLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date      = new Date(y, m - 1, d);
  const abbr      = new Intl.DateTimeFormat("es-419", { weekday: "short" }).format(date);
  const clean     = abbr.replace(".", "").slice(0, 3);
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)} ${d}`;
}

function formatYLabel(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000)    return `$${Math.round(value / 1_000)}K`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat("es-419", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

function sourceLabel(source: string): string {
  switch (source) {
    case "SALE":         return "Venta";
    case "DEBT_PAYMENT": return "Pago de deuda";
    case "EXPENSE":      return "Gasto";
    default:             return source;
  }
}
