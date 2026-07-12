"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, History, PackageX, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaleItem = {
  id: string;
  productId: string | null;
  serviceId: string | null;
  quantity: number;
  unitPrice: string;
  total: string;
  product: { name: string } | null;
  service: { name: string } | null;
};

type Sale = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
  customer: { name: string } | null;
  items: SaleItem[];
};

type SalesResponse = {
  data?: Sale[];
  error?: { message: string };
};

type ReturnResult = {
  saleId: string;
  returnedItems: number;
  totalReturned: string;
};

type ReturnResponse = {
  data?: ReturnResult;
  error?: { message: string };
};

type ReturnHistoryItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
};

type ReturnHistoryRecord = {
  id: string;
  saleId: string;
  totalAmount: string;
  createdAt: string;
  reasonCategory: ReturnReasonCategory;
  reasonNote: string | null;
  sale: { id: string; saleDate: string; customerName: string | null };
  items: ReturnHistoryItem[];
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type ReturnHistoryResponse = {
  data?: ReturnHistoryRecord[];
  pagination?: PaginationMeta;
  error?: { message: string };
};

type UserSummary = {
  id: string;
  name: string;
};

type UsersResponse = {
  data?: UserSummary[];
  error?: { message: string };
};

type ReturnReasonCategory = "DEFECTO" | "ERROR_VENTA" | "CAMBIO_OPINION" | "OTRO";

type ProductStockResponse = {
  data?: { id: string; stock: number };
  error?: { message: string };
};

const RETURN_REASON_OPTIONS: { value: ReturnReasonCategory; label: string }[] = [
  { value: "DEFECTO", label: "Producto defectuoso" },
  { value: "ERROR_VENTA", label: "Error en la venta" },
  { value: "CAMBIO_OPINION", label: "Cambio de opinión del cliente" },
  { value: "OTRO", label: "Otro" }
];

// ─── Formatters ───────────────────────────────────────────────────────────────

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(value: string | number) {
  return moneyFormatter.format(Number(value));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Returns() {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restockByProduct, setRestockByProduct] = useState<Record<string, boolean>>({});
  const [productStockById, setProductStockById] = useState<Record<string, number>>({});
  const [formStep, setFormStep] = useState<"form" | "confirm">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory | "">("");
  const [reasonNote, setReasonNote] = useState("");

  useEffect(() => {
    fetch("/api/sales", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((body: SalesResponse) => {
        if (body.data) setSales(body.data);
        else setLoadError("No se pudieron cargar las ventas.");
      })
      .catch(() => setLoadError("No se pudieron cargar las ventas."))
      .finally(() => setLoading(false));
  }, []);

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase().trim();
    return sales.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.customer?.name.toLowerCase().includes(q) ||
        formatDate(s.saleDate).includes(q)
    );
  }, [sales, searchQuery]);

  function handleSelectSale(sale: Sale) {
    setSelectedSale(sale);
    setReturnResult(null);
    setSubmitError(null);
    setReasonCategory("");
    setReasonNote("");
    setFormStep("form");
    const initial: Record<string, number> = {};
    const initialRestock: Record<string, boolean> = {};
    for (const item of sale.items) {
      if (item.productId) {
        initial[item.productId] = 0;
        initialRestock[item.productId] = true;
      }
    }
    setReturnQuantities(initial);
    setRestockByProduct(initialRestock);
    setProductStockById({});

    const productIds = Object.keys(initial);
    Promise.all(
      productIds.map((productId) =>
        fetch(`/api/products/${productId}`, { headers: { Accept: "application/json" } })
          .then((res) => res.json())
          .then((body: ProductStockResponse) => [productId, body.data?.stock] as const)
          .catch(() => [productId, undefined] as const)
      )
    ).then((results) => {
      const stockById: Record<string, number> = {};
      for (const [productId, stock] of results) {
        if (typeof stock === "number") stockById[productId] = stock;
      }
      setProductStockById(stockById);
    });
  }

  function handleQuantityChange(productId: string, value: string, max: number) {
    const parsed = parseInt(value, 10);
    const qty = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, max));
    setReturnQuantities((prev) => ({ ...prev, [productId]: qty }));
  }

  function handleRestockChange(productId: string, restock: boolean) {
    setRestockByProduct((prev) => ({ ...prev, [productId]: restock }));
  }

  const productItems = selectedSale?.items.filter((i) => i.productId) ?? [];
  const hasItemsToReturn = Object.values(returnQuantities).some((q) => q > 0);
  const canSubmit = hasItemsToReturn && reasonCategory !== "";

  const previewTotal = productItems.reduce((acc, item) => {
    const qty = returnQuantities[item.productId!] ?? 0;
    return acc + qty * Number(item.unitPrice);
  }, 0);

  async function handleSubmit() {
    if (!selectedSale || !canSubmit) return;

    const items = productItems
      .filter((item) => (returnQuantities[item.productId!] ?? 0) > 0)
      .map((item) => ({
        productId: item.productId!,
        quantity: returnQuantities[item.productId!],
        restock: restockByProduct[item.productId!] ?? true
      }));

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: selectedSale.id,
          items,
          reasonCategory,
          reasonNote: reasonNote.trim() || undefined
        })
      });
      const body = (await res.json()) as ReturnResponse;
      if (!res.ok || !body.data) {
        setSubmitError(body.error?.message ?? "No se pudo procesar la devolución.");
        return;
      }
      setReturnResult(body.data);
      setSelectedSale(null);
    } catch {
      setSubmitError("No se pudo procesar la devolución.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <RotateCcw className="h-4 w-4" />
          <span>Operaciones</span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900">Devoluciones</span>
        </div>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Devoluciones</h1>

        <div className="mt-4 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === "new"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            Nueva devolución
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === "history"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="h-4 w-4" />
            Historial
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        <ReturnHistoryPanel />
      ) : (
      <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Success banner */}
        {returnResult ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="font-semibold text-emerald-900">Devolución procesada exitosamente</p>
              <p className="mt-1 text-sm text-emerald-700">
                {returnResult.returnedItems} {returnResult.returnedItems === 1 ? "ítem devuelto" : "ítems devueltos"} ·{" "}
                Monto devuelto: <strong>{formatMoney(returnResult.totalReturned)}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReturnResult(null)}
              className="text-emerald-500 hover:text-emerald-700"
            >
              ✕
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Left: Sales list */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Seleccioná una venta</h2>
                <p className="mt-0.5 text-xs text-slate-500">Buscá por ID, cliente o fecha</p>
              </div>

              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                    placeholder="Buscar venta..."
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : loadError ? (
                  <p className="p-4 text-sm text-rose-600">{loadError}</p>
                ) : filteredSales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PackageX className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No se encontraron ventas</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => {
                    const isSelected = selectedSale?.id === sale.id;
                    const productCount = sale.items.filter((i) => i.productId).length;
                    return (
                      <button
                        key={sale.id}
                        type="button"
                        onClick={() => handleSelectSale(sale)}
                        className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                          isSelected
                            ? "bg-violet-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-violet-600" : "bg-slate-100"}`}>
                          <RotateCcw className={`h-4 w-4 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              #{sale.id.slice(-8).toUpperCase()}
                            </p>
                            <p className="shrink-0 text-sm font-semibold text-slate-900">
                              {formatMoney(sale.totalAmount)}
                            </p>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <p className="text-xs text-slate-500">{formatDate(sale.saleDate)}</p>
                            <span className="text-slate-300">·</span>
                            <span className={`text-xs font-medium ${sale.paymentType === "CASH" ? "text-emerald-600" : "text-amber-600"}`}>
                              {sale.paymentType === "CASH" ? "Efectivo" : "Crédito"}
                            </span>
                            {sale.customer ? (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="truncate text-xs text-slate-500">{sale.customer.name}</span>
                              </>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {productCount} {productCount === 1 ? "producto" : "productos"}
                            {sale.items.length > productCount ? ` + ${sale.items.length - productCount} servicio(s)` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Return form */}
          <div className="flex flex-col gap-4">
            {!selectedSale ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
                <RotateCcw className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Seleccioná una venta</p>
                <p className="mt-1 text-xs text-slate-400">Los ítems aparecerán aquí para procesar la devolución</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Venta #{selectedSale.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(selectedSale.saleDate)} · {selectedSale.paymentType === "CASH" ? "Efectivo" : "Crédito"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedSale(null); setReturnResult(null); }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Cambiar
                    </button>
                  </div>
                </div>

                {productItems.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-slate-500">Esta venta no tiene productos devolvibles.</p>
                    <p className="mt-1 text-xs text-slate-400">Solo los productos de inventario pueden devolverse.</p>
                  </div>
                ) : formStep === "confirm" ? (
                  <ReturnConfirmStep
                    items={productItems}
                    quantities={returnQuantities}
                    restockByProduct={restockByProduct}
                    reasonCategory={reasonCategory}
                    reasonNote={reasonNote}
                    total={previewTotal}
                    isSubmitting={isSubmitting}
                    submitError={submitError}
                    onBack={() => setFormStep("form")}
                    onConfirm={handleSubmit}
                  />
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {productItems.map((item) => {
                        const maxQty = item.quantity;
                        const currentQty = returnQuantities[item.productId!] ?? 0;
                        const restock = restockByProduct[item.productId!] ?? true;
                        return (
                          <div key={item.id} className="flex flex-col gap-2 px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {item.product?.name ?? "Producto"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Vendidos: {maxQty} · {formatMoney(item.unitPrice)} c/u
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.productId!, String(currentQty - 1), maxQty)}
                                  disabled={currentQty === 0}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  −
                                </button>
                                <input
                                  className="w-14 rounded-md border border-slate-200 px-2 py-1 text-center text-sm font-semibold text-slate-900 focus:border-violet-400 focus:outline-none"
                                  type="number"
                                  min="0"
                                  max={maxQty}
                                  value={currentQty}
                                  onChange={(e) => handleQuantityChange(item.productId!, e.target.value, maxQty)}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.productId!, String(currentQty + 1), maxQty)}
                                  disabled={currentQty >= maxQty}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  +
                                </button>
                                <span className="w-10 text-right text-xs text-slate-400">/ {maxQty}</span>
                              </div>
                            </div>
                            {currentQty > 0 ? (
                              <>
                                <label className="flex items-center gap-2 pl-1 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
                                    checked={restock}
                                    onChange={(e) => handleRestockChange(item.productId!, e.target.checked)}
                                  />
                                  Reponer al inventario
                                </label>
                                {!restock && productStockById[item.productId!] === 0 ? (
                                  <p className="flex items-center gap-1.5 pl-1 text-xs text-amber-600">
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                    Este producto ya está sin stock y no se repondrá — seguirá sin stock disponible para la venta.
                                  </p>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="border-t border-slate-100 px-5 py-4">
                      <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                        <span className="text-sm text-slate-600">Total a devolver</span>
                        <span className="text-base font-bold text-slate-900">{formatMoney(previewTotal)}</span>
                      </div>

                      <div className="mb-3">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Motivo de la devolución <span className="text-rose-500">*</span>
                        </label>
                        <select
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                          value={reasonCategory}
                          onChange={(e) => setReasonCategory(e.target.value as ReturnReasonCategory)}
                        >
                          <option value="">Seleccioná un motivo...</option>
                          {RETURN_REASON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-4">
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Nota adicional (opcional)
                        </label>
                        <textarea
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                          rows={2}
                          placeholder="Detalles adicionales sobre el motivo..."
                          value={reasonNote}
                          onChange={(e) => setReasonNote(e.target.value)}
                        />
                      </div>

                      {submitError ? (
                        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                          <p className="text-sm font-medium text-rose-800">{submitError}</p>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setFormStep("confirm")}
                        disabled={!canSubmit}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Revisar devolución
                      </button>

                      {!hasItemsToReturn ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Ingresá al menos una cantidad para continuar
                        </p>
                      ) : reasonCategory === "" ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Seleccioná un motivo para continuar
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ReturnConfirmStep({
  items,
  quantities,
  restockByProduct,
  reasonCategory,
  reasonNote,
  total,
  isSubmitting,
  submitError,
  onBack,
  onConfirm
}: {
  items: SaleItem[];
  quantities: Record<string, number>;
  restockByProduct: Record<string, boolean>;
  reasonCategory: ReturnReasonCategory | "";
  reasonNote: string;
  total: number;
  isSubmitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const itemsToReturn = items.filter((item) => (quantities[item.productId!] ?? 0) > 0);
  const reasonLabel =
    RETURN_REASON_OPTIONS.find((option) => option.value === reasonCategory)?.label ?? reasonCategory;

  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Confirmá la devolución</p>
      <p className="mb-4 text-xs text-slate-500">
        Revisá el detalle antes de procesar. Esta acción afectará el stock y no se puede deshacer.
      </p>

      <div className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {itemsToReturn.map((item) => {
          const restock = restockByProduct[item.productId!] ?? true;
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.product?.name ?? "Producto"}
                </p>
                <p className="text-xs text-slate-500">
                  Cantidad: {quantities[item.productId!]} · {restock ? "Repone stock" : "No repone stock"}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-900">
                {formatMoney(quantities[item.productId!] * Number(item.unitPrice))}
              </p>
            </div>
          );
        })}
      </div>

      <dl className="mb-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Motivo</dt>
          <dd className="font-medium text-slate-900">{reasonLabel}</dd>
        </div>
        {reasonNote.trim() ? (
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-slate-500">Nota</dt>
            <dd className="text-right text-slate-700">{reasonNote.trim()}</dd>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-slate-100 pt-2">
          <dt className="font-medium text-slate-700">Total a devolver</dt>
          <dd className="text-base font-bold text-slate-900">{formatMoney(total)}</dd>
        </div>
      </dl>

      {submitError ? (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-medium text-rose-800">{submitError}</p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          {isSubmitting ? "Procesando..." : "Confirmar devolución"}
        </button>
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportReturnsToCsv(records: ReturnHistoryRecord[]) {
  const header = ["Fecha", "Venta origen", "Productos devueltos", "Cantidad", "Motivo", "Monto devuelto"];
  const rows = records.map((record) => {
    const reasonLabel =
      RETURN_REASON_OPTIONS.find((option) => option.value === record.reasonCategory)?.label ??
      record.reasonCategory;
    const totalQuantity = record.items.reduce((acc, item) => acc + item.quantity, 0);
    return [
      formatDate(record.createdAt),
      `#${record.sale.id.slice(-8).toUpperCase()}`,
      record.items.map((item) => `${item.productName} x${item.quantity}`).join(", "),
      String(totalQuantity),
      reasonLabel,
      formatMoney(record.totalAmount)
    ];
  });
  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `devoluciones_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── History Panel ────────────────────────────────────────────────────────────

function ReturnHistoryPanel() {
  const [records, setRecords] = useState<ReturnHistoryRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [sellers, setSellers] = useState<UserSummary[]>([]);

  useEffect(() => {
    fetch("/api/users", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((body: UsersResponse) => {
        if (body.data) setSellers(body.data);
      })
      .catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (sellerId) params.set("sellerId", sellerId);

      const res = await fetch(`/api/returns?${params.toString()}`, {
        headers: { Accept: "application/json" }
      });
      const body = (await res.json()) as ReturnHistoryResponse;
      if (body.data) setRecords(body.data);
      else setLoadError(body.error?.message ?? "No se pudo cargar el historial de devoluciones.");
      if (body.pagination) setPagination(body.pagination);
    } catch {
      setLoadError("No se pudo cargar el historial de devoluciones.");
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, sellerId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Historial de devoluciones</h2>

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Desde</label>
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                value={fromDate}
                onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
              <input
                type="date"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                value={toDate}
                onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Vendedor</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                value={sellerId}
                onChange={(e) => handleFilterChange(setSellerId, e.target.value)}
              >
                <option value="">Todos</option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => exportReturnsToCsv(records)}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : loadError ? (
          <p className="p-4 text-sm text-rose-600">{loadError}</p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Todavía no hay devoluciones registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((record) => (
              <div key={record.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Venta #{record.sale.id.slice(-8).toUpperCase()}
                    </p>
                    <span className="text-slate-300">·</span>
                    <p className="text-xs text-slate-500">{formatDate(record.createdAt)}</p>
                    {record.sale.customerName ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <p className="text-xs text-slate-500">{record.sale.customerName}</p>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {record.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMoney(record.totalAmount)}
                  </p>
                  <a
                    href={`/api/returns/${record.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Nota de crédito
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              {pagination.total} devolución{pagination.total !== 1 ? "es" : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNext}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
