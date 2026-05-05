"use client";

import { useEffect, useState } from "react";

type SummaryRecord = {
  totalSalesAmount: string;
  totalExpensesAmount: string;
  totalDebtRemaining: string;
};

type SaleRecord = {
  id: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
};

type ProductRecord = {
  id: string;
  name: string;
  stock: number;
  salePrice: string;
};

type DebtRecord = {
  id: string;
  customer: { name: string };
  totalAmount: string;
  remainingAmount: string;
};

type CashMovementRecord = {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  source: string;
  movementDate: string;
};

async function fetchReportData<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: T };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export function Reports() {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const [sales, setSales] = useState<SaleRecord[] | null>(null);
  const [products, setProducts] = useState<ProductRecord[] | null>(null);
  const [debts, setDebts] = useState<DebtRecord[] | null>(null);
  const [cashMovements, setCashMovements] = useState<CashMovementRecord[] | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadReports() {
      const [summaryData, salesData, productsData, debtsData, cashMovementsData] =
        await Promise.all([
          fetchReportData<SummaryRecord>("/api/dashboard/summary"),
          fetchReportData<SaleRecord[]>("/api/sales"),
          fetchReportData<ProductRecord[]>("/api/products"),
          fetchReportData<DebtRecord[]>("/api/debts"),
          fetchReportData<CashMovementRecord[]>("/api/cash-movements")
        ]);

      if (!isActive) return;

      setSummary(summaryData);
      setSales(salesData);
      setProducts(productsData);
      setDebts(debtsData);
      setCashMovements(cashMovementsData);
      setIsLoading(false);
    }

    void loadReports();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-6 px-5 py-6 sm:px-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
            key={i}
          />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-6 px-5 py-6 sm:px-8">
      <FinancialSummaryPanel summary={summary} />
      <PaymentTypeSplitPanel sales={sales} />
      <LowStockPanel products={products} />
      <ActiveDebtsPanel debts={debts} />
      <RecentCashMovementsPanel cashMovements={cashMovements} />
    </section>
  );
}

