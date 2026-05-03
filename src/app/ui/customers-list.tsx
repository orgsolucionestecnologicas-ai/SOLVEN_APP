"use client";

import { useEffect, useState } from "react";

type CustomerRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type CustomersResponse = {
  data?: CustomerRecord[];
  error?: {
    message: string;
  };
};

export function CustomersList() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as CustomersResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setErrorMessage("No se pudieron cargar los clientes.");
          setCustomers([]);
          return;
        }

        setCustomers(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudieron cargar los clientes.");
          setCustomers([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && !errorMessage && customers.length === 0 ? <EmptyState /> : null}
      {!isLoading && !errorMessage && customers.length > 0 ? (
        <CustomersTable customers={customers} />
      ) : null}
    </section>
  );
}

function CustomersTable({ customers }: { customers: CustomerRecord[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Clientes registrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de clientes disponibles para ventas a crédito y seguimiento.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Registrado</TableHeader>
              <TableHeader>Actualizado</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {customer.name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(customer.createdAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(customer.updatedAt)}
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
        Cargando clientes...
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
        No hay clientes registrados.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Los clientes aparecerán aquí cuando existan registros en el sistema.
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
