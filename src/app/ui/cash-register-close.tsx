"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  EyeOff,
  Lock,
  Plus,
  Printer,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { formatARS as fmt } from "@/lib/format-currency";

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

type SessionRecord = {
  id: string;
  cashierName: string;
  branchName: string;
  shift: string | null;
  openedAt: string;
  openingAmount: string;
};

type SaleRecord = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
  customer: { name: string } | null;
};

type ExpenseRecord = {
  id: string;
  expenseDate: string;
  amount: string;
  category: string;
  description: string | null;
};

type CashMovementRecord = {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  source: string;
  referenceId: string | null;
  createdAt: string;
};

type DebtRecord = {
  id: string;
  remainingAmount: string;
  customer: { name: string };
};

const CLOSE_DENOMINATIONS = [
  { key: "20000", label: "$20.000", value: 20000 },
  { key: "10000", label: "$10.000", value: 10000 },
  { key: "2000", label: "$2.000", value: 2000 },
  { key: "1000", label: "$1.000", value: 1000 },
  { key: "500", label: "$500", value: 500 },
  { key: "200", label: "$200", value: 200 },
  { key: "100", label: "$100", value: 100 },
  { key: "50", label: "$50", value: 50 },
  { key: "20", label: "$20", value: 20 },
  { key: "c10", label: "Moneda $10", value: 10 },
  { key: "c5", label: "Moneda $5", value: 5 },
  { key: "c2", label: "Moneda $2", value: 2 },
  { key: "c1", label: "Moneda $1", value: 1 },
] as const;

type CloseKey = (typeof CLOSE_DENOMINATIONS)[number]["key"];
type BreakdownCounts = Record<CloseKey, number>;

const dateFmt = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("es-419", {
  hour: "2-digit",
  minute: "2-digit",
});

function sumMoney(items: string[]): number {
  return items.reduce((s, v) => s + Number(v), 0);
}

function emptyBreakdown(): BreakdownCounts {
  return Object.fromEntries(CLOSE_DENOMINATIONS.map((d) => [d.key, 0])) as BreakdownCounts;
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
}

