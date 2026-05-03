import { AppShell } from "../ui/app-shell";
import { ProductsInventory } from "../ui/products-inventory";

export default function ProductsPage() {
  return (
    <AppShell
      activeSection="products"
      eyebrow="Productos"
      title="Inventario"
    >
      <ProductsInventory />
    </AppShell>
  );
}
