"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, History, Lightbulb, PackageX, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { downloadCsv } from "@/lib/csv";

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

type PaymentDetail = { method: string; amount: number; reference?: string };

type Sale = {
  id: string;
  saleDate: string;
  paymentType: "CASH" | "CREDIT";
  totalAmount: string;
  discountAmount: string;
  customer: { name: string } | null;
  items: SaleItem[];
  paymentDetails: unknown;
};

type RefundMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "VentaWeb" | "Otro";

const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  Efectivo: "Efectivo",
  Tarjeta: "Tarjeta",
  Transferencia: "Transferencia",
  VentaWeb: "Venta web",
  Otro: "Otro"
};

type RefundLine = { method: RefundMethod; originalAmount: number };

function getSaleRefundLines(sale: Sale): RefundLine[] {
  const details = parsePaymentDetails(sale.paymentDetails);
  if (details) {
    return details.map((d) => ({ method: d.method as RefundMethod, originalAmount: d.amount }));
  }
  if (sale.paymentType === "CASH") {
    return [
      {
        method: "Efectivo",
        originalAmount: Number(sale.totalAmount) - Number(sale.discountAmount || 0)
      }
    ];
  }
  return [];
}

type SearchField = "folio" | "customer" | "document" | "date";

const SEARCH_FIELD_OPTIONS: { value: SearchField; label: string }[] = [
  { value: "folio", label: "N° de venta" },
  { value: "customer", label: "Cliente" },
  { value: "document", label: "Documento" },
  { value: "date", label: "Fecha" }
];

const SEARCH_FIELD_PLACEHOLDERS: Record<SearchField, string> = {
  folio: "Ej: 1024",
  customer: "Nombre del cliente...",
  document: "N° de documento...",
  date: ""
};

function parsePaymentDetails(value: unknown): PaymentDetail[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.filter(
    (v): v is PaymentDetail =>
      typeof v === "object" && v !== null && typeof (v as PaymentDetail).method === "string" && typeof (v as PaymentDetail).amount === "number"
  );
  return parsed.length > 0 ? parsed : null;
}

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
  sale: { id: string; folio: number; saleDate: string; customerName: string | null };
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

const REASON_BADGE_STYLES: Record<ReturnReasonCategory, string> = {
  DEFECTO: "bg-amber-50 text-amber-700 border-amber-200",
  ERROR_VENTA: "bg-slate-100 text-slate-600 border-slate-200",
  CAMBIO_OPINION: "bg-slate-100 text-slate-600 border-slate-200",
  OTRO: "bg-slate-100 text-slate-600 border-slate-200"
};

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

