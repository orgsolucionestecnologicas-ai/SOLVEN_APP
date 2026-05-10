"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Upload,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type CustomerRecord = {
  id: string;
  name: string;
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

type CustomerSegment = "VIP" | "Regular" | "Nuevo" | "Inactivo";

type CustomerMetrics = {
  totalPurchases: number;
  currentDebt: number;
  lastSaleDate: string | null;
  hasSales: boolean;
  segment: CustomerSegment;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500"
];

const SEGMENT_ENTRIES: [CustomerSegment, string][] = [
  ["VIP", "#10b981"],
  ["Regular", "#3b82f6"],
  ["Nuevo", "#7c3aed"],
  ["Inactivo", "#f97316"]
];

function getCustomerInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColorClass(name: string): string {
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getCustomerEmail(name: string): string {
  const normalize = (w: string) =>
    w
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z]/g, "");
  const parts = name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}@email.com`;
  return `${parts[0] ?? "cliente"}@email.com`;
}

function getCustomerPhone(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "");
  const n1 = parseInt(hex.slice(-6, -3) || "000", 16) % 1000;
  const n2 = parseInt(hex.slice(-3) || "000", 16) % 10000;
  return `555-${String(n1).padStart(3, "0")}-${String(n2).padStart(4, "0")}`;
}

function computeSegment(totalPurchases: number, hasSales: boolean): CustomerSegment {
  if (!hasSales) return "Inactivo";
  if (totalPurchases > 500) return "VIP";
  if (totalPurchases >= 100) return "Regular";
  return "Nuevo";
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const moneyFormatter = new Intl.NumberFormat("es-419", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const numberFormatter = new Intl.NumberFormat("es-419", { maximumFractionDigits: 0 });

function formatMoney(value: number): string {
  return `$${moneyFormatter.format(value)}`;
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function CustomersList() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterDebtOnly, setFilterDebtOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerRecord | null>(null);
  const [registerPaymentModal, setRegisterPaymentModal] = useState<{
    customerId?: string;
    debtId?: string;
  } | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadAll() {
      try {
        const [customersRes, salesRes, debtsRes] = await Promise.all([
          fetch("/api/customers", { headers: { Accept: "application/json" } }),
          fetch("/api/sales", { headers: { Accept: "application/json" } }),
          fetch("/api/debts", { headers: { Accept: "application/json" } })
        ]);
        const [customersBody, salesBody, debtsBody] = (await Promise.all([
          customersRes.json(),
          salesRes.json(),
          debtsRes.json()
        ])) as [
          ApiResponse<CustomerRecord[]>,
          ApiResponse<SaleRecord[]>,
          ApiResponse<DebtRecord[]>
        ];

        if (!isActive) return;

        if (!customersRes.ok || !customersBody.data) {
          setLoadError("No se pudieron cargar los clientes.");
          return;
        }

        setCustomers(customersBody.data);
        setSales(salesBody.data ?? []);
        setDebts(debtsBody.data ?? []);
        setLoadError(null);
      } catch {
        if (isActive) setLoadError("No se pudieron cargar los clientes.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadAll();
    return () => { isActive = false; };
  }, [refreshKey]);

  const customerMetrics = useMemo((): Record<string, CustomerMetrics> => {
    const map: Record<string, CustomerMetrics> = {};
    for (const customer of customers) {
      const customerSales = sales.filter((s) => s.customerId === customer.id);
      const totalPurchases = customerSales.reduce(
        (sum, s) => sum + Number(s.totalAmount),
        0
      );
      const currentDebt = debts
        .filter((d) => d.customerId === customer.id)
        .reduce((sum, d) => sum + Number(d.remainingAmount), 0);
      const sortedSales = [...customerSales].sort(
        (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
      const lastSaleDate = sortedSales.length > 0 ? sortedSales[0].saleDate : null;
      const hasSales = customerSales.length > 0;
      map[customer.id] = {
        totalPurchases,
        currentDebt,
        lastSaleDate,
        hasSales,
        segment: computeSegment(totalPurchases, hasSales)
      };
    }
    return map;
  }, [customers, sales, debts]);

  const activeCustomersCount = useMemo(
    () => customers.filter((c) => customerMetrics[c.id]?.hasSales).length,
    [customers, customerMetrics]
  );

  const customersWithDebtCount = useMemo(
    () => customers.filter((c) => (customerMetrics[c.id]?.currentDebt ?? 0) > 0).length,
    [customers, customerMetrics]
  );

  const totalDebtAmount = useMemo(
    () => debts.reduce((sum, d) => sum + Number(d.remainingAmount), 0),
    [debts]
  );

  const { creditSalesMonthTotal, creditSalesPercentage } = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.saleDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const creditTotal = monthSales
      .filter((s) => s.paymentType === "CREDIT")
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const pct = monthTotal > 0 ? Math.round((creditTotal / monthTotal) * 100) : 0;
    return { creditSalesMonthTotal: creditTotal, creditSalesPercentage: pct };
  }, [sales]);

  const segmentCounts = useMemo((): Record<CustomerSegment, number> => {
    const counts: Record<CustomerSegment, number> = {
      VIP: 0, Regular: 0, Nuevo: 0, Inactivo: 0
    };
    for (const c of customers) {
      const seg = customerMetrics[c.id]?.segment ?? "Inactivo";
      counts[seg]++;
    }
    return counts;
  }, [customers, customerMetrics]);

  const topCustomers = useMemo(
    () =>
      [...customers]
        .filter((c) => (customerMetrics[c.id]?.totalPurchases ?? 0) > 0)
        .sort(
          (a, b) =>
            (customerMetrics[b.id]?.totalPurchases ?? 0) -
            (customerMetrics[a.id]?.totalPurchases ?? 0)
        )
        .slice(0, 5),
    [customers, customerMetrics]
  );

  const portfolioSummary = useMemo(() => {
    const active = debts.filter((d) => Number(d.remainingAmount) > 0);
    const total = active.reduce((sum, d) => sum + Number(d.remainingAmount), 0);
    const debtors = new Set(active.map((d) => d.customerId)).size;
    const avg = debtors > 0 ? total / debtors : 0;
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const overdue = active.filter((d) => new Date(d.createdAt) < cutoff).length;
    return { total, debtors, avg, overdue };
  }, [debts]);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    if (filterDebtOnly) {
      result = result.filter((c) => (customerMetrics[c.id]?.currentDebt ?? 0) > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const phone = getCustomerPhone(c.id).toLowerCase();
        return c.name.toLowerCase().includes(q) || phone.includes(q);
      });
    }
    return result;
  }, [customers, customerMetrics, searchQuery, filterDebtOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const activeCustomerPercent =
    customers.length > 0 ? Math.round((activeCustomersCount / customers.length) * 100) : 0;

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function handleCustomerCreated() {
    setIsCreateModalOpen(false);
    refresh();
    showSuccess("Cliente registrado exitosamente.");
  }

  function handleCustomerEdited() {
    setEditingCustomer(null);
    refresh();
    showSuccess("Cliente actualizado exitosamente.");
  }

  function handlePaymentRegistered() {
    setRegisterPaymentModal(null);
    refresh();
    showSuccess("Pago registrado exitosamente.");
  }

  function changePage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterDebtOnly(false);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Clientes</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Gestiona tus clientes y su historial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            type="button"
          >
            <Upload size={14} />
            Importar clientes
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            <Plus size={14} />
            Nuevo cliente
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            type="button"
          >
            <MoreHorizontal size={14} />
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5 lg:grid-cols-4">
        <MetricCard
          Icon={Users}
          iconClass="bg-violet-100 text-violet-600"
          subtitle="+ 0 nuevos este mes"
          subtitleClass="text-slate-500"
          title="Total clientes"
          value={customers.length}
        />
        <MetricCard
          Icon={UserCheck}
          iconClass="bg-emerald-100 text-emerald-600"
          subtitle={`${activeCustomerPercent}% del total`}
          subtitleClass="text-slate-500"
          title="Clientes activos"
          value={activeCustomersCount}
        />
        <MetricCard
          Icon={Wallet}
          iconClass="bg-orange-100 text-orange-600"
          subtitle={`${formatMoney(totalDebtAmount)} en deuda total`}
          subtitleClass="text-orange-600"
          title="Clientes con deuda"
          value={customersWithDebtCount}
        />
        <MetricCard
          Icon={CreditCard}
          iconClass="bg-rose-100 text-rose-600"
          subtitle={`${creditSalesPercentage}% del total en ventas`}
          subtitleClass="text-slate-500"
          title="Ventas a crédito mes"
          value={creditSalesMonthTotal}
          isMoney
        />
      </div>

      {/* Body */}
      <div className="flex border-t border-slate-200">
        {/* Left: search + table + pagination */}
        <div className="min-w-0 flex-1 px-5 py-4">
          {/* Search and filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar cliente por nombre, teléfono o documento..."
                type="text"
                value={searchQuery}
              />
            </div>
            <button
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${filterDebtOnly ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              onClick={() => { setFilterDebtOnly((v) => !v); setCurrentPage(1); }}
              type="button"
            >
              <Filter size={13} />
              Filtros
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              type="button"
            >
              <Users size={13} />
              Segmentos
            </button>
            {(searchQuery || filterDebtOnly) ? (
              <button
                className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800"
                onClick={clearFilters}
                type="button"
              >
                <RotateCcw size={12} />
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {/* Table */}
          {isLoading ? <LoadingState /> : null}
          {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
          {!isLoading && !loadError && filteredCustomers.length === 0 ? (
            <EmptyState />
          ) : null}
          {!isLoading && !loadError && filteredCustomers.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Contacto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Deuda actual
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Compras
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Última compra
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedCustomers.map((customer) => (
                      <CustomerRow
                        customer={customer}
                        isMenuOpen={openMenuId === customer.id}
                        key={customer.id}
                        metrics={customerMetrics[customer.id] ?? {
                          totalPurchases: 0,
                          currentDebt: 0,
                          lastSaleDate: null,
                          hasSales: false,
                          segment: "Inactivo"
                        }}
                        onDetail={() => { setDetailCustomer(customer); setOpenMenuId(null); }}
                        onEdit={() => { setEditingCustomer(customer); setOpenMenuId(null); }}
                        onMenuToggle={() =>
                          setOpenMenuId(openMenuId === customer.id ? null : customer.id)
                        }
                        onPayment={() => {
                          setRegisterPaymentModal({ customerId: customer.id });
                          setOpenMenuId(null);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Mostrando{" "}
                  {filteredCustomers.length === 0 ? 0 : (safePage - 1) * pageSize + 1} a{" "}
                  {Math.min(safePage * pageSize, filteredCustomers.length)} de{" "}
                  {filteredCustomers.length} clientes
                </p>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                    disabled={safePage === 1}
                    onClick={() => changePage(safePage - 1)}
                    type="button"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {getPageNumbers(safePage, totalPages).map((p, i) =>
                    p === "..." ? (
                      <span
                        className="px-2 text-sm text-slate-400"
                        key={`ellipsis-${i}`}
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        className={
                          p === safePage
                            ? "h-7 min-w-[1.75rem] rounded-md bg-violet-600 px-2 text-xs font-semibold text-white"
                            : "h-7 min-w-[1.75rem] rounded-md border border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"
                        }
                        key={p}
                        onClick={() => changePage(p)}
                        type="button"
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                    disabled={safePage === totalPages}
                    onClick={() => changePage(safePage + 1)}
                    type="button"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  value={pageSize}
                >
                  <option value={10}>Mostrar 10 por página</option>
                  <option value={25}>Mostrar 25 por página</option>
                  <option value={50}>Mostrar 50 por página</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right sidebar */}
        <aside className="w-80 shrink-0 border-l border-slate-200 px-4 py-5">
          <div className="space-y-6">
            {/* Donut chart */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">
                Clientes por segmento
              </h3>
              <SegmentsDonutChart counts={segmentCounts} total={customers.length} />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">
                  Top clientes (por ventas)
                </h3>
                <button
                  className="text-xs text-violet-600 hover:text-violet-800"
                  onClick={clearFilters}
                  type="button"
                >
                  Ver todos
                </button>
              </div>
              <TopCustomers
                customers={topCustomers}
                metrics={customerMetrics}
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">
                Resumen de cartera
              </h3>
              <PortfolioSummary
                onViewPortfolio={() => { setFilterDebtOnly(true); setCurrentPage(1); }}
                summary={portfolioSummary}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Quick actions bar */}
      <QuickActionsBar
        onNewCustomer={() => setIsCreateModalOpen(true)}
        onRegisterPayment={() => setRegisterPaymentModal({})}
        onViewPortfolio={() => { setFilterDebtOnly(true); setCurrentPage(1); }}
      />

      {/* Dropdown overlay */}
      {openMenuId ? (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      ) : null}

      {/* Modals */}
      {isCreateModalOpen ? (
        <CreateCustomerModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCustomerCreated}
        />
      ) : null}

      {editingCustomer ? (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleCustomerEdited}
        />
      ) : null}

      {detailCustomer ? (
        <CustomerDetailModal
          customer={detailCustomer}
          debts={debts}
          metrics={customerMetrics[detailCustomer.id] ?? {
            totalPurchases: 0,
            currentDebt: 0,
            lastSaleDate: null,
            hasSales: false,
            segment: "Inactivo"
          }}
          onClose={() => setDetailCustomer(null)}
          onPayDebt={(debt) => {
            setDetailCustomer(null);
            setRegisterPaymentModal({ customerId: debt.customerId, debtId: debt.id });
          }}
          sales={sales}
        />
      ) : null}

      {registerPaymentModal !== null ? (
        <RegisterPaymentModal
          customers={customers}
          debts={debts}
          initialCustomerId={registerPaymentModal.customerId}
          initialDebtId={registerPaymentModal.debtId}
          onClose={() => setRegisterPaymentModal(null)}
          onSuccess={handlePaymentRegistered}
        />
      ) : null}
    </div>
  );
}

// --- Sub-components ---

type MetricCardProps = {
  Icon: LucideIcon;
  iconClass: string;
  title: string;
  value: number;
  isMoney?: boolean;
  subtitle: string;
  subtitleClass: string;
};

function MetricCard({
  Icon,
  iconClass,
  title,
  value,
  isMoney = false,
  subtitle,
  subtitleClass
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {isMoney ? formatMoney(value) : numberFormatter.format(value)}
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`mt-2 text-xs ${subtitleClass}`}>{subtitle}</p>
    </div>
  );
}

function CustomerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colorClass = getAvatarColorClass(name);
  const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${colorClass} ${sizeClass}`}
    >
      {getCustomerInitials(name)}
    </div>
  );
}

