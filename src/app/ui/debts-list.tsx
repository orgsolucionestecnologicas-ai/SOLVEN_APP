"use client";

import { type FormEvent, useEffect, useState } from "react";

type DebtRecord = {
  id: string;
  customerId: string;
  customer: { name: string };
  totalAmount: string;
  remainingAmount: string;
  createdAt: string;
  updatedAt: string;
};

type DebtsResponse = {
  data?: DebtRecord[];
  error?: {
    message: string;
  };
};

type DebtPaymentResponse = {
  data?: { id: string };
  error?: {
    message: string;
    details?: string[];
  };
};

export function DebtsList() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadDebts() {
      try {
        const response = await fetch("/api/debts", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as DebtsResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setLoadError("No se pudieron cargar las deudas.");
          setDebts([]);
          return;
        }

        setDebts(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudieron cargar las deudas.");
          setDebts([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDebts();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  function handlePaymentRegistered() {
    setSelectedDebt(null);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Pago registrado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <section className="px-5 py-6 sm:px-8">
      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError && debts.length === 0 ? <EmptyState /> : null}
      {!isLoading && !loadError && debts.length > 0 ? (
        <DebtsTable debts={debts} onPayDebt={setSelectedDebt} />
      ) : null}

      {selectedDebt ? (
        <RegisterDebtPaymentModal
          debt={selectedDebt}
          onClose={() => setSelectedDebt(null)}
          onSuccess={handlePaymentRegistered}
        />
      ) : null}
    </section>
  );
}

type RegisterDebtPaymentModalProps = {
  debt: DebtRecord;
  onClose: () => void;
  onSuccess: () => void;
};

function RegisterDebtPaymentModal({
  debt,
  onClose,
  onSuccess
}: RegisterDebtPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const remainingAmount = Number(debt.remainingAmount);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setSubmitError("El monto debe ser mayor a cero.");
      return;
    }

    if (paymentAmount > remainingAmount) {
      setSubmitError(
        `El pago no puede superar el saldo pendiente de ${formatMoney(debt.remainingAmount)}.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/debt-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId: debt.id,
          amount: paymentAmount
        })
      });
      const responseBody = (await response.json()) as DebtPaymentResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo registrar el pago."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Registrar pago
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Cliente</dt>
              <dd className="text-sm font-medium text-slate-950">
                {debt.customer.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Monto total</dt>
              <dd className="text-sm text-slate-700">
                {formatMoney(debt.totalAmount)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Saldo pendiente</dt>
              <dd className="text-sm font-semibold text-amber-700">
                {formatMoney(debt.remainingAmount)}
              </dd>
            </div>
          </dl>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="payment-amount"
            >
              Monto a pagar
            </label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="payment-amount"
              max={remainingAmount}
              min="0.01"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
            <p className="mt-1 text-xs text-slate-500">
              Máximo: {formatMoney(debt.remainingAmount)}
            </p>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type DebtsTableProps = {
  debts: DebtRecord[];
  onPayDebt: (debt: DebtRecord) => void;
};

function DebtsTable({ debts, onPayDebt }: DebtsTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Deudas registradas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de cuentas por cobrar y saldos pendientes.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Monto total</TableHeader>
              <TableHeader>Saldo pendiente</TableHeader>
              <TableHeader>Registrada</TableHeader>
              <TableHeader>Actualizada</TableHeader>
              <TableHeader>Acción</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {debts.map((debt) => {
              const isPaid = Number(debt.remainingAmount) === 0;

              return (
                <tr key={debt.id}>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                    {debt.customer.name}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                    {formatMoney(debt.totalAmount)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    {isPaid ? (
                      <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800">
                        Pagado
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        {formatMoney(debt.remainingAmount)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {formatDate(debt.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {formatDate(debt.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    {isPaid ? null : (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => onPayDebt(debt)}
                        type="button"
                      >
                        Registrar pago
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando deudas...
      </p>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="h-16 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
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

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        No hay deudas registradas.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Las cuentas por cobrar aparecerán aquí cuando existan ventas a crédito.
      </p>
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
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
