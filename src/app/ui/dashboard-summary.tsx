"use client";

import { useEffect, useState } from "react";

type DashboardSummaryData = {
  totalSalesAmount: string;
  totalExpensesAmount: string;
  totalCashIn: string;
  totalCashOut: string;
  currentCashBalance: string;
  totalDebtRemaining: string;
  totalProducts: number;
  lowStockProductsCount: number;
};

type DashboardSummaryResponse = {
  data?: DashboardSummaryData;
  error?: {
    message: string;
  };
};

type SaleRecord = {
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
};

type SalesResponse = {
  data?: SaleRecord[];
  error?: { message: string };
};

type DailyPoint = {
  date: string;
  amount: number;
};

const metricGroups = [
  {
    title: "Ventas",
    metrics: [
      {
        key: "totalSalesAmount",
        label: "Ventas totales",
        tone: "emerald"
      },
      {
        key: "totalExpensesAmount",
        label: "Gastos totales",
        tone: "rose"
      }
    ]
  },
  {
    title: "Caja",
    metrics: [
      {
        key: "totalCashIn",
        label: "Entradas de caja",
        tone: "emerald"
      },
      {
        key: "totalCashOut",
        label: "Salidas de caja",
        tone: "amber"
      },
      {
        key: "currentCashBalance",
        label: "Balance actual",
        tone: "slate"
      }
    ]
  },
  {
    title: "Operación",
    metrics: [
      {
        key: "totalDebtRemaining",
        label: "Deuda pendiente",
        tone: "indigo"
      },
      {
        key: "totalProducts",
        label: "Productos",
        tone: "slate"
      },
      {
        key: "lowStockProductsCount",
        label: "Productos con bajo stock",
        tone: "amber"
      }
    ]
  }
] as const;

const currencyMetricKeys = new Set([
  "totalSalesAmount",
  "totalExpensesAmount",
  "totalCashIn",
  "totalCashOut",
  "currentCashBalance",
  "totalDebtRemaining"
]);

export function DashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesLoaded, setSalesLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      try {
        const response = await fetch("/api/dashboard/summary", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as DashboardSummaryResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setErrorMessage("No se pudo cargar el resumen del negocio.");
          setSummary(null);
          return;
        }

        setSummary(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudo cargar el resumen del negocio.");
          setSummary(null);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadSales() {
      try {
        const response = await fetch("/api/sales", {
          headers: { Accept: "application/json" }
        });
        const responseBody = (await response.json()) as SalesResponse;

        if (isActive && response.ok && responseBody.data) {
          setSales(responseBody.data);
        }
      } catch {
        // charts show empty state on error
      } finally {
        if (isActive) {
          setSalesLoaded(true);
        }
      }
    }

    void loadSales();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && summary ? <MetricSections summary={summary} /> : null}
      {!isLoading && summary && salesLoaded ? (
        <ChartsSection sales={sales} />
      ) : null}
    </section>
  );
}