function formatPaymentDetailsSummary(sale: Sale) {
  const details = parsePaymentDetails(sale.paymentDetails);
  if (!details) {
    return sale.paymentType === "CASH" ? "Efectivo" : "Crédito";
  }
  return details.map((d) => `${d.method} ${formatMoney(d.amount)}`).join(" + ");
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

export function Returns({
  presetSaleId,
  onPresetConsumed
}: {
  presetSaleId?: string | null;
  onPresetConsumed?: () => void;
} = {}) {
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchField, setSearchField] = useState<SearchField | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [restockByProduct, setRestockByProduct] = useState<Record<string, boolean>>({});
  const [productStockById, setProductStockById] = useState<Record<string, number>>({});
  const [formStep, setFormStep] = useState<"form" | "confirm">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [showChargeFirstHint, setShowChargeFirstHint] = useState(true);
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [refundReferences, setRefundReferences] = useState<Record<string, string>>({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (searchField && searchQuery) {
        if (searchField === "date") {
          params.set("from", `${searchQuery}T00:00:00`);
          params.set("to", `${searchQuery}T23:59:59`);
        } else {
          params.set("q", searchQuery);
        }
      }
      const res = await fetch(`/api/sales?${params.toString()}`, { headers: { Accept: "application/json" } });
      const body = (await res.json()) as SalesResponse;
      if (body.data) setSales(body.data);
      else setLoadError("No se pudieron cargar las ventas.");
    } catch {
      setLoadError("No se pudieron cargar las ventas.");
    } finally {
      setLoading(false);
    }
  }, [searchField, searchQuery]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (!presetSaleId || loading) return;
    const match = sales.find((s) => s.id === presetSaleId);
    if (match) {
      handleSelectSale(match);
      setActiveTab("new");
    }
    onPresetConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSaleId, sales, loading]);

  function handleSearchFieldClick(field: SearchField) {
    setSearchField(field);
    setSearchInput("");
    setSearchQuery("");
  }

  function handleSelectSale(sale: Sale) {
    setSelectedSale(sale);
    setReturnResult(null);
    setSubmitError(null);
    setReasonCategory("");
    setReasonNote("");
    setRefundAmounts({});
    setRefundReferences({});
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

  function handleRefundAmountChange(method: string, value: string) {
    setRefundAmounts((prev) => ({ ...prev, [method]: value }));
  }

  function handleRefundReferenceChange(method: string, value: string) {
    setRefundReferences((prev) => ({ ...prev, [method]: value }));
  }

  const productItems = selectedSale?.items.filter((i) => i.productId) ?? [];
  const hasItemsToReturn = Object.values(returnQuantities).some((q) => q > 0);
  const requiresRefundMethod = selectedSale?.paymentType !== "CREDIT";

  const saleRefundLines = useMemo(
    () => (selectedSale ? getSaleRefundLines(selectedSale) : []),
    [selectedSale]
  );

  const previewTotal = productItems.reduce((acc, item) => {
    const qty = returnQuantities[item.productId!] ?? 0;
    return acc + qty * Number(item.unitPrice);
  }, 0);

  useEffect(() => {
    if (!requiresRefundMethod || saleRefundLines.length === 0) return;
    const rounded = Math.round(previewTotal * 100) / 100;
    if (rounded <= 0) {
      setRefundAmounts({});
      return;
    }
    const totalOriginal = saleRefundLines.reduce((acc, l) => acc + l.originalAmount, 0);
    const next: Record<string, string> = {};
    let assigned = 0;
    saleRefundLines.forEach((line, index) => {
      if (index === saleRefundLines.length - 1) {
        next[line.method] = (rounded - assigned).toFixed(2);
        return;
      }
      const share = totalOriginal > 0 ? (line.originalAmount / totalOriginal) * rounded : 0;
      const roundedShare = Math.round(share * 100) / 100;
      next[line.method] = roundedShare.toFixed(2);
      assigned += roundedShare;
    });
    setRefundAmounts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTotal, selectedSale?.id, requiresRefundMethod]);

  const refundEntries = saleRefundLines.map((line) => ({
    method: line.method,
    originalAmount: line.originalAmount,
    amount: parseFloat(refundAmounts[line.method] || "0") || 0,
    reference: refundReferences[line.method] ?? ""
  }));
  const hasAnyRefundAmount = refundEntries.some((e) => e.amount > 0);
  const refundSum = refundEntries.reduce((acc, e) => acc + e.amount, 0);
  const refundSumMatches = Math.abs(refundSum - previewTotal) < 0.01;
  const refundCapsOk = refundEntries.every((e) => e.amount <= e.originalAmount + 0.005);
  const refundCardReferencesOk = refundEntries.every(
    (e) => e.method !== "Tarjeta" || e.amount <= 0 || e.reference.trim() !== ""
  );

  const canSubmit =
    hasItemsToReturn &&
    reasonCategory !== "" &&
    (!requiresRefundMethod ||
      (hasAnyRefundAmount && refundSumMatches && refundCapsOk && refundCardReferencesOk));

  async function handleSubmit() {
    if (!selectedSale || !canSubmit) return;

    const items = productItems
      .filter((item) => (returnQuantities[item.productId!] ?? 0) > 0)
      .map((item) => ({
        productId: item.productId!,
        quantity: returnQuantities[item.productId!],
        restock: restockByProduct[item.productId!] ?? true
      }));

    const refundDetails = requiresRefundMethod
      ? refundEntries
          .filter((e) => e.amount > 0)
          .map((e) => ({
            method: e.method,
            amount: e.amount,
            reference: e.method === "Tarjeta" ? e.reference.trim() || undefined : undefined
          }))
      : undefined;

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
          reasonNote: reasonNote.trim() || undefined,
          refundDetails
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
    <div className="flex flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex gap-1">
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
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">

        {/* Informative hint: charge the new sale before returning the previous one */}
        {showChargeFirstHint ? (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600" />
            <p className="flex-1 text-sm text-violet-800">
              Para una devolución más ágil y efectiva, te recomendamos cobrar primero la venta nueva y, una vez
              cobrada, devolver la totalidad de la anterior.
            </p>
            <button
              type="button"
              onClick={() => setShowChargeFirstHint(false)}
              className="text-violet-400 hover:text-violet-600"
            >
              ✕
            </button>
          </div>
        ) : null}

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
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Seleccioná una venta</h2>
                <p className="mt-0.5 text-xs text-slate-500">Buscá por N° de venta, cliente, documento o fecha</p>
              </div>

              <div className="px-4 py-3">
                <div className="flex gap-1.5 overflow-x-auto pb-3">
                  {SEARCH_FIELD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSearchFieldClick(option.value)}
                      className={
                        searchField === option.value
                          ? "flex-shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white"
                          : "flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {searchField ? (
                  searchField === "date" ? (
                    <input
                      className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                      type="date"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                        placeholder={SEARCH_FIELD_PLACEHOLDERS[searchField]}
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                    </div>
                  )
                ) : null}
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
                ) : sales.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PackageX className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">No se encontraron ventas</p>
                  </div>
                ) : (
                  sales.map((sale) => {
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-white py-20 text-center shadow-sm">
                <RotateCcw className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Seleccioná una venta</p>
                <p className="mt-1 text-xs text-slate-400">Los ítems aparecerán aquí para procesar la devolución</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Venta #{selectedSale.id.slice(-8).toUpperCase()}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(selectedSale.saleDate)} · {selectedSale.paymentType === "CASH" ? "Efectivo" : "Crédito"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Pagado con: {formatPaymentDetailsSummary(selectedSale)}
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
                    refundDetails={
                      requiresRefundMethod
                        ? refundEntries
                            .filter((e) => e.amount > 0)
                            .map((e) => ({ method: e.method, amount: e.amount, reference: e.reference.trim() || null }))
                        : []
                    }
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
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                >
                                  −
                                </button>
                                <input
                                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-semibold text-slate-900 focus:border-violet-400 focus:outline-none"
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
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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

                      {requiresRefundMethod && saleRefundLines.length > 0 ? (
                        <div className="mb-3">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            ¿Cómo se reintegra este monto? <span className="text-rose-500">*</span>
                          </label>
                          <div className="space-y-2">
                            {refundEntries.map((entry) => (
                              <div key={entry.method} className="rounded-lg border border-slate-200 p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-slate-700">
                                    {REFUND_METHOD_LABELS[entry.method]}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    Pagado: {formatMoney(entry.originalAmount)}
                                  </span>
                                </div>
                                <input
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={refundAmounts[entry.method] ?? ""}
                                  onChange={(e) => handleRefundAmountChange(entry.method, e.target.value)}
                                />
                                {entry.method === "Tarjeta" && entry.amount > 0 ? (
                                  <input
                                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                                    type="text"
                                    placeholder="N° de operación / cupón"
                                    value={refundReferences[entry.method] ?? ""}
                                    onChange={(e) => handleRefundReferenceChange(entry.method, e.target.value)}
                                  />
                                ) : null}
                              </div>
                            ))}
                          </div>
                          {!refundSumMatches ? (
                            <p className="mt-1 text-xs text-amber-600">
                              La suma de los reintegros debe ser igual al total a devolver ({formatMoney(previewTotal)}).
                            </p>
                          ) : !refundCapsOk ? (
                            <p className="mt-1 text-xs text-amber-600">
                              Un reintegro no puede superar lo pagado originalmente por ese medio.
                            </p>
                          ) : null}
                        </div>
                      ) : null}

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
                      ) : requiresRefundMethod && !hasAnyRefundAmount ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Indicá cómo se reintegra el dinero para continuar
                        </p>
                      ) : requiresRefundMethod && !refundSumMatches ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          La suma de los reintegros debe igualar el total a devolver
                        </p>
                      ) : requiresRefundMethod && !refundCapsOk ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Un reintegro supera lo pagado originalmente por ese medio
                        </p>
                      ) : requiresRefundMethod && !refundCardReferencesOk ? (
                        <p className="mt-2 text-center text-xs text-slate-400">
                          Ingresá el número de operación de la tarjeta para continuar
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
  refundDetails,
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
  refundDetails: { method: RefundMethod; amount: number; reference: string | null }[];
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
        {refundDetails.map((detail) => (
          <div key={detail.method} className="flex justify-between">
            <dt className="text-slate-500">
              Reintegro {REFUND_METHOD_LABELS[detail.method]}
              {detail.reference ? ` (N° ${detail.reference})` : ""}
            </dt>
            <dd className="font-medium text-slate-900">{formatMoney(detail.amount)}</dd>
          </div>
        ))}
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

function exportReturnsToCsv(records: ReturnHistoryRecord[]) {
  const header = ["Fecha", "Venta origen", "Productos devueltos", "Cantidad", "Motivo", "Monto devuelto"];
  const rows = records.map((record) => {
    const reasonLabel =
      RETURN_REASON_OPTIONS.find((option) => option.value === record.reasonCategory)?.label ??
      record.reasonCategory;
    const totalQuantity = record.items.reduce((acc, item) => acc + item.quantity, 0);
    return [
      formatDate(record.createdAt),
      `#${record.sale.folio}`,
      record.items.map((item) => `${item.productName} x${item.quantity}`).join(", "),
      String(totalQuantity),
      reasonLabel,
      formatMoney(record.totalAmount)
    ];
  });
  downloadCsv(`devoluciones_${new Date().toISOString().slice(0, 10)}.csv`, header, rows);
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
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory | "">("");

  useEffect(() => {
    fetch("/api/users", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((body: UsersResponse) => {
        if (body.data) setSellers(body.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (sellerId) params.set("sellerId", sellerId);
      if (searchQuery) params.set("search", searchQuery);
      if (reasonCategory) params.set("reasonCategory", reasonCategory);

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
  }, [page, fromDate, toDate, sellerId, searchQuery, reasonCategory]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const pageTotal = records.reduce((acc, r) => acc + Number(r.totalAmount), 0);

  function handleFilterChange(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Historial de devoluciones</h2>

          {!loading && !loadError ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {pagination?.total ?? records.length} devolución{(pagination?.total ?? records.length) !== 1 ? "es" : ""} en el período
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {formatMoney(pageTotal)} devueltos en esta página
              </span>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
                  placeholder="Folio o cliente..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Motivo</label>
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
                value={reasonCategory}
                onChange={(e) => {
                  setReasonCategory(e.target.value as ReturnReasonCategory | "");
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                {RETURN_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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
                      Venta #{record.sale.folio}
                    </p>
                    <span className="text-slate-300">·</span>
                    <p className="text-xs text-slate-500">{formatDate(record.createdAt)}</p>
                    {record.sale.customerName ? (
                      <>
                        <span className="text-slate-300">·</span>
                        <p className="text-xs text-slate-500">{record.sale.customerName}</p>
                      </>
                    ) : null}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${REASON_BADGE_STYLES[record.reasonCategory]}`}
                    >
                      {RETURN_REASON_OPTIONS.find((o) => o.value === record.reasonCategory)?.label ?? record.reasonCategory}
                    </span>
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
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
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
