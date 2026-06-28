import { AppShell } from "../../ui/app-shell";
import { ProductForm } from "../../ui/product-form";

export default function NewProductPage() {
  return (
    <AppShell activeSection="products">
      <ProductForm />
    </AppShell>
  );
}
