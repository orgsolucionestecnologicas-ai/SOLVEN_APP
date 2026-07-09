"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatARS } from "@/lib/format-currency";

type ProductRecord = {
  id: string;
  name: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

type InventoryMovementRecord = {
  id: string;
  productId: string;
  quantityChange: number;
  reason: string;
  createdAt: string;
  product: { name: string };
};

type StockAdjustmentResponse = {
  data?: { product: ProductRecord; inventoryMovement: { id: string } };
  error?: { message: string; details?: string[] };
};

type ActiveTab = "Stock actual" | "Movimientos" | "Entradas" | "Salidas" | "Ajustes" | "Alertas";

const TABS: ActiveTab[] = ["Stock actual", "Movimientos", "Entradas", "Salidas", "Ajustes", "Alertas"];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Abarrotes: ["arroz", "azúcar", "aceite", "café", "harina", "frijol", "sal", "sopa", "pasta", "cereal", "galleta", "maíz", "lentejas", "atún"],
  Bebidas: ["agua", "refresco", "jugo", "gaseosa", "bebida", "cerveza", "vino", "soda", "té"],
  Lácteos: ["leche", "queso", "yogur", "mantequilla", "crema de leche", "manteca"],
  Carnes: ["pollo", "carne", "res", "cerdo", "pescado", "jamón", "salchicha", "chorizo", "camarón"],
  Limpieza: ["jabón", "detergente", "cloro", "limpiador", "escoba", "trapeador", "desinfectante"],
  "Cuidado Personal": ["shampoo", "pasta dental", "desodorante", "loción", "gel capilar", "pañal"],
  Hogar: ["papel", "servilleta", "bolsa", "foco", "pilas", "vela", "foil"],
  Panadería: ["pan", "bizcocho", "torta", "rosca", "dona"],
  Congelados: ["helado", "hielo", "congelado", "paleta"],
  Snacks: ["papas", "chips", "cacahuate", "pistache", "nuez", "maní", "palomitas", "frituras"]
};

const BADGE_COLORS: Record<string, string> = {
  Abarrotes: "bg-amber-100 text-amber-800",
  Bebidas: "bg-blue-100 text-blue-800",
  Lácteos: "bg-sky-100 text-sky-800",
  Carnes: "bg-rose-100 text-rose-800",
  Limpieza: "bg-teal-100 text-teal-800",
  "Cuidado Personal": "bg-purple-100 text-purple-800",
  Hogar: "bg-orange-100 text-orange-800",
  Panadería: "bg-yellow-100 text-yellow-800",
  Congelados: "bg-cyan-100 text-cyan-800",
  Snacks: "bg-emerald-100 text-emerald-800",
  Otros: "bg-slate-100 text-slate-700"
};

const TIPOS_AJUSTE_NEGATIVO = [
  "Pérdida / Deterioro",
  "Conteo físico",
  "Daño",
  "Robo",
  "Donación",
  "Corrección",
  "Otro"
] as const;

const MOTIVOS_BY_TIPO_NEGATIVO: Record<string, string[]> = {
  "Pérdida / Deterioro": [
    "Vencimiento de producto",
    "Deterioro por manejo",
    "Condiciones de almacenamiento",
    "Otro"
  ],
  "Conteo físico": [
    "Diferencia en conteo",
    "Corrección de inventario",
    "Error de conteo",
    "Otro"
  ],
  Daño: [
    "Daño accidental",
    "Daño en transporte",
    "Daño en almacenamiento",
    "Otro"
  ],
  Robo: [
    "Robo externo",
    "Robo interno",
    "Pérdida no justificada",
    "Otro"
  ],
  Donación: [
    "Donación a terceros",
    "Muestra gratuita",
    "Producto de cortesía",
    "Otro"
  ],
  Corrección: [
    "Error administrativo",
    "Ajuste contable",
    "Corrección de sistema",
    "Otro"
  ],
  Otro: ["Otro motivo"]
};

const CHART_ENTRIES: [string, string][] = [
  ["Abarrotes", "#7c3aed"],
  ["Bebidas", "#3b82f6"],
  ["Lácteos", "#22c55e"],
  ["Limpieza", "#f97316"],
  ["Cuidado Personal", "#ec4899"],
  ["Panadería", "#f59e0b"],
  ["Otros", "#94a3b8"]
];

function getProductCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Otros";
}

function getChartCategory(cat: string): string {
  return CHART_ENTRIES.some(([c]) => c === cat) ? cat : "Otros";
}

function getMovementType(m: InventoryMovementRecord): "entrada" | "salida" | "ajuste" {
  if (m.reason.startsWith("SALE:")) return "salida";
  if (m.reason.startsWith("RETURN:") || m.quantityChange > 0) return "entrada";
  return "ajuste";
}

function formatReason(reason: string): string {
  if (reason.startsWith("SALE:")) return "Venta";
  if (reason.startsWith("RETURN:")) return "Devolución";
  return reason;
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportMovementsToCsv(movements: InventoryMovementRecord[]) {
  const header = ["Fecha", "Producto", "Tipo", "Motivo", "Cantidad"];
  const rows = movements.map((m) => [
    dateFormatter.format(new Date(m.createdAt)),
    m.product.name,
    getMovementType(m),
    formatReason(m.reason),
    String(m.quantityChange)
  ]);
  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movimientos_inventario_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

const numberFormatter = new Intl.NumberFormat("es-419", { maximumFractionDigits: 0 });

export function InventoryTab() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("Stock actual");
  const [searchQuery, setSearchQuery] = useState("");
  const [movementProductFilter, setMovementProductFilter] = useState("");
  const [movementDateFrom, setMovementDateFrom] = useState("");
  const [movementDateTo, setMovementDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRecord | null>(null);
  const [isStockEntryOpen, setIsStockEntryOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setIsLoadingProducts(true);

    async function loadProducts() {
      try {
        const res = await fetch("/api/products", { headers: { Accept: "application/json" } });
        const body = (await res.json()) as { data?: ProductRecord[]; error?: { message: string } };
        if (!isActive) return;
        if (!res.ok || !body.data) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
          return;
        }
        setProducts(body.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
        }
      } finally {
        if (isActive) setIsLoadingProducts(false);
      }
    }

    void loadProducts();
    return () => { isActive = false; };
  }, [refreshKey]);

  useEffect(() => {
    let isActive = true;
    setIsLoadingMovements(true);

    async function loadMovements() {
      try {
        const res = await fetch("/api/inventory-movements", { headers: { Accept: "application/json" } });
        const body = (await res.json()) as { data?: InventoryMovementRecord[]; error?: { message: string } };
        if (!isActive) return;
        setMovements(res.ok && body.data ? body.data : []);
      } catch {
        if (isActive) setMovements([]);
      } finally {
        if (isActive) setIsLoadingMovements(false);
      }
    }

    void loadMovements();
    return () => { isActive = false; };
  }, [refreshKey]);

  const inStockCount = useMemo(() => products.filter((p) => p.stock > 0).length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= 5).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock === 0).length, [products]);
  const alertProducts = useMemo(() => products.filter((p) => p.stock <= 5), [products]);

  const totalInventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + p.stock * Number(p.costPrice), 0),
    [products]
  );

  const lastMovementDateByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      const time = new Date(m.createdAt).getTime();
      const current = map.get(m.productId);
      if (current === undefined || time > current) map.set(m.productId, time);
    }
    return map;
  }, [movements]);

  const staleProductIds = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const ids = new Set<string>();
    for (const p of products) {
      const lastMovement = lastMovementDateByProduct.get(p.id);
      if (lastMovement === undefined || lastMovement < thirtyDaysAgo) ids.add(p.id);
    }
    return ids;
  }, [products, lastMovementDateByProduct]);

  const movementsByType = useMemo(() => ({
    entrada: movements.filter((m) => getMovementType(m) === "entrada"),
    salida: movements.filter((m) => getMovementType(m) === "salida"),
    ajuste: movements.filter((m) => getMovementType(m) === "ajuste")
  }), [movements]);

  const tabCounts: Record<ActiveTab, number> = useMemo(() => ({
    "Stock actual": products.length,
    Movimientos: movements.length,
    Entradas: movementsByType.entrada.length,
    Salidas: movementsByType.salida.length,
    Ajustes: movementsByType.ajuste.length,
    Alertas: alertProducts.length
  }), [products.length, movements.length, movementsByType, alertProducts.length]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.slice(-6).toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const filteredMovements = useMemo(() => {
    let result =
      activeTab === "Entradas" ? movementsByType.entrada
      : activeTab === "Salidas" ? movementsByType.salida
      : activeTab === "Ajustes" ? movementsByType.ajuste
      : movements;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) => m.product.name.toLowerCase().includes(q) || m.reason.toLowerCase().includes(q)
      );
    }

    if (movementProductFilter) {
      result = result.filter((m) => m.productId === movementProductFilter);
    }

    if (movementDateFrom) {
      const from = new Date(movementDateFrom);
      result = result.filter((m) => new Date(m.createdAt) >= from);
    }

    if (movementDateTo) {
      const to = new Date(movementDateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((m) => new Date(m.createdAt) <= to);
    }

    return result;
  }, [
    movements,
    movementsByType,
    activeTab,
    searchQuery,
    movementProductFilter,
    movementDateFrom,
    movementDateTo
  ]);

  const movementProductOptions = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const activeList: unknown[] =
    activeTab === "Stock actual" ? filteredProducts
    : activeTab === "Alertas" ? alertProducts
    : filteredMovements;

  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const sliceEnd = safePage * pageSize;

  const paginatedProducts = filteredProducts.slice(sliceStart, sliceEnd);
  const paginatedMovements = filteredMovements.slice(sliceStart, sliceEnd);
  const paginatedAlerts = alertProducts.slice(sliceStart, sliceEnd);

  const isLoading = isLoadingProducts || isLoadingMovements;
  const stockPercentage =
    products.length > 0 ? Math.round((inStockCount / products.length) * 100) : 0;

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleStockAdjusted() {
    setAdjustingProduct(null);
    setRefreshKey((k) => k + 1);
    showSuccess("Stock actualizado exitosamente.");
  }

  function handleStockEntryDone() {
    setIsStockEntryOpen(false);
    setRefreshKey((k) => k + 1);
    showSuccess("Entrada de stock registrada exitosamente.");
  }

  function changePage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
  }

  function handleMovementProductFilterChange(value: string) {
    setMovementProductFilter(value);
    setCurrentPage(1);
  }

  function handleMovementDateFromChange(value: string) {
    setMovementDateFrom(value);
    setCurrentPage(1);
  }

  function handleMovementDateToChange(value: string) {
    setMovementDateTo(value);
    setCurrentPage(1);
  }

  function clearMovementFilters() {
    setMovementProductFilter("");
    setMovementDateFrom("");
    setMovementDateTo("");
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Inventario</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Control de stock y movimientos de productos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => router.push("/inventory/adjust")}
            type="button"
          >
            Ajuste de inventario
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            onClick={() => router.push("/inventory/entry")}
            type="button"
          >
            <Plus size={14} />
            Entrada de stock
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 px-6 py-5 lg:grid-cols-6">
        <MetricCard
          Icon={Package}
          iconClass="bg-violet-100 text-violet-600"
          subtitle={`${inStockCount} con stock`}
          subtitleClass="text-slate-500"
          title="Total productos"
          value={products.length}
        />
        <MetricCard
          Icon={Layers}
          iconClass="bg-emerald-100 text-emerald-600"
          subtitle={`${stockPercentage}% del total`}
          subtitleClass="text-slate-500"
          title="Con stock"
          value={inStockCount}
        />
        <MetricCard
          Icon={AlertTriangle}
          iconClass="bg-orange-100 text-orange-600"
          onSubtitleClick={() => handleTabChange("Alertas")}
          subtitle="Ver alertas →"
          subtitleClass="cursor-pointer text-orange-600 hover:text-orange-800"
          title="Stock bajo"
          value={lowStockCount}
        />
        <MetricCard
          Icon={XCircle}
          iconClass="bg-rose-100 text-rose-600"
          onSubtitleClick={() => handleTabChange("Alertas")}
          subtitle="Ver alertas →"
          subtitleClass="cursor-pointer text-rose-600 hover:text-rose-800"
          title="Sin stock"
          value={outOfStockCount}
        />
        <MetricCard
          Icon={Layers}
          formattedValue={formatARS(totalInventoryValue)}
          iconClass="bg-violet-100 text-violet-600"
          subtitle="Costo × stock actual"
          subtitleClass="text-slate-500"
          title="Valor total de inventario"
          value={totalInventoryValue}
        />
        <MetricCard
          Icon={AlertTriangle}
          iconClass="bg-amber-100 text-amber-600"
          onSubtitleClick={() => handleTabChange("Stock actual")}
          subtitle="Ver productos →"
          subtitleClass="cursor-pointer text-amber-600 hover:text-amber-800"
          title="Sin movimiento reciente"
          value={staleProductIds.size}
        />
      </div>

      {/* Body: tabs + content + sidebar */}
      <div className="flex border-t border-slate-200">
        {/* Left: tabs + content */}
        <div className="min-w-0 flex-1">
          {/* Tabs */}
          <div className="border-b border-slate-200 px-5">
            <div className="flex overflow-x-auto">
              {TABS.map((tab) => (
                <TabButton
                  active={activeTab === tab}
                  count={tabCounts[tab]}
                  key={tab}
                  label={tab}
                  onClick={() => handleTabChange(tab)}
                />
              ))}
            </div>
          </div>

          {/* Search */}
          {activeTab !== "Alertas" ? (
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative max-w-sm flex-1 min-w-[200px]">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder={
                      activeTab === "Stock actual" ? "Buscar producto..." : "Buscar movimiento..."
                    }
                    type="text"
                    value={searchQuery}
                  />
                </div>

                {["Movimientos", "Entradas", "Salidas", "Ajustes"].includes(activeTab) ? (
                  <>
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                      onChange={(e) => handleMovementProductFilterChange(e.target.value)}
                      value={movementProductFilter}
                    >
                      <option value="">Todos los productos</option>
                      {movementProductOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                      onChange={(e) => handleMovementDateFromChange(e.target.value)}
                      type="date"
                      value={movementDateFrom}
                    />
                    <span className="text-xs text-slate-400">a</span>
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                      onChange={(e) => handleMovementDateToChange(e.target.value)}
                      type="date"
                      value={movementDateTo}
                    />
                    <button
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50"
                      onClick={clearMovementFilters}
                      type="button"
                    >
                      Limpiar filtros
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      onClick={() => exportMovementsToCsv(filteredMovements)}
                      type="button"
                    >
                      <Download size={13} />
                      Exportar CSV
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Content */}
          <div className="px-5 py-4">
            {isLoading ? <LoadingState /> : null}
            {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
            {!isLoading && !loadError ? (
              <>
                {activeTab === "Stock actual" ? (
                  paginatedProducts.length === 0 ? (
                    <EmptyState label="No hay productos que coincidan" />
                  ) : (
                    <StockTable
                      onAdjustStock={(p) => { setAdjustingProduct(p); setOpenMenuId(null); }}
                      onMenuToggle={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                      openMenuId={openMenuId}
                      products={paginatedProducts}
                      staleProductIds={staleProductIds}
                    />
                  )
                ) : null}

                {["Movimientos", "Entradas", "Salidas", "Ajustes"].includes(activeTab) ? (
                  paginatedMovements.length === 0 ? (
                    <EmptyState label="No hay movimientos que coincidan" />
                  ) : (
                    <MovementsList movements={paginatedMovements} />
                  )
                ) : null}

                {activeTab === "Alertas" ? (
                  paginatedAlerts.length === 0 ? (
                    <EmptyState label="No hay alertas de stock en este momento" />
                  ) : (
                    <AlertsTab
                      onRestock={(p) => setAdjustingProduct(p)}
                      products={paginatedAlerts}
                    />
                  )
                ) : null}

                {/* Pagination */}
                {activeList.length > pageSize ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">
                      Mostrando {sliceStart + 1} a {Math.min(sliceEnd, activeList.length)} de{" "}
                      {activeList.length}
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
                          <span className="px-2 text-sm text-slate-400" key={`ellipsis-${i}`}>
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
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 shrink-0 border-l border-slate-200 px-4 py-5">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">
                Distribución por categoría
              </h3>
              <DonutChart products={products} />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">Últimos movimientos</h3>
                <button
                  className="text-xs text-violet-600 hover:text-violet-800"
                  onClick={() => handleTabChange("Movimientos")}
                  type="button"
                >
                  Ver todos →
                </button>
              </div>
              <RecentMovements movements={movements.slice(0, 5)} />
            </div>

            {alertProducts.length > 0 ? (
              <div className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">Alertas de stock</h3>
                  <button
                    className="text-xs text-violet-600 hover:text-violet-800"
                    onClick={() => handleTabChange("Alertas")}
                    type="button"
                  >
                    Ver todas →
                  </button>
                </div>
                <SidebarAlerts
                  onRestock={(p) => setAdjustingProduct(p)}
                  products={alertProducts.slice(0, 4)}
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {/* Dropdown overlay */}
      {openMenuId ? (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      ) : null}

      {/* Modals */}
      {adjustingProduct ? (
        <AdjustStockModal
          onClose={() => setAdjustingProduct(null)}
          onSuccess={handleStockAdjusted}
          product={adjustingProduct}
        />
      ) : null}

      {isStockEntryOpen ? (
        <StockEntryModal
          onClose={() => setIsStockEntryOpen(false)}
          onSuccess={handleStockEntryDone}
          products={products}
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
  formattedValue?: string;
  subtitle: string;
  subtitleClass: string;
  onSubtitleClick?: () => void;
};

function MetricCard({
  Icon,
  iconClass,
  title,
  value,
  formattedValue,
  subtitle,
  subtitleClass,
  onSubtitleClick
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {formattedValue ?? numberFormatter.format(value)}
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className={`mt-2 text-xs ${subtitleClass}`} onClick={onSubtitleClick}>
        {subtitle}
      </p>
    </div>
  );
}

function TabButton({
  active,
  count,
  label,
  onClick
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-violet-600 text-violet-600"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
      {count > 0 ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            active ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StockTable({
  products,
  openMenuId,
  onMenuToggle,
  onAdjustStock,
  staleProductIds
}: {
  products: ProductRecord[];
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onAdjustStock: (product: ProductRecord) => void;
  staleProductIds: Set<string>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Código
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((product) => (
              <StockRow
                isMenuOpen={openMenuId === product.id}
                isStale={staleProductIds.has(product.id)}
                key={product.id}
                onAdjustStock={() => onAdjustStock(product)}
                onMenuToggle={() => onMenuToggle(product.id)}
                product={product}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockRow({
  product,
  isMenuOpen,
  isStale,
  onMenuToggle,
  onAdjustStock
}: {
  product: ProductRecord;
  isMenuOpen: boolean;
  isStale: boolean;
  onMenuToggle: () => void;
  onAdjustStock: () => void;
}) {
  const category = getProductCategory(product.name);
  const badgeColor = BADGE_COLORS[category] ?? BADGE_COLORS["Otros"];

  return (
    <tr
      className={`hover:bg-slate-50/50 ${isStale ? "border-l-2 border-amber-400 bg-amber-50/40" : ""}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100" />
          <p className="max-w-[180px] truncate text-sm font-medium text-slate-950">{product.name}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
          {category}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">
          #{product.id.slice(-6).toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={
            product.stock === 0
              ? "text-sm font-semibold text-rose-600"
              : product.stock <= 5
                ? "text-sm font-semibold text-orange-600"
                : "text-sm font-semibold text-emerald-600"
          }
        >
          {numberFormatter.format(product.stock)}
        </span>
      </td>
      <td className="px-4 py-3">
        <StockStatusBadge stock={product.stock} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onMenuToggle}
              type="button"
            >
              <MoreHorizontal size={13} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onAdjustStock}
                  type="button"
                >
                  Ajustar stock
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

function StockStatusBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
        Sin stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Stock bajo
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      Con stock
    </span>
  );
}

function MovementsList({ movements }: { movements: InventoryMovementRecord[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Motivo
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cantidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {movements.map((m) => {
              const type = getMovementType(m);
              return (
                <tr
                  className={`hover:bg-slate-50/50 ${
                    m.quantityChange < 0 ? "border-l-2 border-rose-400 bg-rose-50/40" : ""
                  }`}
                  key={m.id}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        type === "entrada"
                          ? "bg-emerald-100"
                          : type === "salida"
                            ? "bg-rose-100"
                            : "bg-slate-100"
                      }`}
                    >
                      {type === "entrada" ? (
                        <ArrowUp className="text-emerald-600" size={13} />
                      ) : type === "salida" ? (
                        <ArrowDown className="text-rose-600" size={13} />
                      ) : (
                        <ArrowUpDown className="text-slate-500" size={13} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-[160px] truncate text-sm font-medium text-slate-950">
                      {m.product.name}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{formatReason(m.reason)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        m.quantityChange > 0
                          ? "text-emerald-700"
                          : m.quantityChange < 0
                            ? "text-rose-700"
                            : "text-slate-700"
                      }`}
                    >
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500">
                      {dateFormatter.format(new Date(m.createdAt))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsTab({
  products,
  onRestock
}: {
  products: ProductRecord[];
  onRestock: (p: ProductRecord) => void;
}) {
  const outOfStock = products.filter((p) => p.stock === 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5);

  return (
    <div className="space-y-4">
      {outOfStock.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <XCircle className="text-rose-500" size={15} />
            <h3 className="text-sm font-semibold text-slate-950">
              Sin stock ({outOfStock.length})
            </h3>
          </div>
          <div className="rounded-xl border border-rose-200 bg-white">
            {outOfStock.map((p, i) => (
              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  i < outOfStock.length - 1 ? "border-b border-rose-100" : ""
                }`}
                key={p.id}
              >
                <div>
                  <p className="text-sm font-medium text-slate-950">{p.name}</p>
                  <p className="text-xs text-slate-500">Stock actual: 0 unidades</p>
                </div>
                <button
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                  onClick={() => onRestock(p)}
                  type="button"
                >
                  Reabastecer
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {lowStock.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={15} />
            <h3 className="text-sm font-semibold text-slate-950">
              Stock bajo ({lowStock.length})
            </h3>
          </div>
          <div className="rounded-xl border border-orange-200 bg-white">
            {lowStock.map((p, i) => (
              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  i < lowStock.length - 1 ? "border-b border-orange-100" : ""
                }`}
                key={p.id}
              >
                <div>
                  <p className="text-sm font-medium text-slate-950">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    Stock actual: {p.stock} unidades
                  </p>
                </div>
                <button
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
                  onClick={() => onRestock(p)}
                  type="button"
                >
                  Reabastecer
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DonutChart({ products }: { products: ProductRecord[] }) {
  const total = products.length;

  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos</p>
      </div>
    );
  }

  const counts: Record<string, number> = {};
  for (const p of products) {
    const cat = getChartCategory(getProductCategory(p.name));
    counts[cat] = (counts[cat] ?? 0) + 1;
  }

  const cx = 80, cy = 80, r = 56, strokeW = 20;
  let currentAngle = 0;

  const slices = CHART_ENTRIES.filter(([cat]) => (counts[cat] ?? 0) > 0).map(([cat, color]) => {
    const count = counts[cat] ?? 0;
    const sweep = (count / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + (sweep >= 360 ? 359.9 : sweep);
    currentAngle += sweep;
    return { cat, color, count, startAngle, endAngle };
  });

  return (
    <div>
      <svg className="mx-auto block" height={160} viewBox="0 0 160 160" width={160}>
        <circle cx={cx} cy={cy} fill="none" r={r} stroke="#f1f5f9" strokeWidth={strokeW} />
        {slices.map((slice) => (
          <path
            d={arcPath(cx, cy, r, slice.startAngle, slice.endAngle)}
            fill="none"
            key={slice.cat}
            stroke={slice.color}
            strokeLinecap="butt"
            strokeWidth={strokeW}
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
          productos
        </text>
      </svg>

      <div className="mt-3 space-y-2">
        {slices.map((slice) => (
          <div className="flex items-center justify-between" key={slice.cat}>
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-xs text-slate-700">{slice.cat}</span>
            </div>
            <span className="text-xs font-semibold text-slate-950">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentMovements({ movements }: { movements: InventoryMovementRecord[] }) {
  if (movements.length === 0) {
    return <p className="text-xs text-slate-400">Sin movimientos recientes</p>;
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const type = getMovementType(m);
        return (
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
              m.quantityChange < 0
                ? "border-l-2 border-rose-400 bg-rose-50/40"
                : "border-slate-100 bg-slate-50"
            }`}
            key={m.id}
          >
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                type === "entrada"
                  ? "bg-emerald-100"
                  : type === "salida"
                    ? "bg-rose-100"
                    : "bg-slate-200"
              }`}
            >
              {type === "entrada" ? (
                <ArrowUp className="text-emerald-600" size={11} />
              ) : type === "salida" ? (
                <ArrowDown className="text-rose-600" size={11} />
              ) : (
                <ArrowUpDown className="text-slate-500" size={11} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-950">{m.product.name}</p>
              <p className="text-[10px] text-slate-400">{formatReason(m.reason)}</p>
            </div>
            <span
              className={`shrink-0 text-xs font-semibold ${
                m.quantityChange > 0
                  ? "text-emerald-700"
                  : m.quantityChange < 0
                    ? "text-rose-700"
                    : "text-slate-600"
              }`}
            >
              {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SidebarAlerts({
  products,
  onRestock
}: {
  products: ProductRecord[];
  onRestock: (p: ProductRecord) => void;
}) {
  if (products.length === 0) {
    return <p className="text-xs text-slate-400">No hay alertas</p>;
  }

  return (
    <div className="space-y-2">
      {products.map((p) => (
        <div
          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
            p.stock === 0
              ? "border-rose-200 bg-rose-50"
              : "border-orange-200 bg-orange-50"
          }`}
          key={p.id}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-950">{p.name}</p>
            <p
              className={`text-[10px] font-medium ${
                p.stock === 0 ? "text-rose-600" : "text-orange-600"
              }`}
            >
              {p.stock === 0 ? "Sin stock" : `${p.stock} unid.`}
            </p>
          </div>
          <button
            className="ml-2 shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-violet-700 hover:bg-violet-100"
            onClick={() => onRestock(p)}
            type="button"
          >
            Reabastecer
          </button>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <Package className="mx-auto mb-3 text-slate-300" size={32} />
      <p className="text-sm font-semibold text-slate-950">{label}</p>
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

function AdjustStockModal({
  product,
  onClose,
  onSuccess
}: {
  product: ProductRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [newStock, setNewStock] = useState("");
  const [reason, setReason] = useState("");
  const [tipoAjuste, setTipoAjuste] = useState("");
  const [motivo, setMotivo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmStep, setShowConfirmStep] = useState(false);

  const newStockNumber = newStock === "" ? null : parseInt(newStock, 10);
  const difference =
    newStockNumber !== null && Number.isInteger(newStockNumber)
      ? newStockNumber - product.stock
      : null;
  const isNegativeAdjustment = difference !== null && difference < 0;

  function handleTipoChange(tipo: string) {
    setTipoAjuste(tipo);
    const motivoOpts = MOTIVOS_BY_TIPO_NEGATIVO[tipo] ?? [];
    setMotivo(motivoOpts[0] ?? "");
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNegativeAdjustment && !showConfirmStep) {
      setShowConfirmStep(true);
      return;
    }
    void performSubmit();
  }

  async function performSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const finalReason = isNegativeAdjustment
      ? `${tipoAjuste} - ${motivo}`
      : reason.trim();

    try {
      const response = await fetch("/api/inventory-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          newStock: Number(newStock),
          reason: finalReason
        })
      });
      const responseBody = (await response.json()) as StockAdjustmentResponse;

      if (!response.ok || !responseBody.data) {
        setSubmitError(
          responseBody.error?.details?.[0] ??
          responseBody.error?.message ??
          "No se pudo ajustar el stock."
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
          <h2 className="text-sm font-semibold text-slate-950">Ajustar stock</h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Producto</dt>
              <dd className="text-sm font-medium text-slate-950">{product.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Stock actual</dt>
              <dd className="text-sm font-semibold text-slate-950">
                {numberFormatter.format(product.stock)}
              </dd>
            </div>
          </dl>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleFormSubmit}>
          {isNegativeAdjustment && showConfirmStep ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Estás por dar de baja stock. Revisá los datos antes de confirmar.
                </p>
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Producto</dt>
                  <dd className="text-sm font-medium text-slate-950">{product.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Stock actual</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {numberFormatter.format(product.stock)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Nuevo stock</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {numberFormatter.format(newStockNumber ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Cantidad a dar de baja</dt>
                  <dd className="text-sm font-semibold text-rose-700">
                    {numberFormatter.format(Math.abs(difference ?? 0))}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="inv-adj-stock"
                >
                  Nuevo stock
                </label>
                <input
                  autoFocus
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                  disabled={isSubmitting}
                  id="inv-adj-stock"
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
              </div>

              {isNegativeAdjustment ? (
                <>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="inv-adj-tipo"
                    >
                      Tipo de ajuste
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                      disabled={isSubmitting}
                      id="inv-adj-tipo"
                      onChange={(e) => handleTipoChange(e.target.value)}
                      required
                      value={tipoAjuste}
                    >
                      <option value="">Selecciona un tipo</option>
                      {TIPOS_AJUSTE_NEGATIVO.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="inv-adj-motivo"
                    >
                      Motivo específico
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none disabled:opacity-50"
                      disabled={isSubmitting || !tipoAjuste}
                      id="inv-adj-motivo"
                      onChange={(e) => setMotivo(e.target.value)}
                      required
                      value={motivo}
                    >
                      <option value="">Selecciona un motivo</option>
                      {(MOTIVOS_BY_TIPO_NEGATIVO[tipoAjuste] ?? []).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="inv-adj-reason"
                  >
                    Motivo del ajuste
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                    disabled={isSubmitting}
                    id="inv-adj-reason"
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej. Conteo físico, merma, donación"
                    required
                    type="text"
                    value={reason}
                  />
                </div>
              )}
            </>
          )}

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            {isNegativeAdjustment && showConfirmStep ? (
              <>
                <button
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmStep(false)}
                  type="button"
                >
                  Volver
                </button>
                <button
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Guardando..." : "Confirmar ajuste"}
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function StockEntryModal({
  products,
  onClose,
  onSuccess
}: {
  products: ProductRecord[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Entrada de mercancía");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const quantityNumber = quantity === "" ? null : parseInt(quantity, 10);
  const newStockPreview =
    selectedProduct &&
    quantityNumber !== null &&
    Number.isInteger(quantityNumber) &&
    quantityNumber > 0
      ? selectedProduct.stock + quantityNumber
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct || !quantityNumber || quantityNumber <= 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/inventory-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          newStock: selectedProduct.stock + quantityNumber,
          reason: reason.trim() || "Entrada de mercancía"
        })
      });
      const responseBody = (await response.json()) as StockAdjustmentResponse;

      if (!response.ok || !responseBody.data) {
        setSubmitError(
          responseBody.error?.details?.[0] ??
          responseBody.error?.message ??
          "No se pudo registrar la entrada."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo registrar la entrada.");
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
            Registrar entrada de stock
          </h2>
          <button className="text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="entry-product"
            >
              Producto
            </label>
            <select
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="entry-product"
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              value={selectedProductId}
            >
              <option value="">Seleccionar producto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="entry-quantity"
            >
              Cantidad a agregar
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="entry-quantity"
              min="1"
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              required
              step="1"
              type="number"
              value={quantity}
            />
            {newStockPreview !== null ? (
              <p className="mt-1 text-xs text-emerald-700">
                Nuevo stock: {numberFormatter.format(newStockPreview)} unidades
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="entry-reason"
            >
              Motivo
            </label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="entry-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Entrada de mercancía"
              type="text"
              value={reason}
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
              {isSubmitting ? "Registrando..." : "Registrar entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
