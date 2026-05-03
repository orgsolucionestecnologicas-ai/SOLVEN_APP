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

const metricGroups = [
  {
    title: "Sales",
    metrics: [
      {
        key: "totalSalesAmount",
        label: "Total sales",
        tone: "emerald"
      },
      {
        key: "totalExpensesAmount",
        label: "Total expenses",
        tone: "rose"
      }
    ]
  },
  {
    title: "Cash",
    metrics: [
      {
        key: "totalCashIn",
        label: "Cash in",
        tone: "emerald"
      },
      {
        key: "totalCashOut",
        label: "Cash out",
        tone: "amber"
      },
      {
        key: "currentCashBalance",
        label: "Current balance",
        tone: "slate"
      }
    ]
  },
  {
    title: "Operations",
    metrics: [
      {
        key: "totalDebtRemaining",
        label: "Debt remaining",
        tone: "indigo"
      },
      {
        key: "totalProducts",
        label: "Products",
        tone: "slate"
      },
      {
        key: "lowStockProductsCount",
        label: "Low stock products",
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
          setErrorMessage(
            responseBody.error?.message ?? "Could not load dashboard summary."
          );
          setSummary(null);
          return;
        }

        setSummary(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("Could not load dashboard summary.");
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

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && summary ? <MetricSections summary={summary} /> : null}
    </section>
  );
}

function MetricSections({ summary }: { summary: DashboardSummaryData }) {
  return (
    <div className="space-y-6">
      {metricGroups.map((group) => (
        <section key={group.title}>
          <h2 className="text-sm font-semibold text-slate-900">{group.title}</h2>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
          key={index}
        />
      ))}
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

function formatMetricValue(
  key: keyof DashboardSummaryData,
  value: DashboardSummaryData[keyof DashboardSummaryData]
) {
  if (currencyMetricKeys.has(key)) {
    return moneyFormatter.format(Number(value));
  }

  return numberFormatter.format(Number(value));
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const toneClassNames = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  indigo: "bg-indigo-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500"
};
