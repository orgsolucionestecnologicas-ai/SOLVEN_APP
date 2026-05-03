"use client";

import { useEffect, useState } from "react";

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

export function ExpensesList() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

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
          setErrorMessage("No se pudieron cargar los gastos.");
          setExpenses([]);
          return;
        }

        setExpenses(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudieron cargar los gastos.");
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
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && !errorMessage && expenses.length === 0 ? <EmptyState /> : null}
      {!isLoading && !errorMessage && expenses.length > 0 ? (
        <ExpensesTable expenses={expenses} />
      ) : null}
    </section>
  );
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
