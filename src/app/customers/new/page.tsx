import { AppShell } from "../../ui/app-shell";
import { CustomerNewForm } from "../../ui/customer-new-form";

export default function NewCustomerPage() {
  return (
    <AppShell activeSection="customers">
      <CustomerNewForm />
    </AppShell>
  );
}
