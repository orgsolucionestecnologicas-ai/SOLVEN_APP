"use client";

import { useEffect, useState } from "react";

import { ProductForm } from "../../ui/product-form";
import { ProductMovementsTimeline } from "../../ui/product-detail";

type ProductData = {
  id: string;
  name: string;
  categoryName: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  minStock: number;
  maxStock: number | null;
  productCode: string | null;
};

type ApiResponse = {
  data?: ProductData;
  error?: { message: string };
};

export function ProductEditView({ productId }: { productId: string }) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((body: ApiResponse) => {
        if (body.data) setProduct(body.data);
        else setError(body.error?.message ?? "No se pudo cargar el producto.");
      })
      .catch(() => setError("No se pudo cargar el producto."))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-slate-500">Cargando producto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-rose-600">{error ?? "Producto no encontrado."}</p>
      </div>
    );
  }

  return (
    <div>
      <ProductForm
        initialData={{
          name: product.name,
          categoryName: product.categoryName,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          stock: product.stock,
          minStock: product.minStock,
          maxStock: product.maxStock,
          productCode: product.productCode
        }}
        productId={productId}
      />
      <ProductMovementsTimeline productId={productId} />
    </div>
  );
}
