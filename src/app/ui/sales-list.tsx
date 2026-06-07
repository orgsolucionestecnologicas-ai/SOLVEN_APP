"use client";

import { Eye, Printer, RotateCcw } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { formatARS } from "@/lib/format-currency";
import { Pagination } from "./pagination";

type SaleItemRecord = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product: { name: string };
  createdAt: string;
  updatedAt: string;
};

type SaleRecord = {
  id: string;
  folio: number;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  customerId: string | null;
  debtId: string | null;
  totalAmount: string;
  customer: { name: string } | null;
  items: SaleItemRecord[];
  createdAt: string;
  updatedAt: string;
};

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };

type SalesResponse = {
  data?: SaleRecord[];
  pagination?: PaginationMeta;
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
  pagination?: PaginationMeta;
  error?: { message: string };
};

type CustomerOption = {
  id: string;
  name: string;
};

type CustomersResponse = {
  data?: CustomerOption[];
  pagination?: PaginationMeta;
  error?: { message: string };
};

type SaleLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type ReturnResponse = {
  data?: { saleId: string; returnedItems: number; totalReturned: string };
  error?: { message: string };
};

type ReturnItemState = {
  productId: string;
  productName: string;
  maxQuantity: number;
  unitPrice: string;
  selected: boolean;
  returnQuantity: number;
};

