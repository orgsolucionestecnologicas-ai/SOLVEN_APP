import { AppShell } from "../../ui/app-shell";
import { ProductEditView } from "./product-edit-view";

export default async function EditProductPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell activeSection="products">
      <ProductEditView productId={id} />
    </AppShell>
  );
}
