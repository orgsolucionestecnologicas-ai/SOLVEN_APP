"use client";

import { useEffect, useState } from "react";

type SaleRecord = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  customerId: string | null;
  debtId: string | null;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
};

type SalesResponse = {
  data?: SaleRecord[];
  error?: {
    message: string;
  };
};

export function SalesList() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadSales() {
      try {
        const response = await fetch("/api/sales", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as SalesResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setErrorMessage("No se pudieron cargar las ventas.");
          setSales([]);
          return;
        }

        setSales(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudieron cargar las ventas.");
          setSales([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
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
      {!isLoading && !errorMessage && sales.length === 0 ? <EmptyState /> : null}
      {!isLoading && !errorMessage && sales.length > 0 ? (
        <SalesTable sales={sales} />
      ) : null}
    </section>
  );
}

function SalesTable({ sales }: { sales: SaleRecord[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Ventas registradas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de ventas, tipo de pago y referencias relacionadas.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Referencia</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Pago</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Deuda</TableHeader>
              <TableHeader>Fecha</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {formatSaleReference(sale.id)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-emerald-700">
                  {formatMoney(sale.totalAmount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <PaymentTypeBadge paymentType={sale.paymentType} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {sale.customerId ?? "Sin cliente"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {sale.debtId ?? "Sin deuda"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(sale.saleDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentTypeBadge({ paymentType }: { paymentType: SaleRecord["paymentType"] }) {
  const isCredit = paymentType === "CREDIT";

  return (
    <span
      className={
        isCredit
          ? "inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800"
          : "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
      }
    >
      {isCredit ? "Crédito" : "Contado"}
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
        Cargando ventas...
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
        No hay ventas registradas.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Las ventas aparecerán aquí cuando existan registros en el sistema.
      </p>
    </div>
  );
}

function formatSaleReference(id: string) {
  return `Venta ${id.slice(0, 8)}`;
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
