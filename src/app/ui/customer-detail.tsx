"use client";

import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  FileText,
  Lock,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  ShoppingCart,
  TrendingUp,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { formatARS as fmtMoney } from "@/lib/format-currency";

type CustomerSegment = "NINGUNO" | "NUEVO" | "RECURRENTE" | "VIP";

type CustomerRecord = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  customerCode?: string;
  segment?: CustomerSegment;
  createdAt: string;
  updatedAt: string;
};

type SaleRecord = {
  id: string;
  customerId: string | null;
  totalAmount: string;
  saleDate: string;
  paymentType: string;
  customer: { name: string } | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    total: string;
    product: { name: string };
  }>;
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
type TabId = "resumen" | "compras" | "pagos" | "deuda" | "documentos";

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


const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });

function fmtDate(v: string) { return dateFmt.format(new Date(v)); }
function saleNumber(id: string) { return `V-${id.slice(-6).toUpperCase()}`; }
function paymentNumber(id: string) { return `P-${id.slice(-6).toUpperCase()}`; }

function saleItemsSummary(items: SaleRecord["items"]): string {
  if (items.length === 0) return "—";
  const names = items.map((i) => i.product.name);
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function CustomerDetail() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleRecord[]>([]);
  const [allDebts, setAllDebts] = useState<DebtRecord[]>([]);
  const [allPayments, setAllPayments] = useState<DebtPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [salesPage, setSalesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const PAGE_SIZE = 10;

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const [cRes, sRes, dRes, pRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/sales"),
          fetch("/api/debts"),
          fetch("/api/debt-payments")
        ]);
        const [cBody, sBody, dBody, pBody] = (await Promise.all([
          cRes.json(), sRes.json(), dRes.json(), pRes.json()
        ])) as [
          ApiResponse<CustomerRecord[]>, ApiResponse<SaleRecord[]>,
          ApiResponse<DebtRecord[]>, ApiResponse<DebtPaymentRecord[]>
        ];

        if (!active) return;

        if (!cRes.ok || !cBody.data) {
          setLoadError("No se pudo cargar el historial del cliente.");
          return;
        }
        setCustomers(cBody.data);
        setAllSales(sBody.data ?? []);
        setAllDebts(dBody.data ?? []);
        setAllPayments(pBody.data ?? []);
        setLoadError(null);
      } catch {
        if (active) setLoadError("No se pudo cargar el historial del cliente.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [customerId, refreshKey]);

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  );

  const customerSales = useMemo(
    () => [...allSales.filter((s) => s.customerId === customerId)]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()),
    [allSales, customerId]
  );

  const customerDebts = useMemo(
    () => allDebts.filter((d) => d.customerId === customerId),
    [allDebts, customerId]
  );

  const activeDebts = useMemo(
    () => customerDebts.filter((d) => Number(d.remainingAmount) > 0),
    [customerDebts]
  );

  const debtIds = useMemo(() => new Set(customerDebts.map((d) => d.id)), [customerDebts]);

  const customerPayments = useMemo(
    () => [...allPayments.filter((p) => debtIds.has(p.debtId))]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
    [allPayments, debtIds]
  );

  const totalDebt = useMemo(
    () => activeDebts.reduce((sum, d) => sum + Number(d.remainingAmount), 0),
    [activeDebts]
  );

  const totalPurchased = useMemo(
    () => customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
    [customerSales]
  );

  const totalPaid = useMemo(
    () => customerPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    [customerPayments]
  );

  const mostBoughtProduct = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sale of customerSales) {
      for (const item of sale.items) {
        counts[item.product.name] = (counts[item.product.name] ?? 0) + item.quantity;
      }
    }
    let best = "—";
    let bestCount = 0;
    for (const [name, count] of Object.entries(counts)) {
      if (count > bestCount) { best = name; bestCount = count; }
    }
    return best;
  }, [customerSales]);

  const avgTicket = customerSales.length > 0 ? totalPurchased / customerSales.length : 0;
  const lastSaleDate = customerSales.length > 0 ? customerSales[0].saleDate : null;

  const TABS: { id: TabId; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "compras", label: "Compras" },
    { id: "pagos", label: "Pagos" },
    { id: "deuda", label: "Deuda" },
    { id: "documentos", label: "Documentos" }
  ];

  const paginatedSales = customerSales.slice((salesPage - 1) * PAGE_SIZE, salesPage * PAGE_SIZE);
  const salesTotalPages = Math.max(1, Math.ceil(customerSales.length / PAGE_SIZE));
  const paginatedPayments = customerPayments.slice((paymentsPage - 1) * PAGE_SIZE, paymentsPage * PAGE_SIZE);
  const paymentsTotalPages = Math.max(1, Math.ceil(customerPayments.length / PAGE_SIZE));

  async function handleDelete() {
    if (!customer) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        setDeleteError(body.error?.message ?? "No se pudo eliminar el cliente.");
        setIsDeleting(false);
        return;
      }
      router.push("/customers");
    } catch {
      setDeleteError("No se pudo eliminar el cliente.");
      setIsDeleting(false);
    }
  }

  function getDaysSince(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  }

  function getSaleStatus(sale: SaleRecord): { label: string; cls: string } {
    if (sale.paymentType === "CASH") return { label: "Pagado", cls: "bg-emerald-100 text-emerald-700" };
    const debtForSale = customerDebts.find((d) => Number(d.remainingAmount) > 0 && allSales.some((s) => s.id === sale.id));
    if (debtForSale) return { label: "Pendiente", cls: "bg-orange-100 text-orange-700" };
    return { label: "Pagado", cls: "bg-emerald-100 text-emerald-700" };
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

  const initials = getInitials(customer.name);
  const avatarColor = getAvatarColor(customer.name);

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            href="/customers"
          >
            <ArrowLeft size={15} />
            Volver a clientes
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Historial del cliente</h1>
            <p className="text-xs text-slate-500">Información completa y actividad del cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setIsEditModalOpen(true)}
            type="button"
          >
            <Pencil size={13} />
            Editar cliente
          </button>
          <Link
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            href={`/pos?customerId=${customerId}`}
          >
            <ShoppingCart size={13} />
            Nueva venta
          </Link>
          <Link
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            href={`/customers/${customerId}/payment`}
          >
            <DollarSign size={13} />
            Registrar pago
          </Link>
          <div className="relative">
            <button
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              type="button"
            >
              <MoreHorizontal size={14} />
              <ChevronDown size={12} />
            </button>
            {isMoreMenuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsMoreMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    className="flex w-full items-center px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    onClick={() => { setIsMoreMenuOpen(false); setIsDeleteConfirming(true); setDeleteError(null); }}
                    type="button"
                  >
                    Eliminar cliente
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Customer card */}
      <div className="mx-6 mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${avatarColor}`}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">{customer.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {customer.customerCode ? <span className="font-mono font-medium text-slate-600">{customer.customerCode}</span> : null}
                {customer.customerCode ? " · " : null}
                Cliente desde: {fmtDate(customer.createdAt)}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap gap-3">
            <MetricCard
              label="Deuda actual"
              value={fmtMoney(totalDebt)}
              valueClass={totalDebt > 0 ? "text-rose-600" : "text-slate-950"}
              bgClass="bg-rose-50 border-rose-200"
            />
            <MetricCard
              label="Total comprado"
              value={fmtMoney(totalPurchased)}
              valueClass="text-emerald-600"
              bgClass="bg-emerald-50 border-emerald-200"
            />
            <MetricCard
              label="Total pagado"
              value={fmtMoney(totalPaid)}
              valueClass="text-emerald-600"
              bgClass="bg-emerald-50 border-emerald-200"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 flex flex-1 gap-0 px-6 pb-6">
        {/* Left: tabs */}
        <div className="min-w-0 flex-1">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200">
            {TABS.map((tab) => (
              <button
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-violet-600 text-violet-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-4">
            {activeTab === "resumen" ? (
              <ResumenTab
                customerDebts={customerDebts}
                customerPayments={customerPayments}
                customerSales={customerSales}
                getSaleStatus={getSaleStatus}
              />
            ) : null}
            {activeTab === "compras" ? (
              <ComprasTab
                currentPage={salesPage}
                getSaleStatus={getSaleStatus}
                onPageChange={setSalesPage}
                paginatedSales={paginatedSales}
                totalPages={salesTotalPages}
                totalSales={customerSales.length}
              />
            ) : null}
            {activeTab === "pagos" ? (
              <PagosTab
                allDebts={customerDebts}
                currentPage={paymentsPage}
                onPageChange={setPaymentsPage}
                paginatedPayments={paginatedPayments}
                totalPages={paymentsTotalPages}
                totalPayments={customerPayments.length}
              />
            ) : null}
            {activeTab === "deuda" ? (
              <DeudaTab
                activeDebts={activeDebts}
                customerId={customerId}
                getDaysSince={getDaysSince}
              />
            ) : null}
            {activeTab === "documentos" ? <DocumentosTab /> : null}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="ml-5 w-72 shrink-0 space-y-4">
          {/* Panel 1: Resumen de deuda */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen de deuda</h3>
            <div className="rounded-lg bg-rose-50 p-3 text-center">
              <p className="text-xs text-slate-500">Saldo pendiente</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{fmtMoney(totalDebt)}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                En {activeDebts.length} factura{activeDebts.length !== 1 ? "s" : ""} pendiente{activeDebts.length !== 1 ? "s" : ""}
              </p>
            </div>
            {activeDebts.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {activeDebts.slice(0, 4).map((debt) => (
                  <div className="flex items-center justify-between" key={debt.id}>
                    <span className="text-xs text-slate-600">Factura {saleNumber(debt.id)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-950">
                        {fmtMoney(Number(debt.remainingAmount))}
                      </span>
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                        {getDaysSince(debt.createdAt)}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">Sin deudas pendientes</p>
            )}
            <Link
              className="mt-3 block w-full rounded-lg bg-violet-600 py-2 text-center text-sm font-medium text-white hover:bg-violet-700"
              href={`/customers/${customerId}/payment`}
            >
              Registrar pago / abono
            </Link>
          </div>

          {/* Panel 2: Estadísticas */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">Estadísticas del cliente</h3>
              <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50" type="button">
                Este año <ChevronDown size={10} />
              </button>
            </div>
            <div className="space-y-2.5">
              <StatRow icon={<TrendingUp size={13} className="text-violet-500" />} label="Frecuencia de compra" value={`${customerSales.length} compras`} />
              <StatRow icon={<Wallet size={13} className="text-emerald-500" />} label="Ticket promedio" value={fmtMoney(avgTicket)} />
              <StatRow icon={<Calendar size={13} className="text-blue-500" />} label="Última compra" value={lastSaleDate ? fmtDate(lastSaleDate) : "—"} />
              <StatRow icon={<FileText size={13} className="text-orange-500" />} label="Producto más comprado" value={mostBoughtProduct} />
            </div>
            <button className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-800" type="button">
              Ver más estadísticas →
            </button>
          </div>

          {/* Panel 3: Contacto */}
          {(customer.phone ?? customer.email) ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Contacto</h3>
              <div className="space-y-2">
                {customer.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="flex-shrink-0 text-slate-400" />
                    <span className="text-xs text-slate-700">{customer.phone}</span>
                  </div>
                ) : null}
                {customer.email ? (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="flex-shrink-0 text-slate-400" />
                    <span className="text-xs text-slate-700">{customer.email}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Panel 3: Notas */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">Notas del cliente</h3>
              <button className="text-xs text-violet-600 hover:text-violet-800" type="button">
                Editar
              </button>
            </div>
            <textarea
              className="w-full resize-none rounded-lg border border-slate-200 p-2.5 text-xs text-slate-600 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
              placeholder="Agrega notas sobre este cliente..."
              readOnly
              rows={3}
            />
            <p className="mt-1.5 text-[10px] text-slate-400">Actualizado: hoy por Admin</p>
          </div>
        </aside>
      </div>

      {isEditModalOpen ? (
        <EditCustomerModal
          customer={customer}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      ) : null}

      {isDeleteConfirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => !isDeleting && setIsDeleteConfirming(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-slate-950">Eliminar cliente</h2>
              <p className="mt-2 text-sm text-slate-600">
                ¿Eliminar a <strong>{customer.name}</strong>? Esta acción no se puede deshacer.
              </p>
              {deleteError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm text-rose-900">{deleteError}</p>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                disabled={isDeleting}
                onClick={() => setIsDeleteConfirming(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                type="button"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label, value, valueClass, bgClass, sub
}: {
  label: string; value: string; valueClass: string; bgClass: string; sub?: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${bgClass}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${valueClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p> : null}
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <span className="text-xs font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function SalesTable({
  sales,
  getSaleStatus
}: {
  sales: SaleRecord[];
  getSaleStatus: (s: SaleRecord) => { label: string; cls: string };
}) {
  if (sales.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">Sin compras registradas</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {["Fecha","No. Venta","Productos","Método","Total","Estado",""].map((h, i) => (
              <th
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${i >= 3 ? "text-right" : "text-left"}`}
                key={h || i}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale) => {
            const { label, cls } = getSaleStatus(sale);
            return (
              <tr className="hover:bg-slate-50/50" key={sale.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {fmtDate(sale.saleDate)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-950">
                  {saleNumber(sale.id)}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 text-sm text-slate-600">
                  {saleItemsSummary(sale.items)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      sale.paymentType === "CREDIT"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {sale.paymentType === "CREDIT" ? "Crédito" : "Efectivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">
                  {fmtMoney(Number(sale.totalAmount))}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
                    {label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-slate-400 hover:text-slate-700" type="button">
                    <MoreHorizontal size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({
  payments,
  allDebts
}: {
  payments: DebtPaymentRecord[];
  allDebts: DebtRecord[];
}) {
  if (payments.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-400">Sin pagos registrados</p>;
  }
  const debtMap = new Map(allDebts.map((d) => [d.id, d]));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {["Fecha","No. Pago","Método de pago","Referencia","Monto","Aplicado a"].map((h) => (
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                key={h}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => {
            const debt = debtMap.get(p.debtId);
            return (
              <tr className="hover:bg-slate-50/50" key={p.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                  {fmtDate(p.paymentDate)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-950">
                  {paymentNumber(p.id)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                      <Wallet size={11} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-600">Efectivo</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">—</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                  + {fmtMoney(Number(p.amount))}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {debt ? saleNumber(debt.id) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  label
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  totalItems: number;
  label: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-xs text-slate-500">
        {totalItems} {label}
      </p>
      <div className="flex items-center gap-1">
        <button
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          ‹ Anterior
        </button>
        <span className="px-2 text-xs text-slate-500">
          {currentPage} / {totalPages}
        </span>
        <button
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Siguiente ›
        </button>
      </div>
    </div>
  );
}

function ResumenTab({
  customerSales,
  customerPayments,
  customerDebts,
  getSaleStatus
}: {
  customerSales: SaleRecord[];
  customerPayments: DebtPaymentRecord[];
  customerDebts: DebtRecord[];
  getSaleStatus: (s: SaleRecord) => { label: string; cls: string };
}) {
  return (
    <div className="space-y-6">
      {/* Historial de compras */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">Historial de compras</h3>
          <button className="text-xs font-medium text-violet-600 hover:text-violet-800" type="button">
            Ver todas las compras
          </button>
        </div>
        <SalesTable getSaleStatus={getSaleStatus} sales={customerSales.slice(0, 5)} />
      </div>

      {/* Historial de pagos */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">Historial de pagos</h3>
          <button className="text-xs font-medium text-violet-600 hover:text-violet-800" type="button">
            Ver todos los pagos
          </button>
        </div>
        <PaymentsTable allDebts={customerDebts} payments={customerPayments.slice(0, 4)} />
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        <p className="text-xs text-violet-700">
          Los saldos pendientes generan deuda hasta su cancelación total.
        </p>
      </div>
    </div>
  );
}

function ComprasTab({
  paginatedSales,
  totalSales,
  currentPage,
  totalPages,
  onPageChange,
  getSaleStatus
}: {
  paginatedSales: SaleRecord[];
  totalSales: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  getSaleStatus: (s: SaleRecord) => { label: string; cls: string };
}) {
  return (
    <div>
      <SalesTable getSaleStatus={getSaleStatus} sales={paginatedSales} />
      <PaginationBar
        currentPage={currentPage}
        label="compras en total"
        onPageChange={onPageChange}
        totalItems={totalSales}
        totalPages={totalPages}
      />
    </div>
  );
}

function PagosTab({
  paginatedPayments,
  totalPayments,
  currentPage,
  totalPages,
  onPageChange,
  allDebts
}: {
  paginatedPayments: DebtPaymentRecord[];
  totalPayments: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  allDebts: DebtRecord[];
}) {
  return (
    <div>
      <PaymentsTable allDebts={allDebts} payments={paginatedPayments} />
      <PaginationBar
        currentPage={currentPage}
        label="pagos en total"
        onPageChange={onPageChange}
        totalItems={totalPayments}
        totalPages={totalPages}
      />
    </div>
  );
}

function DeudaTab({
  activeDebts,
  customerId,
  getDaysSince
}: {
  activeDebts: DebtRecord[];
  customerId: string;
  getDaysSince: (d: string) => number;
}) {
  if (activeDebts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-semibold text-emerald-800">Sin deudas pendientes</p>
        <p className="mt-1 text-xs text-emerald-600">Este cliente está al día con sus pagos.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {activeDebts.map((debt) => {
        const days = getDaysSince(debt.createdAt);
        const remaining = Number(debt.remainingAmount);
        const total = Number(debt.totalAmount);
        const paid = total - remaining;
        const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-4" key={debt.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Factura {saleNumber(debt.id)}</p>
                <p className="text-xs text-slate-400">Creada el {fmtDate(debt.createdAt)} · {days} días</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-rose-600">{fmtMoney(remaining)}</p>
                <p className="text-xs text-slate-400">de {fmtMoney(total)}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{paidPct}% pagado</p>
            </div>
            <div className="mt-3 flex justify-end">
              <Link
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                href={`/customers/${customerId}/payment`}
              >
                Registrar pago
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentosTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
      <FileText className="mb-3 text-slate-300" size={40} />
      <p className="text-sm font-semibold text-slate-950">Próximamente</p>
      <p className="mt-1 text-xs text-slate-400">
        Los documentos del cliente estarán disponibles en una próxima versión.
      </p>
    </div>
  );
}

type CustomerExtra = {
  phone: string;
  email: string;
  ciudad: string;
  postal: string;
  direccion: string;
  cedula: string;
};

function readCustomerExtra(id: string): CustomerExtra {
  try {
    const raw = localStorage.getItem(`solven_customer_${id}_extra`);
    if (raw) return JSON.parse(raw) as CustomerExtra;
  } catch {}
  return { phone: "", email: "", ciudad: "", postal: "", direccion: "", cedula: "" };
}

function saveCustomerExtra(id: string, extra: CustomerExtra): void {
  try {
    localStorage.setItem(`solven_customer_${id}_extra`, JSON.stringify(extra));
  } catch {}
}

function EditCustomerModal({
  customer,
  onClose,
  onSuccess
}: {
  customer: CustomerRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [segment, setSegment] = useState<CustomerSegment>(customer.segment ?? "NINGUNO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          segment,
        })
      });
      const body = (await res.json()) as ApiResponse<CustomerRecord>;
      if (!res.ok || !body.data) {
        setSubmitError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo actualizar el cliente.");
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("No se pudo actualizar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Editar cliente</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">✕</button>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="edit-name">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-name"
              onChange={(e) => setName(e.target.value)}
              required
              type="text"
              value={name}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="edit-phone">
              Teléfono
              <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                disabled={isSubmitting}
                id="edit-phone"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +54 9 11 1234-5678"
                type="tel"
                value={phone}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="edit-email">
              Correo electrónico
              <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                disabled={isSubmitting}
                id="edit-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                type="email"
                value={email}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="edit-segment">
              Segmento
            </label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-segment"
              onChange={(e) => setSegment(e.target.value as CustomerSegment)}
              value={segment}
            >
              <option value="NINGUNO">Ninguno</option>
              <option value="NUEVO">Nuevo</option>
              <option value="RECURRENTE">Recurrente</option>
              <option value="VIP">VIP</option>
            </select>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-900">{submitError}</p>
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
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

}