export function CashRegisterClose({
  session,
  onClosed,
  onBack,
}: {
  session: SessionRecord;
  onClosed: () => void;
  onBack: () => void;
}) {
  const now = new Date();
  const openedAtDate = useMemo(() => new Date(session.openedAt), [session.openedAt]);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovementRecord[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [breakdown, setBreakdown] = useState<BreakdownCounts>(emptyBreakdown);
  const [manualTotal, setManualTotal] = useState<string | null>(null);
  const [closingNotes, setClosingNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hiddenExpenseIds, setHiddenExpenseIds] = useState<Set<string>>(new Set());
  const [showAddExpense, setShowAddExpense] = useState(false);

  async function loadData() {
    setIsDataLoading(true);
    try {
      const [salesRes, expensesRes, movementsRes, debtsRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/expenses"),
        fetch("/api/cash-movements"),
        fetch("/api/debts"),
      ]);
      const [salesBody, expensesBody, movementsBody, debtsBody] = await Promise.all([
        salesRes.json() as Promise<ApiResponse<SaleRecord[]>>,
        expensesRes.json() as Promise<ApiResponse<ExpenseRecord[]>>,
        movementsRes.json() as Promise<ApiResponse<CashMovementRecord[]>>,
        debtsRes.json() as Promise<ApiResponse<DebtRecord[]>>,
      ]);
      if (salesBody.data) setSales(salesBody.data);
      if (expensesBody.data) setExpenses(expensesBody.data);
      if (movementsBody.data) setCashMovements(movementsBody.data);
      if (debtsBody.data) setDebts(debtsBody.data);
    } finally {
      setIsDataLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const sessionSales = useMemo(
    () => sales.filter((s) => new Date(s.saleDate) >= openedAtDate),
    [sales, openedAtDate]
  );
  const cashSales = useMemo(
    () => sessionSales.filter((s) => s.paymentType === "CASH"),
    [sessionSales]
  );
  const creditSales = useMemo(
    () => sessionSales.filter((s) => s.paymentType === "CREDIT"),
    [sessionSales]
  );
  const totalSales = useMemo(
    () => sumMoney(sessionSales.map((s) => s.totalAmount)),
    [sessionSales]
  );
  const totalCashSales = useMemo(
    () => sumMoney(cashSales.map((s) => s.totalAmount)),
    [cashSales]
  );
  const totalCreditSales = useMemo(
    () => sumMoney(creditSales.map((s) => s.totalAmount)),
    [creditSales]
  );

  const sessionExpenses = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.expenseDate) >= openedAtDate)
        .filter((e) => !hiddenExpenseIds.has(e.id)),
    [expenses, openedAtDate, hiddenExpenseIds]
  );

  const sessionManualOut = useMemo(
    () =>
      cashMovements.filter(
        (m) =>
          m.type === "OUT" &&
          m.source === "MANUAL" &&
          new Date(m.createdAt) >= openedAtDate
      ),
    [cashMovements, openedAtDate]
  );

  const sessionInMovements = useMemo(
    () => cashMovements.filter((m) => m.type === "IN" && new Date(m.createdAt) >= openedAtDate),
    [cashMovements, openedAtDate]
  );
  const sessionOutMovements = useMemo(
    () => cashMovements.filter((m) => m.type === "OUT" && new Date(m.createdAt) >= openedAtDate),
    [cashMovements, openedAtDate]
  );

  const totalCashIn = useMemo(
    () => sumMoney(sessionInMovements.map((m) => m.amount)),
    [sessionInMovements]
  );
  const totalCashOut = useMemo(
    () => sumMoney(sessionOutMovements.map((m) => m.amount)),
    [sessionOutMovements]
  );
  const totalExpensesAmount = useMemo(
    () => sumMoney(sessionExpenses.map((e) => e.amount)),
    [sessionExpenses]
  );

  const openingAmount = Number(session.openingAmount);
  const expectedAmount = openingAmount + totalCashIn - totalCashOut;

  const breakdownTotal = useMemo(
    () =>
      CLOSE_DENOMINATIONS.reduce((sum, d) => sum + (breakdown[d.key] ?? 0) * d.value, 0),
    [breakdown]
  );

  const closingAmount =
    manualTotal !== null ? Math.max(0, parseFloat(manualTotal) || 0) : breakdownTotal;

  const difference = closingAmount - expectedAmount;
  const differenceIsZero = Math.abs(difference) < 0.005;
  const differenceIsPositive = difference > 0.005;
  const noteRequiredForDifference = !differenceIsZero && !closingNotes.trim();

  const pendingDebts = useMemo(
    () => debts.filter((d) => Number(d.remainingAmount) > 0),
    [debts]
  );
  const totalPendingDebt = useMemo(
    () => sumMoney(pendingDebts.map((d) => d.remainingAmount)),
    [pendingDebts]
  );

  function setDenomCount(key: CloseKey, count: number) {
    setBreakdown((prev) => ({ ...prev, [key]: Math.max(0, count) }));
    setManualTotal(null);
  }

  function clearDenom(key: CloseKey) {
    setBreakdown((prev) => ({ ...prev, [key]: 0 }));
    setManualTotal(null);
  }

  function requestClose(e?: FormEvent) {
    if (e) e.preventDefault();
    if (noteRequiredForDifference) return;
    setShowConfirmClose(true);
  }

  async function performClose() {
    setIsSaving(true);
    setError(null);

    const breakdownPayload: Record<string, number> = {};
    for (const d of CLOSE_DENOMINATIONS) {
      if ((breakdown[d.key] ?? 0) > 0) breakdownPayload[d.key] = breakdown[d.key];
    }

    try {
      const res = await fetch(`/api/cash-register/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closingAmount,
          ...(closingNotes.trim() ? { closingNotes: closingNotes.trim() } : {}),
          ...(Object.keys(breakdownPayload).length > 0
            ? { closingBreakdown: breakdownPayload }
            : {}),
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        setError(body.error?.message ?? "No se pudo cerrar la caja.");
        setShowConfirmClose(false);
        return;
      }
      setShowConfirmClose(false);
      setIsSuccess(true);
      window.dispatchEvent(new Event("cash-register-closed"));
      setTimeout(() => onClosed(), 2000);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setShowConfirmClose(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-xl font-semibold text-slate-950">¡Caja cerrada exitosamente!</h2>
          <p className="mt-1 text-sm text-slate-500">Redirigiendo a cajas...</p>
        </div>
      </div>
    );
  }

  const salesPct = totalSales > 0 ? Math.round((totalCashSales / totalSales) * 100) : 0;
  const creditPct = totalSales > 0 ? Math.round((totalCreditSales / totalSales) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
        <button
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft size={14} />
          Volver a caja
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Cierre de caja
            </h1>
            <p className="text-sm text-slate-500">
              Revisa el resumen del día y registra el efectivo en caja.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => window.print()}
              type="button"
            >
              <Printer size={15} />
              Imprimir cierre
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isSaving || noteRequiredForDifference}
              onClick={() => requestClose()}
              type="button"
            >
              <Lock size={15} />
              Cerrar caja
            </button>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
          <span>
            <span className="font-medium text-slate-500">Caja:</span> Caja 1
          </span>
          <span>
            <span className="font-medium text-slate-500">Cajero:</span> {session.cashierName}
          </span>
          <span>
            <span className="font-medium text-slate-500">Sucursal:</span> {session.branchName}
          </span>
          <span>
            <span className="font-medium text-slate-500">Fecha:</span> {dateFmt.format(now)}
          </span>
          <span>
            <span className="font-medium text-slate-500">Horario:</span>{" "}
            {timeFmt.format(openedAtDate)} – actual {timeFmt.format(now)}
          </span>
        </div>
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={requestClose}>
        {error ? (
          <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 sm:mx-8">
            <p className="text-sm text-rose-800">{error}</p>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          {/* Main content */}
          <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">

            {/* Section 1 — Resumen de ventas */}
            <section className="mb-8">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Resumen de ventas del día
              </h2>
              {isDataLoading ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <SalesSummaryCard
                    amount={totalSales}
                    bgClass="bg-violet-600"
                    count={sessionSales.length}
                    label="Ventas totales"
                    pct={100}
                    textClass="text-white"
                  />
                  <SalesSummaryCard
                    amount={totalCashSales}
                    bgClass="bg-emerald-50"
                    count={cashSales.length}
                    label="Ventas al contado"
                    pct={salesPct}
                    textClass="text-emerald-900"
                  />
                  <SalesSummaryCard
                    amount={totalCreditSales}
                    bgClass="bg-rose-50"
                    count={creditSales.length}
                    label="Crédito"
                    pct={creditPct}
                    textClass="text-rose-900"
                  />
                  <SalesSummaryCard
                    amount={0}
                    bgClass="bg-slate-50 opacity-50"
                    count={0}
                    label="Devoluciones (próx.)"
                    pct={0}
                    textClass="text-slate-400"
                  />
                </div>
              )}
            </section>

            {/* Section 2 — Ventas por método de pago */}
            <section className="mb-8">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Ventas por método de pago
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Método de pago", "Ventas", "Monto total", "Porcentaje"].map((h) => (
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                          key={h}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      {
                        label: "Efectivo",
                        count: cashSales.length,
                        amount: totalCashSales,
                        pct: totalSales > 0 ? (totalCashSales / totalSales) * 100 : 0,
                      },
                      { label: "Tarjeta", count: 0, amount: 0, pct: 0 },
                      { label: "Transferencia", count: 0, amount: 0, pct: 0 },
                      {
                        label: "Crédito",
                        count: creditSales.length,
                        amount: totalCreditSales,
                        pct: totalSales > 0 ? (totalCreditSales / totalSales) * 100 : 0,
                      },
                    ].map((row) => (
                      <tr className="hover:bg-slate-50" key={row.label}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {row.label}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.count}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                          {fmt(row.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {row.pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-slate-950">Total</td>
                      <td className="px-4 py-3 text-sm text-slate-950">
                        {sessionSales.length}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-950">{fmt(totalSales)}</td>
                      <td className="px-4 py-3 text-sm text-slate-950">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3 — Conteo de efectivo */}
            <section className="mb-8">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Conteo de efectivo en caja
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Denominación", "Cantidad", "Valor", "Total", ""].map((h, i) => (
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                          key={i}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {CLOSE_DENOMINATIONS.map((denom) => {
                      const count = breakdown[denom.key] ?? 0;
                      const rowTotal = count * denom.value;
                      return (
                        <tr className="hover:bg-slate-50" key={denom.key}>
                          <td className="px-4 py-2.5 text-sm font-medium text-slate-900">
                            {denom.label}
                          </td>
                          <td className="px-4 py-2.5">
                            <input
                              className="w-20 rounded-md border border-slate-200 px-2 py-1 text-center text-sm focus:border-violet-500 focus:outline-none"
                              min="0"
                              onChange={(e) =>
                                setDenomCount(denom.key, parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                              type="number"
                              value={count === 0 ? "" : count}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">
                            {denom.label}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-slate-900">
                            {fmt(rowTotal)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                              onClick={() => clearDenom(denom.key)}
                              title="Limpiar"
                              type="button"
                            >
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-emerald-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-slate-950" colSpan={2}>
                        Total efectivo contado
                        <p className="mt-0.5 text-xs font-normal text-slate-500">
                          Suma del desglose: {fmt(breakdownTotal)}
                        </p>
                      </td>
                      <td />
                      <td className="px-4 py-3">
                        <input
                          className="w-32 rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-right text-base font-bold text-emerald-700 focus:border-violet-500 focus:outline-none"
                          min="0"
                          onChange={(e) => setManualTotal(e.target.value)}
                          step="0.01"
                          type="number"
                          value={manualTotal ?? String(breakdownTotal)}
                        />
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4 — Gastos y retiros */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-950">
                  Gastos y retiros del día
                </h2>
                <button
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowAddExpense(true)}
                  type="button"
                >
                  <Plus size={14} />
                  Agregar gasto o retiro
                </button>
              </div>
              {sessionExpenses.length === 0 && sessionManualOut.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    No hay gastos ni retiros registrados en esta sesión.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Concepto", "Descripción", "Monto", ""].map((h, i) => (
                          <th
                            className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                            key={i}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {sessionExpenses.map((expense) => (
                        <tr className="hover:bg-slate-50" key={expense.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {expense.category}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {expense.description ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-rose-700">
                            -{fmt(Number(expense.amount))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                              onClick={() =>
                                setHiddenExpenseIds((prev) => new Set([...prev, expense.id]))
                              }
                              title="Ocultar de esta vista"
                              type="button"
                            >
                              <EyeOff size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sessionManualOut.map((movement) => (
                        <tr className="hover:bg-slate-50" key={movement.id}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            Retiro manual
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {movement.referenceId ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-rose-700">
                            -{fmt(Number(movement.amount))}
                          </td>
                          <td />
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 bg-rose-50 font-semibold">
                        <td className="px-4 py-3 text-sm text-slate-950" colSpan={2}>
                          Total gastos y retiros
                        </td>
                        <td className="px-4 py-3 text-base font-bold text-rose-700">
                          -{fmt(totalExpensesAmount)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 px-4 py-5 xl:block">
            {/* Panel 1 — Resumen del cierre */}
            <div className="mb-5">
              <h3 className="mb-4 text-sm font-semibold text-slate-950">
                Resumen del cierre
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ventas totales</span>
                  <span className="font-semibold text-slate-900">{fmt(totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">(-) Devoluciones</span>
                  <span className="font-semibold text-slate-900">{fmt(0)}</span>
                </div>
              </div>
              <div className="my-3 border-t border-slate-200" />
              <div className="rounded-xl bg-violet-600 p-3 text-white">
                <p className="text-xs text-violet-200">Total esperado en caja</p>
                <p className="mt-0.5 text-2xl font-bold">{fmt(expectedAmount)}</p>
                <p className="mt-1 text-xs text-violet-300">
                  Apertura + Entradas − Salidas
                </p>
              </div>
              <div className="my-3 border-t border-slate-200" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Efectivo contado</span>
                  <span className="font-semibold text-slate-900">{fmt(closingAmount)}</span>
                </div>
              </div>
              <div className="my-3 border-t border-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Diferencia</span>
                <span
                  className={`text-base font-bold ${
                    differenceIsZero
                      ? "text-emerald-700"
                      : differenceIsPositive
                        ? "text-amber-600"
                        : "text-rose-700"
                  }`}
                >
                  {difference >= 0 ? "+" : ""}
                  {fmt(difference)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Estado del cierre</span>
                {differenceIsZero ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Cuadre correcto
                  </span>
                ) : (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                    Diferencia detectada
                  </span>
                )}
              </div>
              {differenceIsZero ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-900">
                    ¡Felicidades! Tu caja cuadra correctamente.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Panel 2 — Ventas a crédito pendientes */}
            <div className="mb-5 border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center gap-1.5">
                <Users className="text-slate-400" size={15} />
                <h3 className="text-sm font-semibold text-slate-950">
                  Ventas a crédito pendientes
                </h3>
              </div>
              {isDataLoading ? (
                <div className="h-16 animate-pulse rounded-lg bg-slate-50" />
              ) : (
                <>
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-xs text-rose-700">Total pendiente</p>
                    <p className="text-lg font-bold text-rose-700">{fmt(totalPendingDebt)}</p>
                  </div>
                  {pendingDebts.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No hay ventas a crédito pendientes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pendingDebts.slice(0, 5).map((debt) => (
                        <div
                          className="flex items-center justify-between text-sm"
                          key={debt.id}
                        >
                          <span className="text-slate-700">{debt.customer.name}</span>
                          <span className="font-semibold text-rose-700">
                            {fmt(Number(debt.remainingAmount))}
                          </span>
                        </div>
                      ))}
                      {pendingDebts.length > 5 ? (
                        <p className="text-xs text-slate-400">
                          +{pendingDebts.length - 5} más...
                        </p>
                      ) : null}
                    </div>
                  )}
                  <Link
                    className="mt-3 block text-xs font-medium text-violet-600 hover:text-violet-800"
                    href="/debts"
                  >
                    Ver todas las ventas a crédito →
                  </Link>
                </>
              )}
            </div>

            {/* Panel 3 — Información adicional */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">
                Información adicional
              </h3>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Observaciones {!differenceIsZero ? <span className="text-rose-500">*</span> : null}
                </label>
                <textarea
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                    noteRequiredForDifference
                      ? "border-rose-300 focus:border-rose-500"
                      : "border-slate-200 focus:border-violet-500"
                  }`}
                  maxLength={200}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder={!differenceIsZero ? "Explicá el motivo de la diferencia..." : "Notas del cierre..."}
                  rows={3}
                  value={closingNotes}
                />
                {noteRequiredForDifference ? (
                  <p className="mt-1 text-xs text-rose-600">
                    Explicá el motivo de la diferencia antes de cerrar la caja.
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Cierre realizado por</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {session.cashierName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{session.cashierName}</p>
                    <p className="text-xs text-slate-500">
                      {dateFmt.format(now)} · {timeFmt.format(now)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onBack}
              type="button"
            >
              <X size={15} />
              Cancelar cierre
            </button>
            <div className="text-center">
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
                disabled={isSaving || noteRequiredForDifference}
                type="submit"
              >
                <Lock size={15} />
                {isSaving ? "Cerrando caja..." : "Cerrar caja y finalizar"}
              </button>
              {noteRequiredForDifference ? (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  Explicá el motivo de la diferencia antes de cerrar la caja.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">
                  Esta acción cerrará la sesión de caja del día.
                </p>
              )}
            </div>
          </div>
        </div>
      </form>

      {showAddExpense ? (
        <QuickExpenseModal
          onClose={() => setShowAddExpense(false)}
          onAdded={() => {
            setShowAddExpense(false);
            void loadData();
          }}
        />
      ) : null}

      {showConfirmClose ? (
        <ConfirmCloseModal
          cashierName={session.cashierName}
          closingAmount={closingAmount}
          difference={difference}
          expectedAmount={expectedAmount}
          isSaving={isSaving}
          onCancel={() => setShowConfirmClose(false)}
          onConfirm={() => void performClose()}
          openingAmount={openingAmount}
        />
      ) : null}
    </div>
  );
}

function SalesSummaryCard({
  label,
  amount,
  count,
  pct,
  bgClass,
  textClass,
}: {
  label: string;
  amount: number;
  count: number;
  pct: number;
  bgClass: string;
  textClass: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 p-4 ${bgClass}`}>
      <p className={`text-xs font-medium ${textClass} opacity-75`}>{label}</p>
      <p className={`mt-1 text-xl font-bold ${textClass}`}>{fmt(amount)}</p>
      <div className={`mt-2 flex items-center gap-2 text-xs ${textClass} opacity-60`}>
        <span>{count} ventas</span>
        <span>·</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}

function ConfirmCloseModal({
  cashierName,
  openingAmount,
  expectedAmount,
  closingAmount,
  difference,
  isSaving,
  onCancel,
  onConfirm,
}: {
  cashierName: string;
  openingAmount: number;
  expectedAmount: number;
  closingAmount: number;
  difference: number;
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const differenceIsZero = Math.abs(difference) < 0.005;
  const differenceIsPositive = difference > 0.005;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">Confirmar cierre de caja</h2>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-500">
            Revisá el resumen antes de confirmar. Esta acción cerrará la sesión de caja y no se
            puede deshacer.
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Cajero</dt>
              <dd className="font-medium text-slate-900">{cashierName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Monto de apertura</dt>
              <dd className="font-medium text-slate-900">{fmt(openingAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Monto esperado</dt>
              <dd className="font-medium text-slate-900">{fmt(expectedAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Monto contado</dt>
              <dd className="font-medium text-slate-900">{fmt(closingAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="text-slate-700">Diferencia</dt>
              <dd
                className={`font-bold ${
                  differenceIsZero
                    ? "text-emerald-700"
                    : differenceIsPositive
                      ? "text-amber-600"
                      : "text-rose-700"
                }`}
              >
                {difference >= 0 ? "+" : ""}
                {fmt(difference)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            disabled={isSaving}
            onClick={onConfirm}
            type="button"
          >
            <Lock size={14} />
            {isSaving ? "Cerrando caja..." : "Confirmar cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickExpenseModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("El monto debe ser un número positivo.");
      return;
    }
    if (!category.trim()) {
      setError("El concepto es requerido.");
      return;
    }
    if (!description.trim()) {
      setError("La descripción es requerida.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          category: category.trim(),
          description: description.trim(),
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        setError(body.error?.message ?? "No se pudo registrar el gasto.");
        return;
      }
      onAdded();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            Agregar gasto o retiro
          </h2>
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
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qe-amount">
                Monto <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  AR$
                </span>
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                  id="qe-amount"
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
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qe-category">
                Concepto <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                id="qe-category"
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Servicios, Suministros, Retiro..."
                type="text"
                value={category}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="qe-desc">
                Descripción <span className="text-rose-500">*</span>
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                id="qe-desc"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle del gasto o retiro..."
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
              {isSaving ? "Registrando..." : "Registrar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
