"use client";

import { type FormEvent, useEffect, useState } from "react";

type SaleRecord = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  customerId: string | null;
  debtId: string | null;
  totalAmount: string;
  customer: { name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type SalesResponse = {
  data?: SaleRecord[];
  error?: {
    message: string;
  };
};

type CreateSaleResponse = {
  data?: SaleRecord;
  error?: {
    message: string;
    details?: string[];
  };
};

type ProductOption = {
  id: string;
  name: string;
  salePrice: string;
  stock: number;
};

type ProductsResponse = {
  data?: ProductOption[];
  error?: { message: string };
};

type SaleLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export function SalesList() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadSales() {
      try {
        const response = await fetch("/api/sales", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as SalesResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setLoadError("No se pudieron cargar las ventas.");
          setSales([]);
          return;
        }

        setSales(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudieron cargar las ventas.");
          setSales([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSales();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  function handleSaleCreated() {
    setIsModalOpen(false);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Venta registrada exitosamente.");
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
          Nueva venta
        </button>
      </div>

      {successMessage ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}
      {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
      {!isLoading && !loadError && sales.length === 0 ? <EmptyState /> : null}
      {!isLoading && !loadError && sales.length > 0 ? (
        <SalesTable sales={sales} />
      ) : null}

      {isModalOpen ? (
        <CreateSaleModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaleCreated}
        />
      ) : null}
    </section>
  );
}

type CreateSaleModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateSaleModal({ onClose, onSuccess }: CreateSaleModalProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          headers: { Accept: "application/json" }
        });
        const responseBody = (await response.json()) as ProductsResponse;

        if (!response.ok || !responseBody.data) {
          setProductsLoadError("No se pudieron cargar los productos.");
          return;
        }

        setProducts(responseBody.data);
        if (responseBody.data.length > 0) {
          setSelectedProductId(responseBody.data[0].id);
        }
      } catch {
        setProductsLoadError("No se pudieron cargar los productos.");
      } finally {
        setIsLoadingProducts(false);
      }
    }

    void loadProducts();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function handleAddItem() {
    if (!selectedProduct) {
      return;
    }

    const quantity = parseInt(quantityInput, 10);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }

    const unitPrice = Number(selectedProduct.salePrice);

    setLineItems((prev) => {
      const existing = prev.find((item) => item.productId === selectedProductId);

      if (existing) {
        return prev.map((item) =>
          item.productId === selectedProductId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: selectedProductId,
          productName: selectedProduct.name,
          quantity,
          unitPrice
        }
      ];
    });

    setQuantityInput("1");
  }

  function handleRemoveItem(productId: string) {
    setLineItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  const saleTotal = lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (lineItems.length === 0) {
      setSubmitError("Debés agregar al menos un producto.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: "CASH",
          items: lineItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
      });
      const responseBody = (await response.json()) as CreateSaleResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo registrar la venta."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar la venta.");
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
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Nueva venta — Contado
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Agregar producto
              </p>

              {isLoadingProducts ? (
                <p className="text-sm text-slate-500">Cargando productos...</p>
              ) : productsLoadError ? (
                <p className="text-sm text-rose-700">{productsLoadError}</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay productos disponibles.
                </p>
              ) : (
                <div className="flex gap-3">
                  <select
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                    disabled={isSubmitting}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    value={selectedProductId}
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                    disabled={isSubmitting}
                    min="1"
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Cant."
                    step="1"
                    type="number"
                    value={quantityInput}
                  />

                  <button
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={isSubmitting || !selectedProduct}
                    onClick={handleAddItem}
                    type="button"
                  >
                    Agregar
                  </button>
                </div>
              )}

              {selectedProduct ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Precio de venta: {formatMoney(selectedProduct.salePrice)} · Stock disponible: {numberFormatter.format(selectedProduct.stock)}
                </p>
              ) : null}
            </div>

            {lineItems.length > 0 ? (
              <div className="rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">
                        Producto
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">
                        Cant.
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">
                        Precio unit.
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">
                        Total
                      </th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {lineItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-950">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {numberFormatter.format(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">
                          {formatMoney(String(item.unitPrice))}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-950">
                          {formatMoney(String(item.unitPrice * item.quantity))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="text-xs text-slate-400 hover:text-rose-600"
                            disabled={isSubmitting}
                            onClick={() => handleRemoveItem(item.productId)}
                            type="button"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end border-t border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">
                    Total:{" "}
                    <span className="text-emerald-700">
                      {formatMoney(String(saleTotal))}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center">
                <p className="text-sm text-slate-500">
                  No hay productos en la venta. Seleccioná un producto y hacé clic en Agregar.
                </p>
              </div>
            )}

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-900">{submitError}</p>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
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
              disabled={isSubmitting || lineItems.length === 0}
              type="submit"
            >
              {isSubmitting ? "Registrando..." : "Registrar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalesTable({ sales }: { sales: SaleRecord[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Ventas registradas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de ventas, tipo de pago y referencias relacionadas.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Referencia</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Pago</TableHeader>
              <TableHeader>Cliente</TableHeader>
              <TableHeader>Deuda</TableHeader>
              <TableHeader>Fecha</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {formatSaleReference(sale.id)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-emerald-700">
                  {formatMoney(sale.totalAmount)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <PaymentTypeBadge paymentType={sale.paymentType} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {sale.customer?.name ?? "Sin cliente"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {sale.debtId ?? "Sin deuda"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(sale.saleDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentTypeBadge({ paymentType }: { paymentType: SaleRecord["paymentType"] }) {
  const isCredit = paymentType === "CREDIT";

  return (
    <span
      className={
        isCredit
          ? "inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800"
          : "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
      }
    >
      {isCredit ? "Crédito" : "Contado"}
    </span>
  );
}

function TableHeader({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
      {children}
    </th>
  );
}

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando ventas...
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
        No hay ventas registradas.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Las ventas aparecerán aquí cuando existan registros en el sistema.
      </p>
    </div>
  );
}

function formatSaleReference(id: string) {
  return `Venta ${id.slice(0, 8)}`;
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
