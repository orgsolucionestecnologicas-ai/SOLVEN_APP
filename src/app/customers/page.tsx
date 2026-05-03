import { AppShell } from "../ui/app-shell";
import { CustomersList } from "../ui/customers-list";

export default function CustomersPage() {
  return (
    <AppShell activeSection="customers" eyebrow="Clientes" title="Clientes">
      <CustomersList />
    </AppShell>
  );
}
