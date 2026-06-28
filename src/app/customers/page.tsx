import { AppShell } from "../ui/app-shell";
import { CustomersList } from "../ui/customers-list";

export default function CustomersPage() {
  return (
    <AppShell activeSection="customers">
      <CustomersList />
    </AppShell>
  );
}
