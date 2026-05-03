"use client";

import { type FormEvent, useEffect, useState } from "react";

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

type CreateCustomerResponse = {
  data?: CustomerRecord;
  error?: {
    message: string;
    details?: string[];
  };
};

export function CustomersList() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

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
          setLoadError("No se pudieron cargar los clientes.");
          setCustomers([]);
          return;
        }

        setCustomers(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudieron cargar los clientes.");
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
  }, [refreshKey]);

  function handleCustomerCreated() {
    setIsModalOpen(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Cliente registrado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <section className="px-5 py-6 sm:px-8">
      <div className="mb-4 flex justify-end">
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          Nuevo cliente
        </button>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError && customers.length === 0 ? <EmptyState /> : null}
      {!isLoading && !loadError && customers.length > 0 ? (
        <CustomersTable customers={customers} />
      ) : null}

      {isModalOpen ? (
        <CreateCustomerModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCustomerCreated}
        />
      ) : null}
    </section>
  );
}

type CreateCustomerModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateCustomerModal({ onClose, onSuccess }: CreateCustomerModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim()
        })
      });
      const responseBody = (await response.json()) as CreateCustomerResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo registrar el cliente."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el cliente.");
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
          <h2 className="text-sm font-semibold text-slate-950">Nuevo cliente</h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="customer-name" label="Nombre">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="customer-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              type="text"
              value={name}
            />
          </FormField>

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
              {isSubmitting ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-medium text-slate-700"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
    </div>
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
