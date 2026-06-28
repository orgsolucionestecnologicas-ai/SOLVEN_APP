import { AppShell } from "../ui/app-shell";
import { SalesList } from "../ui/sales-list";

export default function SalesPage() {
  return (
    <AppShell activeSection="sales" eyebrow="Ventas" title="Ventas registradas">
      <SalesList />
    </AppShell>
  );
}
