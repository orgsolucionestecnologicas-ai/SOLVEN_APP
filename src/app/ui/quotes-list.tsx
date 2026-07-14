"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatARS } from "@/lib/format-currency";

type QuoteStatus = "DRAFT" | "SENT" | "CONFIRMED" | "EXPIRED" | "CANCELLED";

type QuoteItem = {
  id: string;
  productId: string | null;
  serviceId: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
  total: string;
};

type Quote = {
  id: string;
  quoteNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: QuoteStatus;
  totalAmount: string;
  discountAmount: string;
  notes: string | null;
  paymentTerms: string | null;
  validUntil: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  saleId: string | null;
  reminderSentAt: string | null;
  items: QuoteItem[];
  customer: { name: string } | null;
  createdAt: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type Product = { id: string; name: string; salePrice: string; stock: number };
type CustomerOption = { id: string; name: string; email?: string; phone?: string };

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  CONFIRMED: "Confirmado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  EXPIRED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

function StatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function shareQuoteWhatsApp(quote: Quote) {
  const lines = [
    `Cotización ${quote.quoteNumber}`,
    `Cliente: ${(quote.customer?.name ?? quote.customerName) || "—"}`,
    "",
    ...quote.items.map((item) => `${item.quantity} × ${item.name}`),
    "",
    `Total: ${formatARS(Number(quote.totalAmount))}`,
    `Válido hasta: ${formatDate(quote.validUntil)}`,
  ];
  const text = lines.join("\n");
  const phoneDigits = quote.customerPhone?.replace(/\D/g, "") ?? "";
  const url = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isExpiringSoon(validUntil: string): boolean {
  const diff = new Date(validUntil).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

type NewItem = {
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

function NewQuoteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [reservedStock, setReservedStock] = useState<Map<string, number>>(new Map());
  const [items, setItems] = useState<NewItem[]>([]);
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");
  const [discountInput, setDiscountInput] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounceCustomer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceProduct = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/quotes/reserved-stock")
      .then((r) => r.json())
      .then((body: { data?: Array<{ productId: string; reservedQuantity: number }> }) => {
        if (body.data) {
          const m = new Map<string, number>();
          for (const r of body.data) m.set(r.productId, r.reservedQuantity);
          setReservedStock(m);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceCustomer.current) clearTimeout(debounceCustomer.current);
    if (customerQuery.length < 2) { setCustomerOptions([]); return; }
    debounceCustomer.current = setTimeout(() => {
      fetch(`/api/customers?search=${encodeURIComponent(customerQuery)}&limit=10`)
        .then((r) => r.json())
        .then((body: { data?: CustomerOption[] }) => {
          if (body.data) setCustomerOptions(body.data);
        })
        .catch(() => {});
    }, 300);
  }, [customerQuery]);

  useEffect(() => {
    if (debounceProduct.current) clearTimeout(debounceProduct.current);
    if (productQuery.length < 2) { setProductOptions([]); return; }
    debounceProduct.current = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(productQuery)}&limit=10`)
        .then((r) => r.json())
        .then((body: { data?: Product[] }) => {
          if (body.data) setProductOptions(body.data);
        })
        .catch(() => {});
    }, 300);
  }, [productQuery]);

  function selectCustomer(c: CustomerOption) {
    setSelectedCustomer(c);
    setCustomerName(c.name);
    setCustomerEmail(c.email ?? "");
    setCustomerPhone(c.phone ?? "");
    setCustomerOptions([]);
    setCustomerQuery(c.name);
  }

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitPrice: Number(p.salePrice) }];
    });
    setProductQuery("");
    setProductOptions([]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQty(index: number, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount =
    discountMode === "percent"
      ? subtotal * (Math.min(100, Math.max(0, discountInput)) / 100)
      : Math.max(0, discountInput);
  const total = Math.max(0, subtotal - discountAmount);

  async function handleSave(sendEmail: boolean) {
    setSaving(true);
    setError("");
    try {
      const body = {
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? undefined : customerName,
        customerEmail,
        customerPhone,
        items: items.map((i) => ({
          productId: i.productId,
          serviceId: i.serviceId,
          quantity: i.quantity,
        })),
        discountAmount: discountAmount || undefined,
        notes: notes || undefined,
        paymentTerms: paymentTerms || undefined,
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { data?: Quote; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Error al guardar");

      if (sendEmail && data.data?.id) {
        await fetch(`/api/quotes/${data.data.id}/send-reminder`, { method: "POST" });
      }

      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva cotización</h2>

        {/* Customer */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Buscar cliente o escribir nombre…"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                if (!e.target.value) setSelectedCustomer(null);
                setCustomerName(e.target.value);
              }}
            />
            {customerOptions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                {customerOptions.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-violet-50"
                    onClick={() => selectCustomer(c)}
                  >
                    <span className="text-sm font-medium text-slate-900">{c.name}</span>
                    {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Teléfono"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Products */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Productos</label>
          <div className="relative">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Buscar producto…"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            {productOptions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                {productOptions.map((p) => {
                  const reserved = reservedStock.get(p.id) ?? 0;
                  return (
                    <button
                      key={p.id}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-violet-50"
                      onClick={() => addProduct(p)}
                    >
                      <span className="text-sm text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-500">
                        {formatARS(Number(p.salePrice))} · stock {p.stock}
                        {reserved > 0 && ` (${reserved} reservados)`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-2 rounded-lg border border-slate-200 divide-y divide-slate-100">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm text-slate-900">{item.name}</span>
                  <span className="text-xs text-slate-500">{formatARS(item.unitPrice)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded p-0.5 hover:bg-slate-100"
                      onClick={() => updateQty(index, item.quantity - 1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      className="rounded p-0.5 hover:bg-slate-100"
                      onClick={() => updateQty(index, item.quantity + 1)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-slate-900">
                    {formatARS(item.unitPrice * item.quantity)}
                  </span>
                  <button
                    className="text-slate-400 hover:text-red-500"
                    onClick={() => removeItem(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount & Notes */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Descuento</label>
              <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs">
                <button
                  type="button"
                  className={`px-2 py-0.5 font-medium ${discountMode === "amount" ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  onClick={() => setDiscountMode("amount")}
                >
                  Monto ($)
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 font-medium ${discountMode === "percent" ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  onClick={() => setDiscountMode("percent")}
                >
                  Porcentaje (%)
                </button>
              </div>
            </div>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              min={0}
              max={discountMode === "percent" ? 100 : undefined}
              type="number"
              value={discountInput || ""}
              onChange={(e) => setDiscountInput(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Observaciones…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Condiciones de pago</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              placeholder="Ej: 50% al confirmar, 50% contra entrega"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatARS(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>
                Descuento{discountMode === "percent" ? ` (${discountInput}%)` : ""}
              </span>
              <span>- {formatARS(discountAmount)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatARS(total)}</span>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={saving}
            onClick={() => handleSave(false)}
          >
            Guardar borrador
          </button>
          <button
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            disabled={saving}
            onClick={() => handleSave(true)}
          >
            Guardar y enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteDetailModal({
  quote,
  onClose,
  onAction,
  onDuplicate,
}: {
  quote: Quote;
  onClose: () => void;
  onAction: () => void;
  onDuplicate: (quoteId: string) => Promise<void>;
}) {
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paymentType] = useState<"CASH">("CASH");
  const [cancelling, setCancelling] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [actionError, setActionError] = useState("");

  const discountAmount = Number(quote.discountAmount);
  const totalAmount = Number(quote.totalAmount);
  const finalTotal = totalAmount - discountAmount;
  const canAct = quote.status === "DRAFT" || quote.status === "SENT";
  const isActive = canAct && new Date(quote.validUntil) > new Date();

  async function sendReminder() {
    setSending(true);
    setActionError("");
    try {
      const res = await fetch(`/api/quotes/${quote.id}/send-reminder`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message: string } };
        throw new Error(body.error?.message ?? "Error al enviar");
      }
      onAction();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    setActionError("");
    try {
      const res = await fetch(`/api/quotes/${quote.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentType }),
      });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Error al confirmar");
      onAction();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al confirmar");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setActionError("");
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Error al cancelar");
      onAction();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    setActionError("");
    try {
      await onDuplicate(quote.id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al duplicar");
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{quote.quoteNumber}</h2>
          <StatusBadge status={quote.status} />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-slate-500">Cliente</span>
            <p className="font-medium text-slate-900">{(quote.customer?.name ?? quote.customerName) || "—"}</p>
          </div>
          <div>
            <span className="text-slate-500">Email</span>
            <p className="font-medium text-slate-900">{quote.customerEmail || "—"}</p>
          </div>
          <div>
            <span className="text-slate-500">Creado</span>
            <p className="font-medium text-slate-900">{formatDate(quote.createdAt)}</p>
          </div>
          <div>
            <span className="text-slate-500">Válido hasta</span>
            <p className={`font-medium ${isExpiringSoon(quote.validUntil) ? "text-red-600" : "text-slate-900"}`}>
              {formatDate(quote.validUntil)}
            </p>
          </div>
          {quote.confirmedAt && (
            <div>
              <span className="text-slate-500">Confirmado</span>
              <p className="font-medium text-slate-900">{formatDate(quote.confirmedAt)}</p>
            </div>
          )}
          {quote.reminderSentAt && (
            <div>
              <span className="text-slate-500">Enviado</span>
              <p className="font-medium text-slate-900">{formatDate(quote.reminderSentAt)}</p>
            </div>
          )}
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2 text-left font-medium text-slate-500">Producto/Servicio</th>
              <th className="pb-2 text-center font-medium text-slate-500">Cant.</th>
              <th className="pb-2 text-right font-medium text-slate-500">Unitario</th>
              <th className="pb-2 text-right font-medium text-slate-500">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-900">{item.name}</td>
                <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                <td className="py-2 text-right text-slate-700">{formatARS(Number(item.unitPrice))}</td>
                <td className="py-2 text-right font-medium text-slate-900">{formatARS(Number(item.total))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {discountAmount > 0 && (
              <tr>
                <td colSpan={3} className="pt-2 text-right text-slate-500">Descuento</td>
                <td className="pt-2 text-right text-red-600">- {formatARS(discountAmount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="pt-2 text-right font-semibold text-slate-900">Total</td>
              <td className="pt-2 text-right font-bold text-slate-900">{formatARS(finalTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {quote.paymentTerms && (
          <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <strong>Condiciones de pago:</strong> {quote.paymentTerms}
          </p>
        )}

        {quote.notes && (
          <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <strong>Notas:</strong> {quote.notes}
          </p>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href={`/api/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar PDF
          </a>
          <button
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            disabled={duplicating}
            onClick={handleDuplicate}
          >
            <Copy size={16} />
            {duplicating ? "Duplicando…" : "Duplicar"}
          </button>
          <button
            className="flex w-fit items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
            onClick={() => shareQuoteWhatsApp(quote)}
            type="button"
          >
            <MessageCircle size={16} />
            Enviar por WhatsApp
          </button>
        </div>

        {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

        {isActive && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {quote.customerEmail && (
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={sending}
                  onClick={sendReminder}
                >
                  <Mail size={14} />
                  {sending ? "Enviando…" : "Enviar por email"}
                </button>
              )}
              <button
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                disabled={cancelling}
                onClick={handleCancel}
              >
                <X size={14} />
                {cancelling ? "Cancelando…" : "Cancelar"}
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-medium text-slate-700">Confirmar cotización</p>
              <button
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                disabled={confirming}
                onClick={handleConfirm}
              >
                <Check size={14} />
                {confirming ? "Confirmando…" : "Confirmar y registrar venta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuotesList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/quotes?${params.toString()}`);
      const body = (await res.json()) as {
        data?: Quote[];
        pagination?: PaginationMeta;
      };
      if (body.data) setQuotes(body.data);
      if (body.pagination) setPagination(body.pagination);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, from, to]);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    fetch("/api/quotes/expiring")
      .then((r) => r.json())
      .then((body: { data?: Quote[] }) => {
        if (body.data) setExpiringCount(body.data.length);
      })
      .catch(() => {});
  }, []);

  function handleCreated() {
    setShowNewModal(false);
    void fetchQuotes();
  }

  function handleAction() {
    setSelectedQuote(null);
    void fetchQuotes();
  }

  async function handleDuplicate(quoteId: string) {
    const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: "POST" });
    const body = (await res.json()) as { data?: Quote; error?: { message: string } };
    if (!res.ok || !body.data) throw new Error(body.error?.message ?? "Error al duplicar");
    await fetchQuotes();
    setSelectedQuote(body.data);
  }

  const STATUS_OPTIONS = [
    { value: "", label: "Todos" },
    { value: "DRAFT", label: "Borrador" },
    { value: "SENT", label: "Enviado" },
    { value: "CONFIRMED", label: "Confirmado" },
    { value: "EXPIRED", label: "Expirado" },
    { value: "CANCELLED", label: "Cancelado" },
  ];

  return (
    <div className="px-5 py-6 sm:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Cotizaciones</h1>
          {expiringCount > 0 && (
            <button
              className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
              onClick={() => { setStatusFilter(""); setFrom(""); setTo(""); }}
            >
              <Clock size={12} />
              {expiringCount} vencen en 24h
            </button>
          )}
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={16} />
          Nueva cotización
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            ref={searchInputRef}
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none"
            placeholder="Buscar N° o cliente…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["N°", "Cliente", "Total", "Estado", "Válido hasta", "Acciones"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                  Cargando…
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                  <FileText className="mx-auto mb-2 text-slate-300" size={32} />
                  No hay cotizaciones
                </td>
              </tr>
            ) : (
              quotes.map((quote) => {
                const canAct = quote.status === "DRAFT" || quote.status === "SENT";
                const isActive = canAct && new Date(quote.validUntil) > new Date();
                const expiring = isExpiringSoon(quote.validUntil) && canAct;
                const discountAmount = Number(quote.discountAmount);
                const totalAmount = Number(quote.totalAmount);
                const finalTotal = totalAmount - discountAmount;

                return (
                  <tr key={quote.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{quote.quoteNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {(quote.customer?.name ?? quote.customerName) || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{formatARS(finalTotal)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className={`px-4 py-3 ${expiring ? "font-medium text-red-600" : "text-slate-700"}`}>
                      {formatDate(quote.validUntil)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Ver detalle"
                          onClick={() => setSelectedQuote(quote)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Duplicar cotización"
                          onClick={() => {
                            void handleDuplicate(quote.id);
                          }}
                        >
                          <Copy size={15} />
                        </button>
                        {isActive && quote.customerEmail && (
                          <button
                            className="rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            title="Enviar por email"
                            onClick={async () => {
                              await fetch(`/api/quotes/${quote.id}/send-reminder`, { method: "POST" });
                              void fetchQuotes();
                            }}
                          >
                            <Mail size={15} />
                          </button>
                        )}
                        {isActive && (
                          <>
                            <button
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                              title="Convertir en venta"
                              onClick={() => setSelectedQuote(quote)}
                            >
                              <Check size={13} />
                              <span className="hidden sm:inline">Convertir en venta</span>
                            </button>
                            <button
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Cancelar cotización"
                              onClick={async () => {
                                if (!confirm("¿Cancelar esta cotización?")) return;
                                await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
                                void fetchQuotes();
                              }}
                            >
                              <X size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            {pagination.total} cotización{pagination.total !== 1 ? "es" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showNewModal && (
        <NewQuoteModal onClose={() => setShowNewModal(false)} onCreated={handleCreated} />
      )}

      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onAction={handleAction}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}
