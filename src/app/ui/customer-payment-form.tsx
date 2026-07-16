"use client";

import {
  ArrowLeft,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  MoreHorizontal,
  Wallet,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatARS as fmtMoney } from "@/lib/format-currency";

type CustomerRecord = {
  id: string;
  name: string;
  creditLimit?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DebtRecord = {
  id: string;
  customerId: string;
  totalAmount: string;
  remainingAmount: string;
  createdAt: string;
  updatedAt: string;
  customer: { name: string };
};

type DebtPaymentRecord = {
  id: string;
  debtId: string;
  amount: string;
  paymentDate: string;
  createdAt: string;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "cheque" | "otro";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: "efectivo", label: "Efectivo", Icon: Wallet },
  { id: "tarjeta", label: "Tarjeta", Icon: CreditCard },
  { id: "transferencia", label: "Transferencia", Icon: Building2 },
  { id: "cheque", label: "Cheque", Icon: FileText },
  { id: "otro", label: "Otro", Icon: MoreHorizontal }
];

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-orange-500","bg-indigo-500"
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function todayISODate(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });

function fmtDate(v: string) { return dateFmt.format(new Date(v)); }

export function CustomerPaymentForm() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [activeDebts, setActiveDebts] = useState<DebtRecord[]>([]);
  const [recentPayments, setRecentPayments] = useState<DebtPaymentRecord[]>([]);
  const [allSalesTotal, setAllSalesTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amountStr, setAmountStr] = useState("");
  const [paymentType, setPaymentType] = useState<"parcial" | "total">("parcial");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const [cRes, dRes, pRes, sRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/debts"),
          fetch("/api/debt-payments"),
          fetch("/api/sales")
        ]);
        const [cBody, dBody, pBody, sBody] = (await Promise.all([
          cRes.json(), dRes.json(), pRes.json(), sRes.json()
        ])) as [
          ApiResponse<CustomerRecord[]>, ApiResponse<DebtRecord[]>,
          ApiResponse<DebtPaymentRecord[]>,
          ApiResponse<Array<{ customerId: string | null; totalAmount: string }>>
        ];

        if (!active) return;

        if (!cRes.ok || !cBody.data) {
          setLoadError("No se pudo cargar la información del cliente.");
          return;
        }

        const foundCustomer = cBody.data.find((c) => c.id === customerId) ?? null;
        setCustomer(foundCustomer);

        const customerDebts = (dBody.data ?? []).filter(
          (d) => d.customerId === customerId && Number(d.remainingAmount) > 0
        );
        setActiveDebts(
          [...customerDebts].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        );

        const debtIds = new Set(customerDebts.map((d) => d.id));
        const customerPayments = (pBody.data ?? [])
          .filter((p) => debtIds.has(p.debtId))
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        setRecentPayments(customerPayments.slice(0, 4));

        const salesTotal = (sBody.data ?? [])
          .filter((s) => s.customerId === customerId)
          .reduce((sum, s) => sum + Number(s.totalAmount), 0);
        setAllSalesTotal(salesTotal);

        setLoadError(null);
      } catch {
        if (active) setLoadError("No se pudo cargar la información del cliente.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [customerId]);

  const totalRemaining = useMemo(
    () => activeDebts.reduce((sum, d) => sum + Number(d.remainingAmount), 0),
    [activeDebts]
  );

  const totalPaid = useMemo(
    () => recentPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    [recentPayments]
  );

  const amountNum = parseFloat(amountStr) || 0;
  const newBalance = Math.max(0, totalRemaining - amountNum);
  const isFullPayment = amountNum >= totalRemaining && amountNum > 0;
  const isPartialPayment = amountNum > 0 && amountNum < totalRemaining;

  function handlePaymentTypeToggle(type: "parcial" | "total") {
    setPaymentType(type);
    if (type === "total") {
      setAmountStr(totalRemaining.toFixed(2));
    } else {
      setAmountStr("");
    }
  }

  function validate(): string | null {
    if (amountNum <= 0) return "El monto debe ser mayor a cero.";
    if (amountNum > totalRemaining) return `El monto no puede superar el saldo pendiente de ${fmtMoney(totalRemaining)}.`;
    if (activeDebts.length === 0) return "Este cliente no tiene deudas activas.";
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const paymentCents = Math.round(amountNum * 100);
    const totalRemainingCents = activeDebts.reduce(
      (sum, d) => sum + Math.round(Number(d.remainingAmount) * 100), 0
    );

    let remainingCents = paymentCents;
    const debtPayloads: Array<{ debtId: string; amount: number }> = [];

    for (let i = 0; i < activeDebts.length; i++) {
      if (remainingCents <= 0) break;
      const debt = activeDebts[i];
      const debtRemainingCents = Math.round(Number(debt.remainingAmount) * 100);

      let portionCents: number;
      if (i === activeDebts.length - 1) {
        portionCents = remainingCents;
      } else {
        portionCents = Math.floor((debtRemainingCents / totalRemainingCents) * paymentCents);
      }
      portionCents = Math.min(portionCents, debtRemainingCents, remainingCents);

      if (portionCents > 0) {
        debtPayloads.push({ debtId: debt.id, amount: portionCents / 100 });
        remainingCents -= portionCents;
      }
    }

    try {
      for (const payload of debtPayloads) {
        const res = await fetch("/api/debt-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const body = (await res.json()) as ApiResponse<unknown>;
        if (!res.ok || !body.data) {
          setSubmitError(
            body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el pago."
          );
          return;
        }
      }
      router.push(`/customers/${customerId}`);
    } catch {
      setSubmitError("No se pudo registrar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm font-medium text-rose-900">
            {loadError ?? "Cliente no encontrado."}
          </p>
          <Link className="mt-3 inline-block text-sm text-violet-600 hover:underline" href="/customers">
            ← Volver a clientes
          </Link>
        </div>
      </div>
    );
  }

  const avatarColor = getAvatarColor(customer.name);
  const initials = getInitials(customer.name);
  const creditLimit = customer.creditLimit != null ? Number(customer.creditLimit) : null;
  const creditAvailable = creditLimit != null ? Math.max(0, creditLimit - totalRemaining) : null;
  const lastSaleDate = null;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            href={`/customers/${customerId}`}
          >
            <ArrowLeft size={15} />
            Volver
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Registrar pago</h1>
            <p className="text-xs text-slate-500">Registra un pago o abono a la deuda de tu cliente.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href={`/customers/${customerId}`}
          >
            <Clock size={13} />
            Historial de pagos
          </Link>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            type="button"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left: form */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-24 pt-5">
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Section 1: Cliente */}
            <Section title="Seleccionar cliente" number={1}>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white ${avatarColor}`}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{customer.name}</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Activo
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  href="/customers"
                >
                  Cambiar cliente
                </Link>
              </div>
            </Section>

            {/* Section 2: Información del pago */}
            <Section title="Información del pago" number={2}>
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Monto a pagar <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 focus-within:border-violet-500">
                    <span className="border-r border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-500">
                      $
                    </span>
                    <input
                      className="flex-1 bg-white px-3 py-2.5 text-lg font-semibold text-slate-950 placeholder:text-slate-300 focus:outline-none"
                      min="0.01"
                      onChange={(e) => {
                        setAmountStr(e.target.value);
                        if (paymentType === "total") setPaymentType("parcial");
                      }}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={amountStr}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Saldo pendiente: <span className="font-semibold text-rose-600">{fmtMoney(totalRemaining)}</span>
                  </p>
                </div>

                {/* Payment type toggle */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de pago</label>
                  <div className="flex overflow-hidden rounded-lg border border-slate-200">
                    <button
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === "parcial" ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                      onClick={() => handlePaymentTypeToggle("parcial")}
                      type="button"
                    >
                      Abono (pago parcial)
                    </button>
                    <button
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === "total" ? "bg-violet-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                      onClick={() => handlePaymentTypeToggle("total")}
                      type="button"
                    >
                      Pago total
                    </button>
                  </div>
                </div>

                {/* Method */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Método de pago <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                      <button
                        className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all ${
                          method === id
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        key={id}
                        onClick={() => setMethod(id)}
                        type="button"
                      >
                        <Icon
                          className={method === id ? "text-violet-600" : "text-slate-400"}
                          size={18}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Referencia / No. de comprobante
                    <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej. No. de transferencia, referencia, etc."
                    type="text"
                    value={reference}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha del pago</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                    onChange={(e) => setPaymentDate(e.target.value)}
                    type="date"
                    value={paymentDate}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notas
                    <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agrega notas sobre este pago..."
                    rows={3}
                    value={notes}
                  />
                </div>
              </div>
            </Section>

            {/* Section 3: Summary */}
            <Section title="Resumen del pago" number={3}>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="grid grid-cols-3 gap-4">
                  <SummaryCard
                    label="Saldo actual"
                    value={fmtMoney(totalRemaining)}
                    valueClass="text-rose-600"
                    bgClass="bg-rose-50 border-rose-200"
                  />
                  <div className="flex items-center justify-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <span className="text-sm font-bold text-slate-400">−</span>
                    </div>
                  </div>
                  <SummaryCard
                    label="Monto del pago"
                    value={amountNum > 0 ? fmtMoney(amountNum) : "—"}
                    valueClass={amountNum > 0 ? "text-violet-600" : "text-slate-400"}
                    bgClass="bg-violet-50 border-violet-200"
                  />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-400">=</span>
                  </div>
                  <SummaryCard
                    label="Nuevo saldo"
                    value={amountNum > 0 ? fmtMoney(newBalance) : "—"}
                    valueClass={amountNum > 0 ? (isFullPayment ? "text-emerald-600" : "text-rose-600") : "text-slate-400"}
                    bgClass={amountNum > 0 ? (isFullPayment ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200") : "bg-slate-50 border-slate-200"}
                  />
                </div>

                {amountNum > 0 ? (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 ${
                      isFullPayment
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-orange-200 bg-orange-50"
                    }`}
                  >
                    <p className={`text-xs ${isFullPayment ? "text-emerald-700" : "text-orange-700"}`}>
                      {isFullPayment
                        ? "Este pago cancela la deuda total del cliente."
                        : "Este es un abono parcial. El cliente aún tiene un saldo pendiente."}
                    </p>
                  </div>
                ) : null}
              </div>
            </Section>

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-900">{submitError}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 px-4 py-5">
          <div className="space-y-4">
            {/* Panel 1: Resumen del cliente */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen del cliente</h3>
              <div className="rounded-lg bg-rose-50 p-3 text-center">
                <p className="text-xs text-slate-500">Deuda actual</p>
                <p className="mt-1 text-xl font-bold text-rose-600">{fmtMoney(totalRemaining)}</p>
              </div>
              <div className="mt-3 space-y-2">
                <SidebarRow label="Límite de crédito" value={creditLimit != null ? fmtMoney(creditLimit) : "—"} />
                <SidebarRow label="Disponible" value={creditAvailable != null ? fmtMoney(creditAvailable) : "—"} />
                <SidebarRow label="Total compras" value={fmtMoney(allSalesTotal)} />
                <SidebarRow label="Total pagado" value={fmtMoney(totalPaid)} />
                <SidebarRow label="Última compra" value={lastSaleDate ? fmtDate(lastSaleDate) : "—"} />
              </div>
            </div>

            {/* Panel 2: Historial de pagos recientes */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Historial de pagos recientes</h3>
              {recentPayments.length === 0 ? (
                <p className="text-xs text-slate-400">Sin pagos registrados</p>
              ) : (
                <div className="space-y-2.5">
                  {recentPayments.map((p) => (
                    <div className="flex items-center gap-2" key={p.id}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                        <Wallet className="text-emerald-600" size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-950">Pago registrado</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(p.paymentDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-emerald-600">{fmtMoney(Number(p.amount))}</p>
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Completado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel 3: Detalle de la deuda */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Detalle de la deuda</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total compras a crédito</span>
                  <span className="text-xs font-semibold text-slate-950">
                    {fmtMoney(activeDebts.reduce((s, d) => s + Number(d.totalAmount), 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total pagado</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    − {fmtMoney(
                      activeDebts.reduce((s, d) => s + Number(d.totalAmount) - Number(d.remainingAmount), 0)
                    )}
                  </span>
                </div>
                <div className="mt-1 border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Saldo pendiente</span>
                    <span className="text-sm font-bold text-rose-600">{fmtMoney(totalRemaining)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href={`/customers/${customerId}`}
          >
            <X size={14} />
            Cancelar
          </Link>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            disabled={isSubmitting || amountNum <= 0}
            onClick={handleSubmit}
            type="button"
          >
            <DollarSign size={15} />
            {isSubmitting ? "Registrando pago..." : "Registrar pago"}
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Se registrará el pago y se actualizará el saldo del cliente.
        </p>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  children
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
          {number}
        </div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({
  label, value, valueClass, bgClass
}: {
  label: string; value: string; valueClass: string; bgClass: string;
}) {
  return (
    <div className={`rounded-xl border p-3 text-center ${bgClass}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-950">{value}</span>
    </div>
  );
}
