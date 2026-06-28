import { AppShell } from "../../ui/app-shell";
import { InventoryAdjustForm } from "../../ui/inventory-adjust-form";

export default function InventoryAdjustPage() {
  return (
    <AppShell activeSection="products">
      <InventoryAdjustForm />
    </AppShell>
  );
}