function MetricSections({ summary }: { summary: DashboardSummaryData }) {
  return (
    <div className="space-y-6">
      {metricGroups.map((group) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-slate-950">{group.title}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                tone={metric.tone}
                value={formatMetricValue(metric.key, summary[metric.key])}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChartsSection({ sales }: { sales: SaleRecord[] }) {
  const dailySales = computeDailySales(sales);
  const { cashTotal, creditTotal } = computePaymentSplit(sales);

  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold text-slate-950">Análisis de ventas</h2>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-500">Ventas por día</p>
          <SalesTrendChart data={dailySales} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-500">Contado vs. Fiado</p>
          <PaymentSplitChart cashTotal={cashTotal} creditTotal={creditTotal} />
        </div>
      </div>
    </div>
  );
}

// --- Line chart constants ---
const CHART_W = 400;
const CHART_H = 160;
const ML = 52;
const MR = 12;
const MT = 10;
const MB = 36;
const CW = CHART_W - ML - MR;
const CH = CHART_H - MT - MB;

function SalesTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-sm text-slate-400">Sin ventas registradas</p>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));
  const yMax = niceMax(maxAmount);
  const n = data.length;

  function xOf(i: number) {
    if (n === 1) return ML + CW / 2;
    return ML + (i / (n - 1)) * CW;
  }

  function yOf(amount: number) {
    return MT + CH - (amount / yMax) * CH;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({
    value: yMax * f,
    y: MT + CH - f * CH
  }));

  const xLabelIndices = pickIndices(n, 5);

  const polylinePoints = data.map((d, i) => `${xOf(i)},${yOf(d.amount)}`).join(" ");

  const bottomY = MT + CH;
  const areaPath = [
    `M ${xOf(0)},${bottomY}`,
    ...data.map((d, i) => `L ${xOf(i)},${yOf(d.amount)}`),
    `L ${xOf(n - 1)},${bottomY}`,
    "Z"
  ].join(" ");

  return (
    <svg aria-hidden className="w-full" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      <defs>
        <linearGradient id="sales-area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((tick) => (
        <line
          key={tick.value}
          stroke="#e2e8f0"
          strokeWidth="1"
          x1={ML}
          x2={CHART_W - MR}
          y1={tick.y}
          y2={tick.y}
        />
      ))}

      {yTicks.map((tick) => (
        <text
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize="10"
          key={tick.value}
          textAnchor="end"
          x={ML - 5}
          y={tick.y}
        >
          {formatYLabel(tick.value)}
        </text>
      ))}

      <path d={areaPath} fill="url(#sales-area-fill)" />

      <polyline
        fill="none"
        points={polylinePoints}
        stroke="#10b981"
        strokeLinejoin="round"
        strokeWidth="2"
      />

      {data.map((d, i) => (
        <circle
          cx={xOf(i)}
          cy={yOf(d.amount)}
          fill="#10b981"
          key={d.date}
          r={n <= 10 ? 3 : 2}
        />
      ))}

      {xLabelIndices.map((i) => (
        <text
          fill="#94a3b8"
          fontSize="10"
          key={data[i].date}
          textAnchor="middle"
          x={xOf(i)}
          y={CHART_H - MB + 14}
        >
          {formatDateShort(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

// --- Donut chart ---

function PaymentSplitChart({
  cashTotal,
  creditTotal
}: {
  cashTotal: number;
  creditTotal: number;
}) {
  const total = cashTotal + creditTotal;

  if (total === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200">
        <p className="text-sm text-slate-400">Sin ventas registradas</p>
      </div>
    );
  }

  const cx = 90;
  const cy = 90;
  const r = 62;
  const sw = 26;
  const circumference = 2 * Math.PI * r;
  const cashArc = (cashTotal / total) * circumference;
  const creditArc = (creditTotal / total) * circumference;

  return (
    <div>
      <svg
        aria-hidden
        className="mx-auto w-full max-w-[200px]"
        viewBox="0 0 180 180"
      >
        {/* background track */}
        <circle
          cx={cx}
          cy={cy}
          fill="none"
          r={r}
          stroke="#f1f5f9"
          strokeWidth={sw}
        />

        {/* CASH (Contado) — emerald, starts at 12 o'clock */}
        {cashArc > 0 ? (
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="#10b981"
            strokeDasharray={`${cashArc} ${circumference - cashArc}`}
            strokeWidth={sw}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}

        {/* CREDIT (Fiado) — blue, starts after cashArc */}
        {creditArc > 0 ? (
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="#3b82f6"
            strokeDasharray={`${creditArc} ${circumference - creditArc}`}
            strokeDashoffset={circumference - cashArc}
            strokeWidth={sw}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}

        <text
          dominantBaseline="middle"
          fill="#64748b"
          fontSize="11"
          textAnchor="middle"
          x={cx}
          y={cy - 9}
        >
          Total
        </text>
        <text
          dominantBaseline="middle"
          fill="#0f172a"
          fontSize="13"
          fontWeight="600"
          textAnchor="middle"
          x={cx}
          y={cy + 9}
        >
          {formatYLabel(total)}
        </text>
      </svg>

      <div className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-500" />
            <span className="text-slate-600">Contado</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-slate-950">
              {moneyFormatter.format(cashTotal)}
            </span>
            <span className="ml-2 text-slate-400">
              {percentFormatter.format(cashTotal / total)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
            <span className="text-slate-600">Fiado</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-slate-950">
              {moneyFormatter.format(creditTotal)}
            </span>
            <span className="ml-2 text-slate-400">
              {percentFormatter.format(creditTotal / total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Existing components (unchanged) ---

function MetricCard({
  label,
  tone,
  value
}: {
  label: string;
  tone: "amber" | "emerald" | "indigo" | "rose" | "slate";
  value: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`h-2.5 w-2.5 rounded-full ${toneClassNames[tone]}`} />
      </div>
      <p className="mt-4 break-words text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
    </article>
  );
}

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando resumen...
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-medium text-rose-900">{message}</p>
    </div>
  );
}

// --- Data helpers ---

function computeDailySales(sales: SaleRecord[]): DailyPoint[] {
  const byDate = new Map<string, number>();

  for (const sale of sales) {
    const date = sale.saleDate.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + Number(sale.totalAmount));
  }

  return Array.from(byDate.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computePaymentSplit(sales: SaleRecord[]) {
  let cashTotal = 0;
  let creditTotal = 0;

  for (const sale of sales) {
    if (sale.paymentType === "CASH") {
      cashTotal += Number(sale.totalAmount);
    } else {
      creditTotal += Number(sale.totalAmount);
    }
  }

  return { cashTotal, creditTotal };
}

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function pickIndices(n: number, maxCount: number): number[] {
  if (n === 0) return [];
  if (n <= maxCount) return Array.from({ length: n }, (_, i) => i);
  const result: number[] = [];
  for (let i = 0; i < maxCount; i++) {
    result.push(Math.round((i / (maxCount - 1)) * (n - 1)));
  }
  return [...new Set(result)];
}

// --- Format helpers ---

function formatMetricValue(
  key: keyof DashboardSummaryData,
  value: DashboardSummaryData[keyof DashboardSummaryData]
) {
  if (currencyMetricKeys.has(key)) {
    return moneyFormatter.format(Number(value));
  }

  return numberFormatter.format(Number(value));
}

function formatYLabel(value: number): string {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
}

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}

// --- Formatters ---

const moneyFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat("es-419", {
  style: "percent",
  maximumFractionDigits: 1
});

const shortDateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short"
});

const toneClassNames = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500"
};
