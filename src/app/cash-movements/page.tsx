import { AppShell } from "../ui/app-shell";
import { CashMovementsList } from "../ui/cash-movements-list";

export default function CashMovementsPage() {
  return (
    <AppShell activeSection="cashMovements" eyebrow="Caja" title="Movimientos de caja">
      <CashMovementsList />
    </AppShell>
  );
}
