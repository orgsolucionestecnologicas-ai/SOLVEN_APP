import { AppShell } from "../ui/app-shell";
import { CashMovementsList } from "../ui/cash-movements-list";

export default function CashMovementsPage() {
  return (
    <AppShell activeSection="cashMovements">
      <CashMovementsList />
    </AppShell>
  );
}
