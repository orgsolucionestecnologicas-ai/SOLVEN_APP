import { AppShell } from "../ui/app-shell";
import { DebtsList } from "../ui/debts-list";

export default function DebtsPage() {
  return (
    <AppShell activeSection="debts" eyebrow="Deudas" title="Cuentas por cobrar">
      <DebtsList />
    </AppShell>
  );
}
