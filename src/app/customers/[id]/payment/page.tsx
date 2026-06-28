import { AppShell } from "../../../ui/app-shell";
import { CustomerPaymentForm } from "../../../ui/customer-payment-form";

export default function CustomerPaymentPage() {
  return (
    <AppShell activeSection="customers">
      <CustomerPaymentForm />
    </AppShell>
  );
}
