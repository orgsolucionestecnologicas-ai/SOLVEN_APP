"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromotionType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "TWO_FOR_ONE"
  | "THREE_FOR_TWO"
  | "MINIMUM_PURCHASE"
  | "SPECIAL_PRICE"
  | "BUNDLED_PRODUCTS";

type PromotionApplication = "ALL_PRODUCTS" | "CATEGORY" | "SPECIFIC_PRODUCT" | "BUNDLED";
type PromotionActivation = "AUTOMATIC" | "MANUAL_CODE" | "BOTH";
type PromotionStatus = "active" | "scheduled" | "ended";

type PromotionRecord = {
  id: string;
  name: string;
  code: string | null;
  type: PromotionType;
  discountValue: string;
  application: PromotionApplication;
  categoryName: string | null;
  productAId: string | null;
  productBId: string | null;
  productBDiscount: string | null;
  minimumAmount: string | null;
  minimumPurchaseDiscountType: string | null;
  fixedPrice: string | null;
  activationType: PromotionActivation;
  startsAt: string;
  endsAt: string;
  daysOfWeek: string | null;
  maxUsages: number | null;
  maxUsagesPerCustomer: number | null;
  isActive: boolean;
  _count: { usages: number };
  createdAt: string;
  updatedAt: string;
};