function FinancialSummaryPanel({ summary }: { summary: SummaryRecord | null }) {
  const balanceNeto = summary
    ? Number(summary.totalSalesAmount) - Number(summary.totalExpensesAmount)
    : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">Resumen financiero</h2>
        <p className="mt-1 text-sm text-slate-500">
          Totales acumulados desde el inicio.
        </p>
      </div>
      {!summary ? (
        <PanelError message="No se pudo cargar el resumen financiero." />
      ) : (
        <div className="grid grid-cols-2 gap-px bg-slate-100 lg:grid-cols-4">
          <FinancialMetric
            label="Total ventas"
            value={formatMoney(summary.totalSalesAmount)}
            valueClass="text-emerald-700"
          />
          <FinancialMetric
            label="Total gastos"
            value={formatMoney(summary.totalExpensesAmount)}
            valueClass="text-rose-700"
          />
          <FinancialMetric
            label="Balance neto"
            value={formatMoneyNum(balanceNeto)}
            valueClass={balanceNeto >= 0 ? "text-emerald-700" : "text-rose-700"}
          />
          <FinancialMetric
            label="Deuda pendiente"
            value={formatMoney(summary.totalDebtRemaining)}
            valueClass="text-amber-700"
          />
        </div>
      )}
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  valueClass
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-normal ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function PaymentTypeSplitPanel({ sales }: { sales: SaleRecord[] | null }) {
  let cashTotal = 0;
  let cashCount = 0;
  let creditTotal = 0;
  let creditCount = 0;

  if (sales) {
    for (const sale of sales) {
      if (sale.paymentType === "CASH") {
        cashTotal += Number(sale.totalAmount);
        cashCount++;
      } else {
        creditTotal += Number(sale.totalAmount);
        creditCount++;
      }
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Ventas por tipo de pago
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Total histórico de ventas contado y fiado.
        </p>
      </div>
      {!sales ? (
        <PanelError message="No se pudieron cargar las ventas." />
      ) : (
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          <div className="bg-white px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="text-sm text-slate-500">Contado</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-emerald-700">
              {formatMoneyNum(cashTotal)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {cashCount} {cashCount === 1 ? "venta" : "ventas"}
            </p>
          </div>
          <div className="bg-white px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <p className="text-sm text-slate-500">Fiado</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-blue-700">
              {formatMoneyNum(creditTotal)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {creditCount} {creditCount === 1 ? "venta" : "ventas"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LowStockPanel({ products }: { products: ProductRecord[] | null }) {
  const lowStockProducts = products?.filter((p) => p.stock <= 5) ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Productos con stock bajo
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Productos con 5 unidades o menos en inventario.
        </p>
      </div>
      {!products ? (
        <PanelError message="No se pudieron cargar los productos." />
      ) : lowStockProducts.length === 0 ? (
        <EmptyPanelState message="No hay productos con stock bajo." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <TableHeader>Producto</TableHeader>
                <TableHeader>Stock</TableHeader>
                <TableHeader>Precio de venta</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {lowStockProducts.map((product) => (
                <tr key={product.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                    {product.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <StockBadge stock={product.stock} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                    {formatMoney(product.salePrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActiveDebtsPanel({ debts }: { debts: DebtRecord[] | null }) {
  const activeDebts =
    debts
      ?.filter((d) => Number(d.remainingAmount) > 0)
      .sort((a, b) => Number(b.remainingAmount) - Number(a.remainingAmount)) ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Deudas activas por cliente
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Cuentas pendientes ordenadas por saldo mayor.
        </p>
      </div>
      {!debts ? (
        <PanelError message="No se pudieron cargar las deudas." />
      ) : activeDebts.length === 0 ? (
        <EmptyPanelState message="No hay deudas activas." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <TableHeader>Cliente</TableHeader>
                <TableHeader>Deuda total</TableHeader>
                <TableHeader>Saldo pendiente</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeDebts.map((debt) => (
                <tr key={debt.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                    {debt.customer.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                    {formatMoney(debt.totalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-rose-700">
                    {formatMoney(debt.remainingAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecentCashMovementsPanel({
  cashMovements
}: {
  cashMovements: CashMovementRecord[] | null;
}) {
  const recent = cashMovements?.slice(0, 10) ?? [];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Últimos movimientos de caja
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Los 10 movimientos más recientes registrados en caja.
        </p>
      </div>
      {!cashMovements ? (
        <PanelError message="No se pudieron cargar los movimientos de caja." />
      ) : recent.length === 0 ? (
        <EmptyPanelState message="No hay movimientos de caja registrados." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <TableHeader>Fecha</TableHeader>
                <TableHeader>Tipo</TableHeader>
                <TableHeader>Origen</TableHeader>
                <TableHeader>Monto</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recent.map((movement) => (
                <tr key={movement.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {formatDate(movement.movementDate)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <CashMovementTypeBadge type={movement.type} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                    {formatSource(movement.source)}
                  </td>
                  <td
                    className={
                      movement.type === "IN"
                        ? "whitespace-nowrap px-5 py-4 text-sm font-semibold text-emerald-700"
                        : "whitespace-nowrap px-5 py-4 text-sm font-semibold text-rose-700"
                    }
                  >
                    {formatMoney(movement.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-md bg-rose-50 px-2.5 py-1 text-sm font-medium text-rose-800">
        Sin stock
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800">
      {stock} uds.
    </span>
  );
}

function CashMovementTypeBadge({ type }: { type: "IN" | "OUT" }) {
  return (
    <span
      className={
        type === "IN"
          ? "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
          : "inline-flex rounded-md bg-rose-50 px-2.5 py-1 text-sm font-medium text-rose-800"
      }
    >
      {type === "IN" ? "Entrada" : "Salida"}
    </span>
  );
}

function TableHeader({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
      {children}
    </th>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <div className="px-5 py-5">
      <p className="text-sm font-medium text-rose-700">{message}</p>
    </div>
  );
}

function EmptyPanelState({ message }: { message: string }) {
  return (
    <div className="px-5 py-6">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function formatSource(source: string): string {
  const labels: Record<string, string> = {
    SALE: "Venta",
    EXPENSE: "Gasto",
    DEBT_PAYMENT: "Pago de deuda"
  };
  return labels[source] ?? source;
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
}

function formatMoneyNum(value: number) {
  return moneyFormatter.format(value);
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

const moneyFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
