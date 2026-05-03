"use client";

import { useEffect, useState } from "react";

type CashMovementRecord = {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  source: string;
  referenceId: string;
  movementDate: string;
  createdAt: string;
  updatedAt: string;
};

type CashMovementsResponse = {
  data?: CashMovementRecord[];
  error?: {
    message: string;
  };
};

export function CashMovementsList() {
  const [cashMovements, setCashMovements] = useState<CashMovementRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadCashMovements() {
      try {
        const response = await fetch("/api/cash-movements", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as CashMovementsResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setErrorMessage("No se pudieron cargar los movimientos de caja.");
          setCashMovements([]);
          return;
        }

        setCashMovements(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudieron cargar los movimientos de caja.");
          setCashMovements([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCashMovements();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && !errorMessage && cashMovements.length === 0 ? (
        <EmptyState />
      ) : null}
      {!isLoading && !errorMessage && cashMovements.length > 0 ? (
        <CashMovementsTable cashMovements={cashMovements} />
      ) : null}
    </section>
  );
}

function CashMovementsTable({
  cashMovements
}: {
  cashMovements: CashMovementRecord[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Movimientos registrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de entradas, salidas y referencias de caja.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Tipo</TableHeader>
              <TableHeader>Monto</TableHeader>
              <TableHeader>Origen</TableHeader>
              <TableHeader>Referencia</TableHeader>
              <TableHeader>Fecha</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {cashMovements.map((cashMovement) => (
              <tr key={cashMovement.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <CashMovementTypeBadge type={cashMovement.type} />
                </td>
                <td
                  className={
                    cashMovement.type === "IN"
                      ? "whitespace-nowrap px-5 py-4 text-sm font-semibold text-emerald-700"
                      : "whitespace-nowrap px-5 py-4 text-sm font-semibold text-rose-700"
                  }
                >
                  {formatMoney(cashMovement.amount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {cashMovement.source}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {cashMovement.referenceId}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(cashMovement.movementDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashMovementTypeBadge({ type }: { type: CashMovementRecord["type"] }) {
  const isCashIn = type === "IN";

  return (
    <span
      className={
        isCashIn
          ? "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
          : "inline-flex rounded-md bg-rose-50 px-2.5 py-1 text-sm font-medium text-rose-800"
      }
    >
      {isCashIn ? "Entrada" : "Salida"}
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

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando movimientos de caja...
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
        No hay movimientos de caja registrados.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Las entradas y salidas aparecerán aquí cuando existan movimientos en el sistema.
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