type ProductRecord = {
  id: string;
  name: string;
  salePrice: string;
  stock: number;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

type PromotionFormData = {
  name: string;
  code: string;
  type: string;
  discountValue: string;
  application: string;
  categoryName: string;
  productAId: string;
  productASearch: string;
  productBId: string;
  productBSearch: string;
  productBDiscount: string;
  minimumAmount: string;
  minimumPurchaseDiscountType: string;
  fixedPrice: string;
  activationType: string;
  startsAt: string;
  endsAt: string;
  daysOfWeek: number[];
  maxUsages: string;
  maxUsagesPerCustomer: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const PRODUCT_CATEGORIES = [
  "Alimentos",
  "Bebidas",
  "Lácteos",
  "Limpieza",
  "Cuidado Personal",
  "Hogar",
  "Panadería",
  "Snacks",
  "Otros",
];

type TypeStyle = {
  label: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
};

const TYPE_STYLES: Record<PromotionType, TypeStyle> = {
  PERCENTAGE:       { label: "Porcentaje",       badgeBg: "bg-violet-50",  badgeText: "text-violet-700",  iconBg: "bg-violet-500" },
  FIXED_AMOUNT:     { label: "Monto fijo",        badgeBg: "bg-blue-50",    badgeText: "text-blue-700",    iconBg: "bg-blue-500" },
  TWO_FOR_ONE:      { label: "2x1",               badgeBg: "bg-emerald-50", badgeText: "text-emerald-700", iconBg: "bg-emerald-500" },
  THREE_FOR_TWO:    { label: "3x2",               badgeBg: "bg-teal-50",    badgeText: "text-teal-700",    iconBg: "bg-teal-500" },
  MINIMUM_PURCHASE: { label: "Compra mínima",     badgeBg: "bg-orange-50",  badgeText: "text-orange-700",  iconBg: "bg-orange-500" },
  SPECIAL_PRICE:    { label: "Precio especial",   badgeBg: "bg-amber-50",   badgeText: "text-amber-700",   iconBg: "bg-amber-500" },
  BUNDLED_PRODUCTS: { label: "Productos casados", badgeBg: "bg-pink-50",    badgeText: "text-pink-700",    iconBg: "bg-pink-500" },
};

const STATUS_STYLES: Record<PromotionStatus, { label: string; bg: string; text: string }> = {
  active:    { label: "Activa",     bg: "bg-emerald-50", text: "text-emerald-700" },
  scheduled: { label: "Programada", bg: "bg-blue-50",    text: "text-blue-700" },
  ended:     { label: "Finalizada", bg: "bg-slate-100",  text: "text-slate-600" },
};

const WEEKDAYS = [
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "X", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
  { label: "D", value: 0 },
];

const EMPTY_FORM: PromotionFormData = {
  name: "",
  code: "",
  type: "PERCENTAGE",
  discountValue: "",
  application: "ALL_PRODUCTS",
  categoryName: "",
  productAId: "",
  productASearch: "",
  productBId: "",
  productBSearch: "",
  productBDiscount: "",
  minimumAmount: "",
  minimumPurchaseDiscountType: "PERCENTAGE",
  fixedPrice: "",
  activationType: "AUTOMATIC",
  startsAt: "",
  endsAt: "",
  daysOfWeek: [],
  maxUsages: "",
  maxUsagesPerCustomer: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const moneyFmt = new Intl.NumberFormat("es-419", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(v: number | string): string {
  return `$${moneyFmt.format(Number(v))}`;
}

const shortDateFmt = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthDayFmt = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "short",
});

function formatDateRange(start: string, end: string): string {
  return `${monthDayFmt.format(new Date(start))} – ${shortDateFmt.format(new Date(end))}`;
}

function formatDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

function getPromotionStatus(promo: PromotionRecord): PromotionStatus {
  const now = new Date();
  const ends = new Date(promo.endsAt);
  const starts = new Date(promo.startsAt);
  if (!promo.isActive || ends < now) return "ended";
  if (starts > now) return "scheduled";
  return "active";
}

function getDaysRemaining(endsAt: string): number {
  return Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000);
}

function getApplicationLabel(promo: PromotionRecord): string {
  switch (promo.application) {
    case "ALL_PRODUCTS":     return "Todo";
    case "CATEGORY":         return promo.categoryName ? `Categoría: ${promo.categoryName}` : "Por categoría";
    case "SPECIFIC_PRODUCT": return "Producto específico";
    case "BUNDLED":          return "Productos casados";
    default:                 return "—";
  }
}

function getDiscountLabel(promo: PromotionRecord): string {
  switch (promo.type) {
    case "PERCENTAGE":       return `${Number(promo.discountValue).toFixed(0)}%`;
    case "FIXED_AMOUNT":     return formatMoney(promo.discountValue);
    case "TWO_FOR_ONE":      return "2x1";
    case "THREE_FOR_TWO":    return "3x2";
    case "MINIMUM_PURCHASE": return `${Number(promo.discountValue).toFixed(0)}%`;
    case "SPECIAL_PRICE":    return promo.fixedPrice ? formatMoney(promo.fixedPrice) : "—";
    case "BUNDLED_PRODUCTS": return promo.productBDiscount ? `${Number(promo.productBDiscount).toFixed(0)}% prod. B` : "—";
    default:                 return "—";
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function promotionToForm(promo: PromotionRecord, products: ProductRecord[]): PromotionFormData {
  const daysOfWeek = promo.daysOfWeek
    ? (JSON.parse(promo.daysOfWeek) as number[])
    : [];
  const findProductName = (id: string | null) =>
    id ? (products.find((p) => p.id === id)?.name ?? "") : "";

  return {
    name: promo.name,
    code: promo.code ?? "",
    type: promo.type,
    discountValue: promo.discountValue ? String(Number(promo.discountValue)) : "",
    application: promo.application,
    categoryName: promo.categoryName ?? "",
    productAId: promo.productAId ?? "",
    productASearch: findProductName(promo.productAId),
    productBId: promo.productBId ?? "",
    productBSearch: findProductName(promo.productBId),
    productBDiscount: promo.productBDiscount ? String(Number(promo.productBDiscount)) : "",
    minimumAmount: promo.minimumAmount ? String(Number(promo.minimumAmount)) : "",
    minimumPurchaseDiscountType: promo.minimumPurchaseDiscountType ?? "PERCENTAGE",
    fixedPrice: promo.fixedPrice ? String(Number(promo.fixedPrice)) : "",
    activationType: promo.activationType,
    startsAt: formatDateInput(promo.startsAt),
    endsAt: formatDateInput(promo.endsAt),
    daysOfWeek,
    maxUsages: promo.maxUsages ? String(promo.maxUsages) : "",
    maxUsagesPerCustomer: promo.maxUsagesPerCustomer ? String(promo.maxUsagesPerCustomer) : "",
  };
}

function buildSubmitPayload(form: PromotionFormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    type: form.type,
    discountValue: Number(form.discountValue) || 0,
    application: form.application,
    activationType: form.activationType,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
  };

  if (form.code.trim()) payload.code = form.code.trim();

  if (form.application === "CATEGORY" && form.categoryName.trim()) {
    payload.categoryName = form.categoryName.trim();
  }
  if (
    (form.application === "SPECIFIC_PRODUCT" || form.type === "SPECIAL_PRICE") &&
    form.productAId
  ) {
    payload.productAId = form.productAId;
  }
  if (form.type === "SPECIAL_PRICE" && form.fixedPrice) {
    payload.fixedPrice = Number(form.fixedPrice);
  }
  if (form.type === "MINIMUM_PURCHASE" && form.minimumAmount) {
    payload.minimumAmount = Number(form.minimumAmount);
    payload.minimumPurchaseDiscountType = form.minimumPurchaseDiscountType || "PERCENTAGE";
  }
  if (form.type === "BUNDLED_PRODUCTS") {
    payload.application = "BUNDLED";
    if (form.productAId) payload.productAId = form.productAId;
    if (form.productBId) payload.productBId = form.productBId;
    if (form.productBDiscount) payload.productBDiscount = Number(form.productBDiscount);
  }
  if (form.type === "TWO_FOR_ONE" || form.type === "THREE_FOR_TWO") {
    payload.application = "CATEGORY";
    if (form.categoryName.trim()) payload.categoryName = form.categoryName.trim();
  }
  if (form.daysOfWeek.length > 0) {
    payload.daysOfWeek = JSON.stringify(form.daysOfWeek);
  }
  if (form.maxUsages.trim()) payload.maxUsages = Number(form.maxUsages);
  if (form.maxUsagesPerCustomer.trim())
    payload.maxUsagesPerCustomer = Number(form.maxUsagesPerCustomer);

  return payload;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PromotionsList() {
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [activeTab, setActiveTab] = useState<"all" | PromotionStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    async function load() {
      try {
        const [promoRes, prodRes] = await Promise.all([
          fetch("/api/promotions", { headers: { Accept: "application/json" } }),
          fetch("/api/products", { headers: { Accept: "application/json" } }),
        ]);
        const [promoBody, prodBody] = (await Promise.all([
          promoRes.json(),
          prodRes.json(),
        ])) as [ApiResponse<PromotionRecord[]>, ApiResponse<ProductRecord[]>];

        if (!active) return;

        if (!promoRes.ok || !promoBody.data) {
          setLoadError("No se pudieron cargar las promociones.");
          return;
        }

        setPromotions(promoBody.data);
        setProducts(prodBody.data ?? []);
        setLoadError(null);
      } catch {
        if (active) setLoadError("No se pudieron cargar las promociones.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [refreshKey]);

  // ── Computed metrics ──────────────────────────────────────────────────────

  const activePromotions = useMemo(
    () => promotions.filter((p) => getPromotionStatus(p) === "active"),
    [promotions]
  );

  const soonToExpireCount = useMemo(
    () =>
      activePromotions.filter((p) => {
        const d = getDaysRemaining(p.endsAt);
        return d >= 0 && d <= 3;
      }).length,
    [activePromotions]
  );

  const avgDiscount = useMemo(() => {
    if (activePromotions.length === 0) return 0;
    const sum = activePromotions.reduce((s, p) => {
      if (p.type === "PERCENTAGE" || p.type === "MINIMUM_PURCHASE")
        return s + Number(p.discountValue);
      return s;
    }, 0);
    const typesWithPct = activePromotions.filter(
      (p) => p.type === "PERCENTAGE" || p.type === "MINIMUM_PURCHASE"
    ).length;
    return typesWithPct > 0 ? sum / typesWithPct : 0;
  }, [activePromotions]);

  const productsInPromoCount = useMemo(() => {
    const ids = new Set<string>();
    for (const p of activePromotions) {
      if (p.productAId) ids.add(p.productAId);
      if (p.productBId) ids.add(p.productBId);
    }
    return ids.size;
  }, [activePromotions]);

  const categoriesInPromoCount = useMemo(() => {
    const cats = new Set<string>();
    for (const p of activePromotions) {
      if (p.categoryName) cats.add(p.categoryName);
    }
    return cats.size;
  }, [activePromotions]);

  // ── Filtered/sorted list ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...promotions];

    if (activeTab !== "all") {
      result = result.filter((p) => getPromotionStatus(p) === activeTab);
    }

    const statusFilter =
      filterEstado === "active" || filterEstado === "scheduled" || filterEstado === "ended"
        ? filterEstado as PromotionStatus
        : null;
    if (statusFilter) result = result.filter((p) => getPromotionStatus(p) === statusFilter);

    if (filterTipo) result = result.filter((p) => p.type === filterTipo);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code?.toLowerCase().includes(q) ?? false)
      );
    }

    switch (sortBy) {
      case "most_used":
        result.sort((a, b) => (b._count?.usages ?? 0) - (a._count?.usages ?? 0));
        break;
      case "expiring":
        result.sort(
          (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        );
        break;
      default:
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return result;
  }, [promotions, activeTab, filterEstado, filterTipo, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ── Actions ───────────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function refresh() {
    setRefreshKey((k) => k + 1);
    setSelectedPromotion(null);
  }

  function clearFilters() {
    setSearchQuery("");
    setFilterEstado("");
    setFilterTipo("");
    setSortBy("recent");
    setCurrentPage(1);
  }

  function openCreate() {
    setEditingPromotion(null);
    setIsModalOpen(true);
  }

  function openEdit(promo: PromotionRecord) {
    setEditingPromotion(promo);
    setIsModalOpen(true);
    setOpenMenuId(null);
  }

  async function handleDeactivate(promo: PromotionRecord) {
    setOpenMenuId(null);
    try {
      await fetch(`/api/promotions/${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      refresh();
      showSuccess("Promoción desactivada.");
    } catch {
      // silent fail
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setOpenMenuId(null);
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as ApiResponse<unknown>;
        showSuccess(body.error?.message ?? "No se pudo eliminar la promoción.");
        return;
      }
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      if (selectedPromotion?.id === id) setSelectedPromotion(null);
      showSuccess("Promoción eliminada.");
    } catch {
      showSuccess("No se pudo eliminar la promoción.");
    }
  }

  function handleDuplicate(promo: PromotionRecord) {
    setOpenMenuId(null);
    const form = promotionToForm(promo, products);
    setEditingPromotion(null);
    setIsModalOpen(true);
    setDuplicateForm({ ...form, name: `${form.name} — Copia`, code: "" });
  }

  const [duplicateForm, setDuplicateForm] = useState<PromotionFormData | null>(null);

  function handleModalSaved(saved: PromotionRecord) {
    setIsModalOpen(false);
    setEditingPromotion(null);
    setDuplicateForm(null);
    setPromotions((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setSelectedPromotion(saved);
    showSuccess(
      editingPromotion ? "Promoción actualizada exitosamente." : "Promoción creada exitosamente."
    );
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterEstado !== "" ||
    filterTipo !== "" ||
    sortBy !== "recent";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Promociones</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Crea, gestiona y analiza tus promociones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
              onClick={openCreate}
              type="button"
            >
              <Plus size={14} />
              Nueva promoción
            </button>
          </div>
        </div>
      </div>

      {successMessage ? (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5 lg:grid-cols-4">
        <MetricCard
          Icon={Tag}
          iconClass="bg-violet-100 text-violet-600"
          title="Promociones activas"
          value={isLoading ? "—" : String(activePromotions.length)}
          subtitle={
            isLoading
              ? ""
              : soonToExpireCount > 0
              ? `${soonToExpireCount} a punto de finalizar`
              : "Ninguna por vencer pronto"
          }
          subtitleClass={soonToExpireCount > 0 ? "text-orange-600" : "text-slate-500"}
        />
        <MetricCard
          Icon={TrendingUp}
          iconClass="bg-emerald-100 text-emerald-600"
          title="Ventas generadas"
          value={formatMoney(0)}
          subtitle="▲ 0% vs período anterior"
          subtitleClass="text-emerald-600"
        />
        <MetricCard
          Icon={ShoppingCart}
          iconClass="bg-orange-100 text-orange-600"
          title="Productos en promoción"
          value={isLoading ? "—" : String(productsInPromoCount)}
          subtitle={
            isLoading
              ? ""
              : categoriesInPromoCount > 0
              ? `En ${categoriesInPromoCount} categoría${categoriesInPromoCount !== 1 ? "s" : ""}`
              : "Sin categorías específicas"
          }
          subtitleClass="text-slate-500"
        />
        <MetricCard
          Icon={Percent}
          iconClass="bg-rose-100 text-rose-600"
          title="Descuento promedio"
          value={isLoading ? "—" : `${avgDiscount.toFixed(1)}%`}
          subtitle="En promociones activas"
          subtitleClass="text-slate-500"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 px-6">
        <div className="flex overflow-x-auto">
          {(
            [
              { key: "all", label: "Todas" },
              { key: "active", label: "Activas" },
              { key: "scheduled", label: "Programadas" },
              { key: "ended", label: "Finalizadas" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              className={
                activeTab === key
                  ? "flex-shrink-0 border-b-2 border-violet-600 px-4 py-3 text-sm font-semibold text-violet-700"
                  : "flex-shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-800"
              }
              onClick={() => { setActiveTab(key); setCurrentPage(1); }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden border-t border-slate-100">
        {/* Left: table */}
        <div className="flex min-w-0 flex-1 flex-col overflow-auto px-5 py-4">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Buscar promoción por nombre o código..."
                type="text"
                value={searchQuery}
              />
            </div>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              type="button"
            >
              <Filter size={13} />
              Filtros
            </button>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
              value={filterEstado}
            >
              <option value="">Estado: Todos</option>
              <option value="active">Activa</option>
              <option value="scheduled">Programada</option>
              <option value="ended">Finalizada</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              onChange={(e) => { setFilterTipo(e.target.value); setCurrentPage(1); }}
              value={filterTipo}
            >
              <option value="">Tipo: Todos</option>
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED_AMOUNT">Monto fijo</option>
              <option value="TWO_FOR_ONE">2x1</option>
              <option value="THREE_FOR_TWO">3x2</option>
              <option value="MINIMUM_PURCHASE">Compra mínima</option>
              <option value="SPECIAL_PRICE">Precio especial</option>
              <option value="BUNDLED_PRODUCTS">Productos casados</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
              onChange={(e) => setSortBy(e.target.value)}
              value={sortBy}
            >
              <option value="recent">Más recientes</option>
              <option value="most_used">Más usadas</option>
              <option value="expiring">Próximas a vencer</option>
            </select>
            {hasActiveFilters ? (
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
          {isLoading ? (
            <LoadingState />
          ) : loadError ? (
            <ErrorState message={loadError} />
          ) : filtered.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Promoción",
                        "Tipo",
                        "Aplicación",
                        "Vigencia",
                        "Estado",
                        "Rendimiento",
                        "Acciones",
                      ].map((col) => (
                        <th
                          key={col}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {paginated.map((promo) => (
                      <PromotionRow
                        key={promo.id}
                        promo={promo}
                        isSelected={selectedPromotion?.id === promo.id}
                        isMenuOpen={openMenuId === promo.id}
                        confirmingDelete={confirmDeleteId === promo.id}
                        onSelect={() => setSelectedPromotion(promo)}
                        onMenuToggle={() =>
                          setOpenMenuId(openMenuId === promo.id ? null : promo.id)
                        }
                        onEdit={() => openEdit(promo)}
                        onDuplicate={() => handleDuplicate(promo)}
                        onDeactivate={() => handleDeactivate(promo)}
                        onDeleteRequest={() => setConfirmDeleteId(promo.id)}
                        onDeleteConfirm={() => handleDelete(promo.id)}
                        onDeleteCancel={() => setConfirmDeleteId(null)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                  <p className="text-xs text-slate-500">
                    {filtered.length} promociones · página {safePage} de {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      type="button"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                      )
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span className="px-1 text-xs text-slate-400" key={`e${i}`}>
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
                              safePage === p
                                ? "bg-violet-600 text-white"
                                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                            onClick={() => setCurrentPage(p as number)}
                            type="button"
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      type="button"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-l border-slate-200 lg:block">
          <PromotionSidebar
            promotion={selectedPromotion}
            onEdit={() => selectedPromotion && openEdit(selectedPromotion)}
          />
        </aside>
      </div>

      {/* Modal */}
      {isModalOpen ? (
        <PromotionModal
          editing={editingPromotion}
          products={products}
          initialForm={duplicateForm ?? undefined}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPromotion(null);
            setDuplicateForm(null);
          }}
          onSaved={handleModalSaved}
        />
      ) : null}
    </div>
  );
}

// ─── PromotionRow ─────────────────────────────────────────────────────────────

function PromotionRow({
  promo,
  isSelected,
  isMenuOpen,
  confirmingDelete,
  onSelect,
  onMenuToggle,
  onEdit,
  onDuplicate,
  onDeactivate,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  promo: PromotionRecord;
  isSelected: boolean;
  isMenuOpen: boolean;
  confirmingDelete: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDeactivate: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const style = TYPE_STYLES[promo.type] ?? TYPE_STYLES.PERCENTAGE;
  const status = getPromotionStatus(promo);
  const statusStyle = STATUS_STYLES[status];
  const daysLeft = getDaysRemaining(promo.endsAt);
  const isExpiringSoon = status === "active" && daysLeft >= 0 && daysLeft <= 3;

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isMenuOpen, onMenuToggle]);

  return (
    <tr
      className={`cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-violet-50 hover:bg-violet-50" : ""}`}
      onClick={onSelect}
    >
      {/* Promoción */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white ${style.iconBg}`}
          >
            <Tag size={14} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{promo.name}</p>
            <p className="text-xs text-slate-400">
              {promo.code ? `Código: ${promo.code}` : "Sin código"}
            </p>
          </div>
        </div>
      </td>

      {/* Tipo */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badgeBg} ${style.badgeText}`}
        >
          {style.label}
        </span>
      </td>

      {/* Aplicación */}
      <td className="px-4 py-3 text-xs text-slate-600">
        {getApplicationLabel(promo)}
      </td>

      {/* Vigencia */}
      <td className="px-4 py-3">
        <p className="text-xs text-slate-700">{formatDateRange(promo.startsAt, promo.endsAt)}</p>
        {status === "active" ? (
          <p className={`text-xs font-medium ${isExpiringSoon ? "text-rose-600" : "text-emerald-600"}`}>
            {daysLeft === 0 ? "Vence hoy" : daysLeft > 0 ? `Quedan ${daysLeft} días` : "Vencida"}
          </p>
        ) : status === "scheduled" ? (
          <p className="text-xs text-blue-600">
            Inicia en {Math.ceil((new Date(promo.startsAt).getTime() - Date.now()) / 86400000)} días
          </p>
        ) : null}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
        >
          {statusStyle.label}
        </span>
      </td>

      {/* Rendimiento */}
      <td className="px-4 py-3">
        {status === "scheduled" ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <div>
            <p className="text-xs font-medium text-slate-700">Ventas $0.00</p>
            <p className="text-xs text-slate-400">Usos {promo._count?.usages ?? 0}</p>
          </div>
        )}
      </td>

      {/* Acciones */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onSelect}
            title="Ver detalle"
            type="button"
          >
            <Eye size={14} />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            title="Editar"
            type="button"
          >
            <Pencil size={14} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onMenuToggle}
              title="Más opciones"
              type="button"
            >
              <MoreHorizontal size={14} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-8 z-50 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onEdit}
                  type="button"
                >
                  Editar
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onDuplicate}
                  type="button"
                >
                  Duplicar
                </button>
                {promo.isActive && status !== "ended" ? (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    onClick={onDeactivate}
                    type="button"
                  >
                    Desactivar
                  </button>
                ) : null}
                <div className="my-1 border-t border-slate-100" />
                {confirmingDelete ? (
                  <div className="px-4 py-2">
                    <p className="mb-2 text-xs text-slate-500">¿Confirmar eliminación?</p>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 rounded bg-rose-600 py-1 text-xs font-medium text-white hover:bg-rose-700"
                        onClick={onDeleteConfirm}
                        type="button"
                      >
                        Sí
                      </button>
                      <button
                        className="flex-1 rounded border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={onDeleteCancel}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    onClick={onDeleteRequest}
                    type="button"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── PromotionSidebar ─────────────────────────────────────────────────────────

function PromotionSidebar({
  promotion,
  onEdit,
}: {
  promotion: PromotionRecord | null;
  onEdit: () => void;
}) {
  if (!promotion) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Tag className="text-slate-400" size={24} />
        </div>
        <p className="text-sm font-medium text-slate-700">Detalle de la promoción</p>
        <p className="mt-1 text-xs text-slate-400">
          Selecciona una promoción para ver sus detalles
        </p>
      </div>
    );
  }

  const style = TYPE_STYLES[promotion.type] ?? TYPE_STYLES.PERCENTAGE;
  const status = getPromotionStatus(promotion);
  const statusStyle = STATUS_STYLES[status];
  const daysLeft = getDaysRemaining(promotion.endsAt);

  const details: { label: string; value: string }[] = [
    { label: "Tipo de descuento", value: style.label },
    { label: "Valor del descuento", value: getDiscountLabel(promotion) },
    { label: "Aplicación", value: getApplicationLabel(promotion) },
    {
      label: "Vigencia",
      value: `${formatDateRange(promotion.startsAt, promotion.endsAt)}${
        status === "active" ? ` · ${daysLeft} días restantes` : ""
      }`,
    },
    {
      label: "Condiciones",
      value: promotion.minimumAmount
        ? `Compra mínima ${formatMoney(promotion.minimumAmount)}`
        : "Sin compra mínima",
    },
    {
      label: "Límite por cliente",
      value: promotion.maxUsagesPerCustomer
        ? `${promotion.maxUsagesPerCustomer} uso${promotion.maxUsagesPerCustomer !== 1 ? "s" : ""}`
        : "Sin límite",
    },
    {
      label: "Activación",
      value:
        promotion.activationType === "AUTOMATIC"
          ? "Automática"
          : promotion.activationType === "MANUAL_CODE"
          ? "Por código"
          : "Automática + código",
    },
  ];

  const sparkData = Array(7).fill(0) as number[];
  const svgPoints = sparkData
    .map((v, i) => `${(i / 6) * 60},${12 - v * 10}`)
    .join(" ");

  const miniStats = [
    { label: "Ventas generadas", value: "$0.00" },
    { label: "Usos totales", value: String(promotion._count?.usages ?? 0) },
    { label: "Ticket promedio", value: "—" },
    { label: "ROI estimado", value: "—" },
  ];

  return (
    <div className="flex flex-col p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{promotion.name}</p>
          <span
            className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {statusStyle.label}
          </span>
        </div>
        <button
          className="flex-shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
          onClick={onEdit}
          title="Editar"
          type="button"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Large icon */}
      <div className="mb-5 flex justify-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white ${style.iconBg}`}
        >
          <Tag size={28} />
        </div>
      </div>

      {/* Details */}
      <div className="mb-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        {details.map((d) => (
          <div key={d.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {d.label}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-800">{d.value}</p>
          </div>
        ))}
      </div>

      {/* Rendimiento */}
      <div className="mb-4">
        <p className="mb-3 text-xs font-semibold text-slate-700">
          Rendimiento de la promoción
        </p>
        <p className="mb-2 text-[10px] text-slate-400">
          Desde {shortDateFmt.format(new Date(promotion.startsAt))}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {miniStats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-slate-100 bg-white p-2.5"
            >
              <svg
                className="mb-1"
                height="12"
                viewBox="0 0 60 12"
                width="60"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polyline
                  fill="none"
                  points={svgPoints}
                  stroke="#7c3aed"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                />
              </svg>
              <p className="text-sm font-bold text-slate-900">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        type="button"
      >
        Ver análisis detallado →
      </button>
    </div>
  );
}

// ─── PromotionModal ───────────────────────────────────────────────────────────

function PromotionModal({
  editing,
  products,
  initialForm,
  onClose,
  onSaved,
}: {
  editing: PromotionRecord | null;
  products: ProductRecord[];
  initialForm?: PromotionFormData;
  onClose: () => void;
  onSaved: (saved: PromotionRecord) => void;
}) {
  const [form, setForm] = useState<PromotionFormData>(
    initialForm ?? (editing ? promotionToForm(editing, products) : EMPTY_FORM)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [productAOpen, setProductAOpen] = useState(false);
  const [productBOpen, setProductBOpen] = useState(false);

  const filteredProductsA = useMemo(
    () =>
      form.productASearch.trim()
        ? products.filter((p) =>
            p.name.toLowerCase().includes(form.productASearch.toLowerCase())
          )
        : products.slice(0, 8),
    [products, form.productASearch]
  );

  const filteredProductsB = useMemo(
    () =>
      form.productBSearch.trim()
        ? products.filter((p) =>
            p.name.toLowerCase().includes(form.productBSearch.toLowerCase())
          )
        : products.slice(0, 8),
    [products, form.productBSearch]
  );

  function set(field: keyof PromotionFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDow(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    const payload = buildSubmitPayload(form);
    const url = editing ? `/api/promotions/${editing.id}` : "/api/promotions";
    const method = editing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiResponse<PromotionRecord>;

      if (!res.ok || !body.data) {
        if (body.error?.details?.length) {
          setErrors(body.error.details);
        } else {
          setErrors([body.error?.message ?? "Error al guardar la promoción."]);
        }
        return;
      }

      onSaved(body.data);
    } catch {
      setErrors(["Error de conexión. Intenta de nuevo."]);
    } finally {
      setIsSubmitting(false);
    }
  }

  const showApplication =
    form.type === "PERCENTAGE" ||
    form.type === "FIXED_AMOUNT" ||
    form.type === "TWO_FOR_ONE" ||
    form.type === "THREE_FOR_TWO";

  const forcedApplication =
    form.type === "TWO_FOR_ONE" || form.type === "THREE_FOR_TWO"
      ? "CATEGORY"
      : form.type === "BUNDLED_PRODUCTS"
      ? "BUNDLED"
      : form.type === "SPECIAL_PRICE"
      ? "SPECIFIC_PRODUCT"
      : null;

  const effectiveApplication = forcedApplication ?? form.application;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            {editing ? "Editar promoción" : "Nueva promoción"}
          </h2>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form className="flex-1 overflow-y-auto" onSubmit={handleSubmit}>
          <div className="space-y-6 px-6 py-5">
            {errors.length > 0 ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                {errors.map((e, i) => (
                  <p className="text-xs text-rose-700" key={i}>{e}</p>
                ))}
              </div>
            ) : null}

            {/* ── Sección 1: Información básica ─────────────────────────── */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                1. Información básica
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Nombre <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Ej: 10% en bebidas este fin de semana"
                    required
                    type="text"
                    value={form.name}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Código (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase focus:border-violet-500 focus:outline-none"
                      onChange={(e) => set("code", e.target.value.toUpperCase())}
                      placeholder="Ej: VERANO10"
                      type="text"
                      value={form.code}
                    />
                    <button
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => set("code", generateCode())}
                      title="Generar código"
                      type="button"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Tipo <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    onChange={(e) => { set("type", e.target.value); set("application", "ALL_PRODUCTS"); }}
                    value={form.type}
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED_AMOUNT">Monto fijo ($)</option>
                    <option value="TWO_FOR_ONE">2x1 – lleva 2, paga 1</option>
                    <option value="THREE_FOR_TWO">3x2 – lleva 3, paga 2</option>
                    <option value="MINIMUM_PURCHASE">Compra mínima</option>
                    <option value="SPECIAL_PRICE">Precio especial</option>
                    <option value="BUNDLED_PRODUCTS">Productos casados</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Activación
                  </label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "AUTOMATIC", label: "Automática" },
                        { value: "MANUAL_CODE", label: "Por código" },
                        { value: "BOTH", label: "Ambas" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                          form.activationType === opt.value
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => set("activationType", opt.value)}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sección 2: Campos por tipo ────────────────────────────── */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                2. Configuración del descuento
              </h3>
              <div className="space-y-3">

                {/* PERCENTAGE / FIXED_AMOUNT */}
                {(form.type === "PERCENTAGE" || form.type === "FIXED_AMOUNT") ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Valor del descuento{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        {form.type === "PERCENTAGE" ? "%" : "$"}
                      </span>
                      <input
                        className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                        min={0}
                        max={form.type === "PERCENTAGE" ? 100 : undefined}
                        onChange={(e) => set("discountValue", e.target.value)}
                        placeholder={form.type === "PERCENTAGE" ? "10" : "25.00"}
                        required
                        step="any"
                        type="number"
                        value={form.discountValue}
                      />
                    </div>
                  </div>
                ) : null}

                {/* MINIMUM_PURCHASE */}
                {form.type === "MINIMUM_PURCHASE" ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Compra mínima ($) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                          min={0}
                          onChange={(e) => set("minimumAmount", e.target.value)}
                          placeholder="200.00"
                          required
                          step="any"
                          type="number"
                          value={form.minimumAmount}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Tipo de descuento <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            checked={form.minimumPurchaseDiscountType === "PERCENTAGE"}
                            className="accent-violet-600"
                            name="minimumPurchaseDiscountType"
                            onChange={() => set("minimumPurchaseDiscountType", "PERCENTAGE")}
                            type="radio"
                            value="PERCENTAGE"
                          />
                          % Porcentaje
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                          <input
                            checked={form.minimumPurchaseDiscountType === "FIXED_AMOUNT"}
                            className="accent-violet-600"
                            name="minimumPurchaseDiscountType"
                            onChange={() => set("minimumPurchaseDiscountType", "FIXED_AMOUNT")}
                            type="radio"
                            value="FIXED_AMOUNT"
                          />
                          $ Monto fijo
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        {form.minimumPurchaseDiscountType === "FIXED_AMOUNT" ? "Descuento ($)" : "Descuento (%)"} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                          {form.minimumPurchaseDiscountType === "FIXED_AMOUNT" ? "$" : "%"}
                        </span>
                        <input
                          className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                          min={0}
                          max={form.minimumPurchaseDiscountType === "PERCENTAGE" ? 100 : undefined}
                          onChange={(e) => set("discountValue", e.target.value)}
                          placeholder={form.minimumPurchaseDiscountType === "FIXED_AMOUNT" ? "50.00" : "5"}
                          required
                          step="any"
                          type="number"
                          value={form.discountValue}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {/* SPECIAL_PRICE */}
                {form.type === "SPECIAL_PRICE" ? (
                  <>
                    <ProductSearchInput
                      label="Producto"
                      required
                      products={filteredProductsA}
                      isOpen={productAOpen}
                      searchValue={form.productASearch}
                      onSearchChange={(v) => { set("productASearch", v); set("productAId", ""); setProductAOpen(true); }}
                      onSelect={(p) => { set("productAId", p.id); set("productASearch", p.name); setProductAOpen(false); }}
                      onOpen={() => setProductAOpen(true)}
                      onClose={() => setProductAOpen(false)}
                    />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Precio especial ($) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                          min={0}
                          onChange={(e) => set("fixedPrice", e.target.value)}
                          placeholder="9.90"
                          required
                          step="any"
                          type="number"
                          value={form.fixedPrice}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {/* BUNDLED_PRODUCTS */}
                {form.type === "BUNDLED_PRODUCTS" ? (
                  <>
                    <ProductSearchInput
                      label="Producto A (detonador)"
                      required
                      products={filteredProductsA}
                      isOpen={productAOpen}
                      searchValue={form.productASearch}
                      onSearchChange={(v) => { set("productASearch", v); set("productAId", ""); setProductAOpen(true); }}
                      onSelect={(p) => { set("productAId", p.id); set("productASearch", p.name); setProductAOpen(false); }}
                      onOpen={() => setProductAOpen(true)}
                      onClose={() => setProductAOpen(false)}
                    />
                    <ProductSearchInput
                      label="Producto B (con descuento)"
                      required
                      products={filteredProductsB}
                      isOpen={productBOpen}
                      searchValue={form.productBSearch}
                      onSearchChange={(v) => { set("productBSearch", v); set("productBId", ""); setProductBOpen(true); }}
                      onSelect={(p) => { set("productBId", p.id); set("productBSearch", p.name); setProductBOpen(false); }}
                      onOpen={() => setProductBOpen(true)}
                      onClose={() => setProductBOpen(false)}
                    />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Descuento en producto B (%) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
                        <input
                          className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-violet-500 focus:outline-none"
                          min={1}
                          max={100}
                          onChange={(e) => set("productBDiscount", e.target.value)}
                          placeholder="50"
                          required
                          step="any"
                          type="number"
                          value={form.productBDiscount}
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Application selector */}
                {showApplication && !forcedApplication ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Aplicación
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      onChange={(e) => set("application", e.target.value)}
                      value={form.application}
                    >
                      <option value="ALL_PRODUCTS">Toda la tienda</option>
                      <option value="CATEGORY">Por categoría</option>
                      <option value="SPECIFIC_PRODUCT">Producto específico</option>
                    </select>
                  </div>
                ) : null}

                {/* Category selector */}
                {(effectiveApplication === "CATEGORY" || forcedApplication === "CATEGORY") ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Categoría <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      onChange={(e) => set("categoryName", e.target.value)}
                      required
                      value={form.categoryName}
                    >
                      <option value="">Seleccionar categoría...</option>
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Product selector for PERCENTAGE/FIXED_AMOUNT SPECIFIC_PRODUCT */}
                {effectiveApplication === "SPECIFIC_PRODUCT" &&
                  form.type !== "SPECIAL_PRICE" ? (
                  <ProductSearchInput
                    label="Producto específico"
                    required
                    products={filteredProductsA}
                    isOpen={productAOpen}
                    searchValue={form.productASearch}
                    onSearchChange={(v) => { set("productASearch", v); set("productAId", ""); setProductAOpen(true); }}
                    onSelect={(p) => { set("productAId", p.id); set("productASearch", p.name); setProductAOpen(false); }}
                    onOpen={() => setProductAOpen(true)}
                    onClose={() => setProductAOpen(false)}
                  />
                ) : null}
              </div>
            </div>

            {/* ── Sección 3: Condiciones ────────────────────────────────── */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                3. Condiciones y vigencia
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Fecha inicio <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      onChange={(e) => set("startsAt", e.target.value)}
                      required
                      type="date"
                      value={form.startsAt}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Fecha fin <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      onChange={(e) => set("endsAt", e.target.value)}
                      required
                      type="date"
                      value={form.endsAt}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-700">
                    Días de la semana (opcional)
                  </label>
                  <div className="flex gap-1.5">
                    {WEEKDAYS.map(({ label, value }) => (
                      <button
                        key={value}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                          form.daysOfWeek.includes(value)
                            ? "bg-violet-600 text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                        onClick={() => toggleDow(value)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Usos máximos totales
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      min={1}
                      onChange={(e) => set("maxUsages", e.target.value)}
                      placeholder="Sin límite"
                      step={1}
                      type="number"
                      value={form.maxUsages}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Usos máximos por cliente
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                      min={1}
                      onChange={(e) => set("maxUsagesPerCustomer", e.target.value)}
                      placeholder="Sin límite"
                      step={1}
                      type="number"
                      value={form.maxUsagesPerCustomer}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? "Guardando..."
                : editing
                ? "Guardar cambios"
                : "Crear promoción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ProductSearchInput ───────────────────────────────────────────────────────

function ProductSearchInput({
  label,
  required,
  products,
  isOpen,
  searchValue,
  onSearchChange,
  onSelect,
  onOpen,
  onClose,
}: {
  label: string;
  required?: boolean;
  products: ProductRecord[];
  isOpen: boolean;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSelect: (p: ProductRecord) => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef}>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        <input
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-violet-500 focus:outline-none"
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onOpen}
          placeholder="Buscar producto..."
          type="text"
          value={searchValue}
        />
        {isOpen && products.length > 0 ? (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {products.map((p) => (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                key={p.id}
                onClick={() => onSelect(p)}
                type="button"
              >
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {formatMoney(p.salePrice)} · Stock: {p.stock}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  Icon,
  iconClass,
  title,
  value,
  subtitle,
  subtitleClass,
}: {
  Icon: LucideIcon;
  iconClass: string;
  title: string;
  value: string;
  subtitle: string;
  subtitleClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-0.5 text-xl font-bold text-slate-950">{value}</p>
          <p className={`mt-0.5 text-xs ${subtitleClass}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── State components ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <p className="text-sm font-medium text-rose-700">{message}</p>
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
        <Tag className="text-violet-400" size={24} />
      </div>
      <p className="text-sm font-semibold text-slate-700">
        {hasFilters ? "Sin resultados" : "Sin promociones"}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {hasFilters
          ? "Ninguna promoción coincide con los filtros aplicados."
          : "Crea tu primera promoción para atraer más clientes."}
      </p>
      {hasFilters ? (
        <button
          className="mt-4 text-xs font-medium text-violet-600 hover:text-violet-800"
          onClick={onClear}
          type="button"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
