import { AppShell } from "../../ui/app-shell";
import { CustomerDetail } from "../../ui/customer-detail";

export default function CustomerDetailPage() {
  return (
    <AppShell activeSection="customers">
      <CustomerDetail />
    </AppShell>
  );
}
