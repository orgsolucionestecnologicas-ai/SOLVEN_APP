"use client";

import { type FormEvent, useEffect, useState } from "react";

type ProductRecord = {
  id: string;
  name: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

type ProductsResponse = {
  data?: ProductRecord[];
  error?: {
    message: string;
  };
};

type CreateProductResponse = {
  data?: ProductRecord;
  error?: {
    message: string;
    details?: string[];
  };
};

type StockAdjustmentResponse = {
  data?: { product: ProductRecord; inventoryMovement: { id: string } };
  error?: {
    message: string;
    details?: string[];
  };
};

export function ProductsInventory() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as ProductsResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
          return;
        }

        setProducts(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  function handleProductCreated() {
    setIsModalOpen(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Producto creado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleStockAdjusted() {
    setSelectedProduct(null);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Stock actualizado exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <section className="px-5 py-6 sm:px-8">
      <div className="mb-4 flex justify-end">
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          Nuevo producto
        </button>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError && products.length === 0 ? <EmptyState /> : null}
      {!isLoading && !loadError && products.length > 0 ? (
        <InventoryTable onAdjustStock={setSelectedProduct} products={products} />
      ) : null}

      {isModalOpen ? (
        <CreateProductModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleProductCreated}
        />
      ) : null}

      {selectedProduct ? (
        <AdjustStockModal
          onClose={() => setSelectedProduct(null)}
          onSuccess={handleStockAdjusted}
          product={selectedProduct}
        />
      ) : null}
    </section>
  );
}

type CreateProductModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateProductModal({ onClose, onSuccess }: CreateProductModalProps) {
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          costPrice: Number(costPrice),
          salePrice: Number(salePrice),
          stock: Number(stock)
        })
      });
      const responseBody = (await response.json()) as CreateProductResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo guardar el producto."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Nuevo producto
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="product-name" label="Nombre">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Arroz blanco"
              required
              type="text"
              value={name}
            />
          </FormField>

          <FormField htmlFor="product-cost-price" label="Precio de costo">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-cost-price"
              min="0"
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={costPrice}
            />
          </FormField>

          <FormField htmlFor="product-sale-price" label="Precio de venta">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-sale-price"
              min="0"
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={salePrice}
            />
          </FormField>

          <FormField htmlFor="product-stock" label="Stock inicial">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-stock"
              min="0"
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              required
              step="1"
              type="number"
              value={stock}
            />
          </FormField>

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-medium text-slate-700"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type AdjustStockModalProps = {
  product: ProductRecord;
  onClose: () => void;
  onSuccess: () => void;
};

function AdjustStockModal({ product, onClose, onSuccess }: AdjustStockModalProps) {
  const [newStock, setNewStock] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const newStockNumber = newStock === "" ? null : parseInt(newStock, 10);
  const difference =
    newStockNumber !== null && Number.isInteger(newStockNumber)
      ? newStockNumber - product.stock
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/inventory-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          newStock: Number(newStock),
          reason: reason.trim()
        })
      });
      const responseBody = (await response.json()) as StockAdjustmentResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo ajustar el stock."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo ajustar el stock.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Ajustar stock
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Producto</dt>
              <dd className="text-sm font-medium text-slate-950">
                {product.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Stock actual</dt>
              <dd className="text-sm font-semibold text-slate-950">
                {numberFormatter.format(product.stock)}
              </dd>
            </div>
          </dl>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="new-stock" label="Nuevo stock">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="new-stock"
              min="0"
              onChange={(e) => setNewStock(e.target.value)}
              placeholder="0"
              required
              step="1"
              type="number"
              value={newStock}
            />
            {difference !== null ? (
              <p
                className={
                  difference === 0
                    ? "mt-1 text-xs text-slate-500"
                    : difference > 0
                      ? "mt-1 text-xs text-emerald-700"
                      : "mt-1 text-xs text-rose-700"
                }
              >
                {difference > 0
                  ? `+${numberFormatter.format(difference)} unidades`
                  : difference < 0
                    ? `${numberFormatter.format(difference)} unidades`
                    : "Sin cambio"}
              </p>
            ) : null}
          </FormField>

          <FormField htmlFor="adjustment-reason" label="Motivo del ajuste">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="adjustment-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico, merma, donación"
              required
              type="text"
              value={reason}
            />
          </FormField>

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type InventoryTableProps = {
  products: ProductRecord[];
  onAdjustStock: (product: ProductRecord) => void;
};

function InventoryTable({ products, onAdjustStock }: InventoryTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Productos registrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de productos, precios y existencias actuales.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Costo</TableHeader>
              <TableHeader>Precio de venta</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Actualizado</TableHeader>
              <TableHeader>Acción</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {product.name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {formatMoney(product.costPrice)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {formatMoney(product.salePrice)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <StockBadge stock={product.stock} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(product.updatedAt)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => onAdjustStock(product)}
                    type="button"
                  >
                    Ajustar stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
      {children}
    </th>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const isLowStock = stock <= 5;

  return (
    <span
      className={
        isLowStock
          ? "inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800"
          : "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
      }
    >
      {numberFormatter.format(stock)}
    </span>
  );
}

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando inventario...
      </p>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="h-16 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-medium text-rose-900">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        No hay productos registrados.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        El inventario aparecerá aquí cuando existan productos en el sistema.
      </p>
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

const moneyFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