function SegmentBadge({ segment }: { segment: CustomerSegment }) {
  const classes: Record<CustomerSegment, string> = {
    VIP: "bg-emerald-100 text-emerald-800",
    Regular: "bg-blue-100 text-blue-800",
    Nuevo: "bg-violet-100 text-violet-800",
    Inactivo: "bg-orange-100 text-orange-800"
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[segment]}`}>
      {segment}
    </span>
  );
}

function CustomerRow({
  customer,
  metrics,
  isMenuOpen,
  onMenuToggle,
  onDetail,
  onEdit,
  onPayment
}: {
  customer: CustomerRecord;
  metrics: CustomerMetrics;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onPayment: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <CustomerAvatar name={customer.name} />
          <div className="min-w-0">
            <p className="max-w-[160px] truncate text-sm font-semibold text-slate-950">
              {customer.name}
            </p>
            <p className="text-xs text-slate-400">{getCustomerPhone(customer.id)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="max-w-[160px] truncate text-xs text-slate-500">
          {getCustomerEmail(customer.name)}
        </span>
      </td>
      <td className="px-4 py-3">
        <SegmentBadge segment={metrics.segment} />
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={
            metrics.currentDebt > 0
              ? "text-sm font-semibold text-rose-600"
              : "text-sm text-slate-400"
          }
        >
          {formatMoney(metrics.currentDebt)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-slate-950">
          {formatMoney(metrics.totalPurchases)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-500">
          {metrics.lastSaleDate ? formatDate(metrics.lastSaleDate) : "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            href={`/customers/${customer.id}`}
            title="Ver detalle"
          >
            <Eye size={13} />
          </Link>
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            title="Editar"
            type="button"
          >
            <Pencil size={13} />
          </button>
          <div className="relative">
            <button
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onMenuToggle}
              type="button"
            >
              <MoreHorizontal size={13} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onDetail}
                  type="button"
                >
                  Ver detalle
                </button>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onEdit}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onPayment}
                  type="button"
                >
                  Registrar pago
                </button>
                <Link
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  href="/pos"
                >
                  Nueva venta a crédito
                </Link>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  type="button"
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

function SegmentsDonutChart({
  counts,
  total
}: {
  counts: Record<CustomerSegment, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos</p>
      </div>
    );
  }

  const cx = 80, cy = 80, r = 56, sw = 20;
  let currentAngle = 0;

  const slices = SEGMENT_ENTRIES.filter(([seg]) => counts[seg] > 0).map(([seg, color]) => {
    const count = counts[seg];
    const sweep = (count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + (sweep >= 360 ? 359.9 : sweep);
    currentAngle += sweep;
    return { seg, color, count, startAngle, endAngle };
  });

  return (
    <div>
      <svg className="mx-auto block" height={160} viewBox="0 0 160 160" width={160}>
        <circle cx={cx} cy={cy} fill="none" r={r} stroke="#f1f5f9" strokeWidth={sw} />
        {slices.map((slice) => (
          <path
            d={arcPath(cx, cy, r, slice.startAngle, slice.endAngle)}
            fill="none"
            key={slice.seg}
            stroke={slice.color}
            strokeLinecap="butt"
            strokeWidth={sw}
          />
        ))}
        <text
          dominantBaseline="middle"
          fill="#0f172a"
          fontSize="20"
          fontWeight="bold"
          textAnchor="middle"
          x={cx}
          y={cy - 8}
        >
          {total}
        </text>
        <text
          dominantBaseline="middle"
          fill="#94a3b8"
          fontSize="10"
          textAnchor="middle"
          x={cx}
          y={cy + 10}
        >
          clientes
        </text>
      </svg>
      <div className="mt-3 space-y-2">
        {slices.map((slice) => (
          <div className="flex items-center justify-between" key={slice.seg}>
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-xs text-slate-700">{slice.seg}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-950">{slice.count}</span>
              <span className="ml-1 text-[10px] text-slate-400">
                {Math.round((slice.count / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopCustomers({
  customers,
  metrics
}: {
  customers: CustomerRecord[];
  metrics: Record<string, CustomerMetrics>;
}) {
  if (customers.length === 0) {
    return <p className="text-xs text-slate-400">Sin ventas registradas</p>;
  }

  return (
    <div className="space-y-2">
      {customers.map((customer, index) => (
        <div className="flex items-center gap-2.5" key={customer.id}>
          <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400">
            {index + 1}
          </span>
          <CustomerAvatar name={customer.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-950">{customer.name}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-950">
            {formatMoney(metrics[customer.id]?.totalPurchases ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PortfolioSummary({
  summary,
  onViewPortfolio
}: {
  summary: { total: number; debtors: number; avg: number; overdue: number };
  onViewPortfolio: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
        <span className="text-xs text-slate-600">Total en deuda</span>
        <span className="text-xs font-bold text-rose-600">{formatMoney(summary.total)}</span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-600">Clientes con deuda</span>
        <span className="text-xs font-semibold text-slate-950">
          {numberFormatter.format(summary.debtors)}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-600">Deuda promedio</span>
        <span className="text-xs font-semibold text-slate-950">
          {formatMoney(summary.avg)}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-600">Vencidos (+30 días)</span>
        <span className="text-xs font-semibold text-slate-950">
          {numberFormatter.format(summary.overdue)}
        </span>
      </div>
      <button
        className="mt-1 w-full rounded-lg bg-violet-600 py-2 text-xs font-medium text-white hover:bg-violet-700"
        onClick={onViewPortfolio}
        type="button"
      >
        Ver cartera completa →
      </button>
    </div>
  );
}

function QuickActionsBar({
  onNewCustomer,
  onRegisterPayment,
  onViewPortfolio
}: {
  onNewCustomer: () => void;
  onRegisterPayment: () => void;
  onViewPortfolio: () => void;
}) {
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Acciones rápidas
        </span>
        <QuickActionButton Icon={Users} label="Nuevo cliente" onClick={onNewCustomer} />
        <Link
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          href="/pos"
        >
          <ShoppingCart size={13} />
          Nueva venta a crédito
        </Link>
        <QuickActionButton
          Icon={DollarSign}
          label="Registrar pago"
          onClick={onRegisterPayment}
        />
        <QuickActionButton
          Icon={Wallet}
          label="Ver cartera"
          onClick={onViewPortfolio}
        />
        <QuickActionButton Icon={MessageCircle} label="Enviar mensaje" />
      </div>
    </div>
  );
}

function QuickActionButton({
  Icon,
  label,
  onClick
}: {
  Icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      onClick={onClick}
      type="button"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function CustomerDetailModal({
  customer,
  metrics,
  sales,
  debts,
  onClose,
  onPayDebt
}: {
  customer: CustomerRecord;
  metrics: CustomerMetrics;
  sales: SaleRecord[];
  debts: DebtRecord[];
  onClose: () => void;
  onPayDebt: (debt: DebtRecord) => void;
}) {
  const customerSales = sales
    .filter((s) => s.customerId === customer.id)
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  const customerDebts = debts.filter(
    (d) => d.customerId === customer.id && Number(d.remainingAmount) > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar name={customer.name} />
            <div>
              <h2 className="text-sm font-semibold text-slate-950">{customer.name}</h2>
              <SegmentBadge segment={metrics.segment} />
            </div>
          </div>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Total compras</p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              {formatMoney(metrics.totalPurchases)}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Deuda activa</p>
            <p
              className={`mt-0.5 text-sm font-bold ${metrics.currentDebt > 0 ? "text-rose-600" : "text-slate-950"}`}
            >
              {formatMoney(metrics.currentDebt)}
            </p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">Última compra</p>
            <p className="mt-0.5 text-sm font-bold text-slate-950">
              {metrics.lastSaleDate ? formatDate(metrics.lastSaleDate) : "—"}
            </p>
          </div>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Sales */}
          <div className="px-6 py-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ventas ({customerSales.length})
            </h3>
            {customerSales.length === 0 ? (
              <p className="text-xs text-slate-400">Sin ventas registradas</p>
            ) : (
              <div className="space-y-1.5">
                {customerSales.slice(0, 8).map((sale) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                    key={sale.id}
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-950">
                        #{sale.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatDate(sale.saleDate)} ·{" "}
                        {sale.paymentType === "CREDIT" ? "Crédito" : "Efectivo"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-950">
                      {formatMoney(Number(sale.totalAmount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debts */}
          {customerDebts.length > 0 ? (
            <div className="border-t border-slate-100 px-6 py-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Deudas activas ({customerDebts.length})
              </h3>
              <div className="space-y-2">
                {customerDebts.map((debt) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
                    key={debt.id}
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-950">
                        Deuda #{debt.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Total: {formatMoney(Number(debt.totalAmount))} · Pendiente:{" "}
                        <span className="font-semibold text-rose-600">
                          {formatMoney(Number(debt.remainingAmount))}
                        </span>
                      </p>
                    </div>
                    <button
                      className="rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-violet-700"
                      onClick={() => onPayDebt(debt)}
                      type="button"
                    >
                      Registrar pago
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const body = (await response.json()) as ApiResponse<CustomerRecord>;

      if (!response.ok || !body.data) {
        setSubmitError(
          body.error?.details?.[0] ?? body.error?.message ?? "No se pudo actualizar el cliente."
        );
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Editar cliente</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="edit-customer-name"
            >
              Nombre
            </label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-customer-name"
              onChange={(e) => setName(e.target.value)}
              required
              type="text"
              value={name}
            />
          </div>

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

function RegisterPaymentModal({
  customers,
  debts,
  initialCustomerId,
  initialDebtId,
  onClose,
  onSuccess
}: {
  customers: CustomerRecord[];
  debts: DebtRecord[];
  initialCustomerId?: string;
  initialDebtId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId ?? "");
  const [selectedDebtId, setSelectedDebtId] = useState(initialDebtId ?? "");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const customersWithDebt = customers.filter((c) =>
    debts.some((d) => d.customerId === c.id && Number(d.remainingAmount) > 0)
  );

  const customerActiveDebts = debts.filter(
    (d) => d.customerId === selectedCustomerId && Number(d.remainingAmount) > 0
  );

  const selectedDebt =
    customerActiveDebts.find((d) => d.id === selectedDebtId) ?? null;

  const preselectedCustomer = customers.find((c) => c.id === initialCustomerId);
  const preselectedDebt = debts.find((d) => d.id === initialDebtId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const debtId = selectedDebtId || initialDebtId;
    if (!debtId || !amount) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/debt-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debtId, amount: Number(amount) })
      });
      const body = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok || !body.data) {
        setSubmitError(
          body.error?.details?.[0] ??
          body.error?.message ??
          "No se pudo registrar el pago."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el pago.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeDébt = selectedDebt ?? preselectedDebt ?? null;

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
          <h2 className="text-sm font-semibold text-slate-950">Registrar pago</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          {/* Customer */}
          {initialCustomerId ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Cliente</p>
              <p className="mt-0.5 text-sm font-medium text-slate-950">
                {preselectedCustomer?.name ?? "—"}
              </p>
            </div>
          ) : (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="payment-customer"
              >
                Cliente
              </label>
              <select
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                disabled={isSubmitting}
                id="payment-customer"
                onChange={(e) => { setSelectedCustomerId(e.target.value); setSelectedDebtId(""); }}
                required
                value={selectedCustomerId}
              >
                <option value="">Seleccionar cliente con deuda...</option>
                {customersWithDebt.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Debt selector */}
          {selectedCustomerId && !initialDebtId ? (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="payment-debt"
              >
                Deuda a pagar
              </label>
              {customerActiveDebts.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Este cliente no tiene deudas activas.
                </p>
              ) : (
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                  disabled={isSubmitting}
                  id="payment-debt"
                  onChange={(e) => setSelectedDebtId(e.target.value)}
                  required
                  value={selectedDebtId}
                >
                  <option value="">Seleccionar deuda...</option>
                  {customerActiveDebts.map((d) => (
                    <option key={d.id} value={d.id}>
                      #{d.id.slice(-6).toUpperCase()} — Pendiente:{" "}
                      {formatMoney(Number(d.remainingAmount))}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : initialDebtId && preselectedDebt ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-500">Deuda</p>
              <p className="mt-0.5 text-sm font-medium text-slate-950">
                #{preselectedDebt.id.slice(-6).toUpperCase()} — Pendiente:{" "}
                {formatMoney(Number(preselectedDebt.remainingAmount))}
              </p>
            </div>
          ) : null}

          {/* Amount */}
          {(selectedDebtId || initialDebtId) ? (
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="payment-amount"
              >
                Monto a pagar
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                disabled={isSubmitting}
                id="payment-amount"
                min="0.01"
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={amount}
              />
              {activeDébt ? (
                <p className="mt-1 text-xs text-slate-500">
                  Máximo: {formatMoney(Number(activeDébt.remainingAmount))}
                </p>
              ) : null}
            </div>
          ) : null}

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
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={isSubmitting || (!selectedDebtId && !initialDebtId) || !amount}
              type="submit"
            >
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateCustomerModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const body = (await response.json()) as ApiResponse<CustomerRecord>;

      if (!response.ok || !body.data) {
        setSubmitError(
          body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el cliente."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar el cliente.");
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
          <h2 className="text-sm font-semibold text-slate-950">Nuevo cliente</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="customer-name"
            >
              Nombre
            </label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="customer-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              type="text"
              value={name}
            />
          </div>

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
              {isSubmitting ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="h-14 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
          key={i}
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-medium text-rose-900">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <Users className="mx-auto mb-3 text-slate-300" size={32} />
      <p className="text-sm font-semibold text-slate-950">No hay clientes que coincidan</p>
      <p className="mt-1 text-sm text-slate-500">
        Intenta ajustar los filtros o la búsqueda.
      </p>
    </div>
  );
}
