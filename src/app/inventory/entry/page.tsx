import { AppShell } from "../../ui/app-shell";
import { InventoryEntryForm } from "../../ui/inventory-entry-form";

export default function InventoryEntryPage() {
  return (
    <AppShell activeSection="inventory">
      <InventoryEntryForm />
    </AppShell>
  );
}
