import { AppShell } from "../ui/app-shell";
import { ExpensesList } from "../ui/expenses-list";

export default function ExpensesPage() {
  return (
    <AppShell activeSection="expenses" eyebrow="Gastos" title="Control de gastos">
      <ExpensesList />
    </AppShell>
  );
}
