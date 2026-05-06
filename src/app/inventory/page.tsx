import { AppShell } from "../ui/app-shell";
import { Inventory } from "../ui/inventory";

export default function InventoryPage() {
  return (
    <AppShell activeSection="inventory">
      <Inventory />
    </AppShell>
  );
}
