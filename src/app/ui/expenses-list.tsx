"use client";

import { type FormEvent, useEffect, useState } from "react";

type ExpenseRecord = {
  id: string;
  amount: string;
  category: string;
  description: string;
  expenseDate: string;
  createdAt: string;
  updatedAt: string;
};

type ExpensesResponse = {
  data?: ExpenseRecord[];
  error?: {
    message: string;
  };
};

type CreateExpenseResponse = {
  data?: ExpenseRecord;
  error?: {
    message: string;
    details?: string[];
  };
};

export function ExpensesList() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadExpenses() {
      try {
        const response = await fetch("/api/expenses", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as ExpensesResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setLoadError("No se pudieron cargar los gastos.");
          setExpenses([]);
          return;
        }

        setExpenses(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudieron cargar los gastos.");
          setExpenses([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadExpenses();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  function handleExpenseCreated() {
    setIsModalOpen(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Gasto registrado exitosamente.");
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
          Nuevo gasto
        </button>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError && expenses.length === 0 ? <EmptyState /> : null}
      {!isLoading && !loadError && expenses.length > 0 ? (
        <ExpensesTable expenses={expenses} />
      ) : null}

      {isModalOpen ? (
        <CreateExpenseModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleExpenseCreated}
        />
      ) : null}
    </section>
  );
}

type CreateExpenseModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateExpenseModal({ onClose, onSuccess }: CreateExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayAsInputValue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: Number(amount),
          category: category.trim(),
          description: description.trim()
        })
      });
      const responseBody = (await response.json()) as CreateExpenseResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo registrar el gasto."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el gasto.");
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
          <h2 className="text-sm font-semibold text-slate-950">Nuevo gasto</h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="expense-amount" label="Monto">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="expense-amount"
              min="0.01"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </FormField>

          <FormField htmlFor="expense-category" label="Categoría">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="expense-category"
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Servicios"
              required
              type="text"
              value={category}
            />
          </FormField>

          <FormField htmlFor="expense-description" label="Descripción">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="expense-description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Pago de electricidad"
              required
              type="text"
              value={description}
            />
          </FormField>

          <FormField htmlFor="expense-date" label="Fecha">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="expense-date"
              onChange={(e) => setExpenseDate(e.target.value)}
              required
              type="date"
              value={expenseDate}
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
              {isSubmitting ? "Guardando..." : "Guardar gasto"}
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

function todayAsInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ExpensesTable({ expenses }: { expenses: ExpenseRecord[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Gastos registrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de salidas de dinero, categorías y descripciones.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Monto</TableHeader>
              <TableHeader>Categoría</TableHeader>
              <TableHeader>Descripción</TableHeader>
              <TableHeader>Fecha</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-rose-700">
                  {formatMoney(expense.amount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {expense.category}
                </td>
                <td className="max-w-xl px-5 py-4 text-sm text-slate-700">
                  {expense.description}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(expense.expenseDate)}
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
        Cargando gastos...
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
        No hay gastos registrados.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Los gastos aparecerán aquí cuando existan salidas de dinero en el sistema.
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