export function SalesList() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);
  const [returningSale, setReturningSale] = useState<SaleRecord | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadSales() {
      try {
        const dateParams = showAllSales ? "" : `&from=${dateFilter}&to=${dateFilter}`;
        const response = await fetch(`/api/sales?page=${page}&limit=20${dateParams}`, {
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
        setTotalPages(responseBody.pagination?.totalPages ?? 1);
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
  }, [refreshKey, page, showAllSales, dateFilter]);

  function handleSaleCreated() {
    setIsModalOpen(false);
    setPage(1);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Venta registrada exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleReturnSuccess() {
    setReturningSale(null);
    setPage(1);
    setRefreshKey((k) => k + 1);
    setSuccessMessage("Devolución procesada exitosamente.");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  const displayedSales = [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  return (
    <section className="px-5 py-6 sm:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-900">
            {showAllSales ? "Historial completo" : "Ventas del día"}
          </p>
          {!showAllSales ? (
            <input
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-950 focus:border-violet-400 focus:outline-none"
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              type="date"
              value={dateFilter}
            />
          ) : null}
          <button
            className="text-xs font-medium text-violet-600 hover:text-violet-700"
            onClick={() => {
              setShowAllSales((v) => !v);
              setDateFilter(new Date().toISOString().slice(0, 10));
              setPage(1);
            }}
            type="button"
          >
            {showAllSales ? "← Filtrar por fecha" : "Ver historial completo →"}
          </button>
        </div>
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
      {!isLoading && !loadError && displayedSales.length === 0 ? (
        showAllSales ? <EmptyState /> : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Sin ventas para esta fecha.</p>
            <p className="mt-1 text-sm text-slate-500">No hay ventas registradas para la fecha seleccionada.</p>
            <button
              className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-700"
              onClick={() => setShowAllSales(true)}
              type="button"
            >
              Ver historial completo →
            </button>
          </div>
        )
      ) : null}
      {!isLoading && !loadError && displayedSales.length > 0 ? (
        <>
          <SaleCards
            onReturn={setReturningSale}
            onView={setViewingSale}
            sales={displayedSales}
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}

      {isModalOpen ? (
        <CreateSaleModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSaleCreated}
        />
      ) : null}

      {viewingSale ? (
        <SaleDetailModal
          onClose={() => setViewingSale(null)}
          sale={viewingSale}
        />
      ) : null}

      {returningSale ? (
        <ReturnModal
          onClose={() => setReturningSale(null)}
          onSuccess={handleReturnSuccess}
          sale={returningSale}
        />
      ) : null}
    </section>
  );
}

function SaleCards({
  sales,
  onView,
  onReturn
}: {
  sales: SaleRecord[];
  onView: (sale: SaleRecord) => void;
  onReturn: (sale: SaleRecord) => void;
}) {
  return (
    <div className="space-y-3">
      {sales.map((sale) => (
        <SaleCard key={sale.id} onReturn={onReturn} onView={onView} sale={sale} />
      ))}
    </div>
  );
}

function SaleCard({
  sale,
  onView,
  onReturn
}: {
  sale: SaleRecord;
  onView: (sale: SaleRecord) => void;
  onReturn: (sale: SaleRecord) => void;
}) {
  const productSummary =
    sale.items.length > 0
      ? sale.items.map((i) => `${i.product.name} ×${i.quantity}`).join(" · ")
      : "Sin ítems";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-950">
          Venta {formatFolio(sale.folio)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatDateTime(sale.saleDate)}
          </span>
          <PaymentTypeBadge paymentType={sale.paymentType} />
        </div>
      </div>

      {sale.customer ? (
        <p className="mt-1 text-xs text-slate-500">{sale.customer.name}</p>
      ) : null}

      <p className="mt-2 truncate text-xs text-slate-600">{productSummary}</p>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-slate-950">
          {formatMoney(sale.totalAmount)}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            onClick={() => onView(sale)}
            type="button"
          >
            <Eye size={12} />
            Ver
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={12} />
            Imprimir
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
            onClick={() => onReturn(sale)}
            type="button"
          >
            <RotateCcw size={12} />
            Devolver
          </button>
        </div>
      </div>
    </div>
  );
}

function SaleDetailModal({
  sale,
  onClose
}: {
  sale: SaleRecord;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Venta {formatFolio(sale.folio)}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {formatDateTime(sale.saleDate)}
            </span>
            <PaymentTypeBadge paymentType={sale.paymentType} />
          </div>

          {sale.customer ? (
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">
                Cliente
              </p>
              <p className="mt-0.5 text-sm text-slate-950">
                {sale.customer.name}
              </p>
            </div>
          ) : null}

          {sale.items.length > 0 ? (
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-slate-950">
                        {item.product.name}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {numberFormatter.format(item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-950">
                        {formatMoney(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end border-t border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-950">
                  Total:{" "}
                  <span className="text-emerald-700">
                    {formatMoney(sale.totalAmount)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin ítems registrados.</p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReturnModal({
  sale,
  onClose,
  onSuccess
}: {
  sale: SaleRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>(
    sale.items.map((item) => ({
      productId: item.productId,
      productName: item.product.name,
      maxQuantity: item.quantity,
      unitPrice: item.unitPrice,
      selected: false,
      returnQuantity: item.quantity
    }))
  );
  const [returnMethod, setReturnMethod] = useState<
    "Efectivo" | "Crédito a cuenta"
  >("Efectivo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedItems = returnItems.filter((i) => i.selected);

  function toggleItem(productId: string) {
    setReturnItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, selected: !i.selected } : i
      )
    );
  }

  function updateQuantity(productId: string, quantity: number) {
    setReturnItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? {
              ...i,
              returnQuantity: Math.max(1, Math.min(i.maxQuantity, quantity))
            }
          : i
      )
    );
  }

  async function handleConfirm() {
    if (selectedItems.length === 0) {
      setSubmitError("Seleccioná al menos un producto para devolver.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sale.id,
          items: selectedItems.map((i) => ({
            productId: i.productId,
            quantity: i.returnQuantity
          }))
        })
      });
      const responseBody = (await response.json()) as ReturnResponse;

      if (!response.ok || !responseBody.data) {
        setSubmitError(
          responseBody.error?.message ?? "No se pudo procesar la devolución."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo procesar la devolución.");
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
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            Devolución — Venta {formatFolio(sale.folio)}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {sale.items.length === 0 ? (
            <p className="text-sm text-slate-500">
              Esta venta no tiene ítems para devolver.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {returnItems.map((item) => (
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  key={item.productId}
                >
                  <input
                    checked={item.selected}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                    onChange={() => toggleItem(item.productId)}
                    type="checkbox"
                  />
                  <span className="flex-1 text-sm text-slate-950">
                    {item.productName}
                  </span>
                  <span className="text-xs text-slate-500">
                    Vendido: {numberFormatter.format(item.maxQuantity)}
                  </span>
                  <input
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-center text-sm text-slate-950 focus:border-slate-500 focus:outline-none disabled:opacity-40"
                    disabled={!item.selected || isSubmitting}
                    max={item.maxQuantity}
                    min={1}
                    onChange={(e) =>
                      updateQuantity(
                        item.productId,
                        parseInt(e.target.value, 10)
                      )
                    }
                    step={1}
                    type="number"
                    value={item.returnQuantity}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Método de devolución
            </p>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(["Efectivo", "Crédito a cuenta"] as const).map((method) => (
                <button
                  className={
                    returnMethod === method
                      ? "flex-1 rounded-md px-4 py-1.5 text-sm font-medium bg-slate-950 text-white"
                      : "flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
                  }
                  disabled={isSubmitting}
                  key={method}
                  onClick={() => setReturnMethod(method)}
                  type="button"
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

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
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            disabled={isSubmitting || selectedItems.length === 0}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting ? "Procesando..." : "Confirmar devolución"}
          </button>
        </div>
      </div>
    </div>
  );
}

type CreateSaleModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

function CreateSaleModal({ onClose, onSuccess }: CreateSaleModalProps) {
  const [paymentType, setPaymentType] = useState<"CASH" | "CREDIT">("CASH");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState<string | null>(
    null
  );
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customersLoadError, setCustomersLoadError] = useState<string | null>(
    null
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products?limit=1000", {
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

    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers?limit=1000", {
          headers: { Accept: "application/json" }
        });
        const responseBody = (await response.json()) as CustomersResponse;

        if (!response.ok || !responseBody.data) {
          setCustomersLoadError("No se pudieron cargar los clientes.");
          return;
        }

        setCustomers(responseBody.data);
        if (responseBody.data.length > 0) {
          setSelectedCustomerId(responseBody.data[0].id);
        }
      } catch {
        setCustomersLoadError("No se pudieron cargar los clientes.");
      } finally {
        setIsLoadingCustomers(false);
      }
    }

    void loadProducts();
    void loadCustomers();
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

    if (paymentType === "CREDIT" && !selectedCustomerId) {
      setSubmitError("Debés seleccionar un cliente para la venta a crédito.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType,
          ...(paymentType === "CREDIT" ? { customerId: selectedCustomerId } : {}),
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
            Nueva venta — {paymentType === "CASH" ? "Contado" : "Fiado"}
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
              <p className="mb-2 text-sm font-medium text-slate-700">
                Tipo de pago
              </p>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <button
                  className={
                    paymentType === "CASH"
                      ? "flex-1 rounded-md px-4 py-1.5 text-sm font-medium bg-slate-950 text-white"
                      : "flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
                  }
                  disabled={isSubmitting}
                  onClick={() => {
                    setPaymentType("CASH");
                    setSelectedCustomerId("");
                  }}
                  type="button"
                >
                  Contado
                </button>
                <button
                  className={
                    paymentType === "CREDIT"
                      ? "flex-1 rounded-md px-4 py-1.5 text-sm font-medium bg-slate-950 text-white"
                      : "flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
                  }
                  disabled={isSubmitting}
                  onClick={() => {
                    setPaymentType("CREDIT");
                    if (!selectedCustomerId && customers.length > 0) {
                      setSelectedCustomerId(customers[0].id);
                    }
                  }}
                  type="button"
                >
                  Fiado
                </button>
              </div>
            </div>

            {paymentType === "CREDIT" ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  Cliente
                </p>
                {isLoadingCustomers ? (
                  <p className="text-sm text-slate-500">
                    Cargando clientes...
                  </p>
                ) : customersLoadError ? (
                  <p className="text-sm text-rose-700">{customersLoadError}</p>
                ) : customers.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay clientes registrados. Crea un cliente primero.
                  </p>
                ) : (
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                    disabled={isSubmitting}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    value={selectedCustomerId}
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : null}

            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">
                Agregar producto
              </p>

              {isLoadingProducts ? (
                <p className="text-sm text-slate-500">
                  Cargando productos...
                </p>
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
                  Precio de venta: {formatMoney(selectedProduct.salePrice)} ·
                  Stock disponible:{" "}
                  {numberFormatter.format(selectedProduct.stock)}
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
                  No hay productos en la venta. Seleccioná un producto y hacé
                  clic en Agregar.
                </p>
              </div>
            )}

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-900">
                  {submitError}
                </p>
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

function PaymentTypeBadge({
  paymentType
}: {
  paymentType: SaleRecord["paymentType"];
}) {
  const isCredit = paymentType === "CREDIT";

  return (
    <span
      className={
        isCredit
          ? "inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
          : "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
      }
    >
      {isCredit ? "Fiado" : "Contado"}
    </span>
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

function formatMoney(value: string) {
  return formatARS(Number(value));
}

function formatFolio(folio: number) {
  return `#${String(folio).padStart(4, "0")}`;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

const numberFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
