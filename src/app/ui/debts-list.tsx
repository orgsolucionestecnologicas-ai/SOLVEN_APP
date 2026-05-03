"use client";

import { useEffect, useState } from "react";

type DebtRecord = {
  id: string;
  customerId: string;
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

export function DebtsList() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

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
          setErrorMessage("No se pudieron cargar las deudas.");
          setDebts([]);
          return;
        }

        setDebts(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudieron cargar las deudas.");
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
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && !errorMessage && debts.length === 0 ? <EmptyState /> : null}
      {!isLoading && !errorMessage && debts.length > 0 ? (
        <DebtsTable debts={debts} />
      ) : null}
    </section>
  );
}

function DebtsTable({ debts }: { debts: DebtRecord[] }) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {debts.map((debt) => (
              <tr key={debt.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {debt.customerId}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {formatMoney(debt.totalAmount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-amber-700">
                  {formatMoney(debt.remainingAmount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(debt.createdAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(debt.updatedAt)}
                </td>
              </tr>
            ))}
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
