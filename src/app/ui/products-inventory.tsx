"use client";

import {
  BarChart2,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProductRecord = {
  id: string;
  name: string;
  categoryName: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

type ProductsResponse = {
  data?: ProductRecord[];
  error?: { message: string };
};

type CreateProductResponse = {
  data?: ProductRecord;
  error?: { message: string; details?: string[] };
};

type EditProductResponse = {
  data?: ProductRecord;
  error?: { message: string; details?: string[] };
};

type StockAdjustmentResponse = {
  data?: { product: ProductRecord; inventoryMovement: { id: string } };
  error?: { message: string; details?: string[] };
};

type StatusFilter = "Todos" | "Con stock" | "Stock bajo" | "Sin stock";
type StockRangeFilter = "Todos" | "0" | "1-5" | "6-20" | "20+";

const DEFAULT_PRODUCT_CATEGORIES = [
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

const CATEGORY_COLORS: Record<string, string> = {
  Alimentos: "bg-amber-100 text-amber-800",
  Bebidas: "bg-blue-100 text-blue-800",
  Lácteos: "bg-sky-100 text-sky-800",
  Limpieza: "bg-teal-100 text-teal-800",
  "Cuidado Personal": "bg-purple-100 text-purple-800",
  Hogar: "bg-orange-100 text-orange-800",
  Panadería: "bg-yellow-100 text-yellow-800",
  Snacks: "bg-emerald-100 text-emerald-800",
  Otros: "bg-slate-100 text-slate-700"
};

function getProductPresentation(name: string): string {
  const lower = name.toLowerCase();
  if (/botella|litro|\blt\b|ml\b/.test(lower)) return "Botella";
  if (/\bcaja\b|paquete|\bpack\b/.test(lower)) return "Caja";
  if (/\bbolsa\b/.test(lower)) return "Bolsa";
  return "Unidad";
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export function ProductsInventory() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [stockRangeFilter, setStockRangeFilter] = useState<StockRangeFilter>("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          headers: { Accept: "application/json" }
        });
        const responseBody = (await response.json()) as ProductsResponse;

        if (!isActive) return;

        if (!response.ok || !responseBody.data) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
          return;
        }

        setProducts(responseBody.data);
        setLoadError(null);
      } catch {
        if (isActive) {
          setLoadError("No se pudo cargar el inventario.");
          setProducts([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadProducts();
    return () => { isActive = false; };
  }, [refreshKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("solven_categories");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (Array.isArray(parsed)) setCustomCategories(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("solven_categories", JSON.stringify(customCategories));
  }, [customCategories]);

  const allCategories = useMemo(
    () => ["Todas", ...DEFAULT_PRODUCT_CATEGORIES, ...customCategories],
    [customCategories]
  );

  const selectableCategories = useMemo(
    () => [...DEFAULT_PRODUCT_CATEGORIES, ...customCategories],
    [customCategories]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: products.length };
    for (const cat of allCategories) {
      if (cat !== "Todas") {
        counts[cat] = products.filter((p) => p.categoryName === cat).length;
      }
    }
    return counts;
  }, [products, allCategories]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.slice(-6).toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "Todas") {
      result = result.filter((p) => p.categoryName === categoryFilter);
    }

    if (statusFilter === "Con stock") {
      result = result.filter((p) => p.stock > 0);
    } else if (statusFilter === "Stock bajo") {
      result = result.filter((p) => p.stock > 0 && p.stock <= 5);
    } else if (statusFilter === "Sin stock") {
      result = result.filter((p) => p.stock === 0);
    }

    if (stockRangeFilter === "0") {
      result = result.filter((p) => p.stock === 0);
    } else if (stockRangeFilter === "1-5") {
      result = result.filter((p) => p.stock >= 1 && p.stock <= 5);
    } else if (stockRangeFilter === "6-20") {
      result = result.filter((p) => p.stock >= 6 && p.stock <= 20);
    } else if (stockRangeFilter === "20+") {
      result = result.filter((p) => p.stock > 20);
    }

    return result;
  }, [products, searchQuery, categoryFilter, statusFilter, stockRangeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleProductCreated() {
    setIsCreateModalOpen(false);
    setRefreshKey((k) => k + 1);
    showSuccess("Producto creado exitosamente.");
  }

  function handleProductEdited() {
    setEditingProduct(null);
    setRefreshKey((k) => k + 1);
    showSuccess("Producto actualizado exitosamente.");
  }

  function handleStockAdjusted() {
    setAdjustingProduct(null);
    setRefreshKey((k) => k + 1);
    showSuccess("Stock actualizado exitosamente.");
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("Todos");
    setStockRangeFilter("Todos");
    setCategoryFilter("Todas");
    setCurrentPage(1);
  }

  function changePage(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Productos</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Gestiona tu catálogo de productos y servicios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            type="button"
          >
            <Upload size={14} />
            Importar productos
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            onClick={() => router.push("/products/new")}
            type="button"
          >
            <Plus size={14} />
            Nuevo producto
          </button>
        </div>
      </div>

      {successMessage ? (
        <div className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}

      {/* Body */}
      <div className="flex border-t border-slate-200">
        {/* Left sidebar */}
        <aside className="w-52 shrink-0 border-r border-slate-200 px-3 py-4 lg:w-60">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Categorías
            </span>
            <button
              className="text-xs font-medium text-violet-600 hover:text-violet-800"
              onClick={() => setShowCategoryManager(true)}
              type="button"
            >
              + Nueva
            </button>
          </div>

          <ul className="space-y-0.5">
            {allCategories.map((cat) => {
              const isActive = cat === categoryFilter;
              const label = cat === "Todas" ? "Todas las categorías" : cat;
              const count = categoryCounts[cat] ?? 0;

              return (
                <li key={cat}>
                  <button
                    className={
                      isActive
                        ? "flex w-full items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
                        : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    }
                    onClick={() => {
                      setCategoryFilter(cat);
                      setCurrentPage(1);
                    }}
                    type="button"
                  >
                    <span className="truncate">{label}</span>
                    <span
                      className={
                        isActive
                          ? "ml-2 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700"
                          : "ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 rounded-xl bg-violet-50 p-3">
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
              <Package className="text-white" size={13} />
            </div>
            <p className="text-xs font-semibold text-slate-950">
              Organiza mejor tu inventario
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Crea categorías personalizadas para tus productos
            </p>
            <button
              className="mt-2 text-xs font-medium text-violet-600 hover:text-violet-800"
              onClick={() => setShowCategoryManager(true)}
              type="button"
            >
              Gestionar categorías →
            </button>
          </div>
        </aside>

        {/* Right content */}
        <div className="min-w-0 flex-1 px-5 py-4">
          {/* Search + Filters */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar producto por nombre, código o barra..."
                  type="text"
                  value={searchQuery}
                />
              </div>
              <button
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${showFilters ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setShowFilters((v) => !v)}
                type="button"
              >
                <Filter size={13} />
                Filtros
              </button>
              <div className="flex rounded-lg border border-slate-200 p-0.5">
                <button
                  className="rounded-md bg-violet-50 p-1.5 text-violet-600"
                  type="button"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  className="rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <LayoutList size={14} />
                </button>
              </div>
            </div>

            {showFilters ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  value={statusFilter}
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="Con stock">Con stock</option>
                  <option value="Stock bajo">Stock bajo</option>
                  <option value="Sin stock">Sin stock</option>
                </select>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                  onChange={(e) => {
                    setStockRangeFilter(e.target.value as StockRangeFilter);
                    setCurrentPage(1);
                  }}
                  value={stockRangeFilter}
                >
                  <option value="Todos">Stock: Todos</option>
                  <option value="0">0 unidades</option>
                  <option value="1-5">1 a 5</option>
                  <option value="6-20">6 a 20</option>
                  <option value="20+">Más de 20</option>
                </select>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  value={categoryFilter}
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "Todas" ? "Categoría: Todas" : cat}
                    </option>
                  ))}
                </select>
                <select className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none">
                  <option>Proveedor: Todos</option>
                </select>
                <button
                  className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-800"
                  onClick={clearFilters}
                  type="button"
                >
                  <RotateCcw size={12} />
                  Limpiar filtros
                </button>
              </div>
            ) : null}
          </div>

          {/* Table */}
          {isLoading ? <LoadingState /> : null}
          {!isLoading && loadError ? <ErrorState message={loadError} /> : null}
          {!isLoading && !loadError && filteredProducts.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : null}
          {!isLoading && !loadError && filteredProducts.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-10 px-3 py-3">
                        <input
                          className="rounded border-slate-300"
                          type="checkbox"
                        />
                      </th>
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
                        Precio
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
                    {paginatedProducts.map((product) => (
                      <ProductRow
                        isMenuOpen={openMenuId === product.id}
                        key={product.id}
                        onAdjustStock={() => {
                          setAdjustingProduct(product);
                          setOpenMenuId(null);
                        }}
                        onEdit={() => {
                          setEditingProduct(product);
                          setOpenMenuId(null);
                        }}
                        onMenuToggle={() =>
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id
                          )
                        }
                        product={product}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Mostrando{" "}
                  {filteredProducts.length === 0
                    ? 0
                    : (safePage - 1) * pageSize + 1}{" "}
                  a {Math.min(safePage * pageSize, filteredProducts.length)} de{" "}
                  {filteredProducts.length} productos
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
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
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
      </div>

      {/* Dropdown overlay */}
      {openMenuId ? (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenMenuId(null)}
        />
      ) : null}

      {/* Modals */}
      {isCreateModalOpen ? (
        <CreateProductModal
          categories={selectableCategories}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleProductCreated}
        />
      ) : null}

      {editingProduct ? (
        <EditProductModal
          categories={selectableCategories}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleProductEdited}
          product={editingProduct}
        />
      ) : null}

      {adjustingProduct ? (
        <AdjustStockModal
          onClose={() => setAdjustingProduct(null)}
          onSuccess={handleStockAdjusted}
          product={adjustingProduct}
        />
      ) : null}

      {showCategoryManager ? (
        <CategoryManagerModal
          customCategories={customCategories}
          onAddCategory={(name) =>
            setCustomCategories((prev) => [...prev, name])
          }
          onClose={() => setShowCategoryManager(false)}
          onDeleteCategory={(name) =>
            setCustomCategories((prev) => prev.filter((c) => c !== name))
          }
          products={products}
        />
      ) : null}
    </div>
  );
}

type ProductRowProps = {
  product: ProductRecord;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onAdjustStock: () => void;
};

function ProductRow({
  product,
  isMenuOpen,
  onMenuToggle,
  onEdit,
  onAdjustStock
}: ProductRowProps) {
  const category = product.categoryName;
  const presentation = getProductPresentation(product.name);
  const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Otros"];

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-3 py-3">
        <input className="rounded border-slate-300" type="checkbox" />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {product.name}
            </p>
            <p className="text-xs text-slate-400">Presentación: {presentation}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}
        >
          {category}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">
          #{product.id.slice(-6).toUpperCase()}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-slate-950">
          {formatMoney(product.salePrice)}
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
        <div className="flex items-center justify-end gap-1">
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            title="Editar"
            type="button"
          >
            <Pencil size={13} />
          </button>
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Estadísticas"
            type="button"
          >
            <BarChart2 size={13} />
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
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={onEdit}
                  type="button"
                >
                  Ver detalles
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
                  onClick={onAdjustStock}
                  type="button"
                >
                  Ajustar stock
                </button>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={onMenuToggle}
                  type="button"
                >
                  Desactivar
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

type CreateProductModalProps = {
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
};

function CreateProductModal({ onClose, onSuccess, categories }: CreateProductModalProps) {
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState(categories[0] ?? "Otros");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          categoryName,
          costPrice: Number(costPrice),
          salePrice: Number(salePrice),
          stock: Number(stock)
        })
      });
      const responseBody = (await response.json()) as CreateProductResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo guardar el producto."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo guardar el producto.");
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
            Nuevo producto
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="product-name" label="Nombre">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Arroz blanco"
              required
              type="text"
              value={name}
            />
          </FormField>

          <FormField htmlFor="product-category" label="Categoría">
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-category"
              onChange={(e) => setCategoryName(e.target.value)}
              required
              value={categoryName}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="product-cost-price" label="Precio de costo">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-cost-price"
              min="0"
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={costPrice}
            />
          </FormField>

          <FormField htmlFor="product-sale-price" label="Precio de venta">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-sale-price"
              min="0"
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={salePrice}
            />
          </FormField>

          <FormField htmlFor="product-stock" label="Stock inicial">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="product-stock"
              min="0"
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
              required
              step="1"
              type="number"
              value={stock}
            />
          </FormField>

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
              {isSubmitting ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type EditProductModalProps = {
  product: ProductRecord;
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
};

function EditProductModal({ product, onClose, onSuccess, categories }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [categoryName, setCategoryName] = useState(product.categoryName);
  const [costPrice, setCostPrice] = useState(product.costPrice);
  const [salePrice, setSalePrice] = useState(product.salePrice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          categoryName,
          costPrice: Number(costPrice),
          salePrice: Number(salePrice)
        })
      });
      const responseBody = (await response.json()) as EditProductResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo actualizar el producto."
        );
        return;
      }

      onSuccess();
    } catch {
      setSubmitError("No se pudo actualizar el producto.");
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
            Editar producto
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="edit-product-name" label="Nombre">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-product-name"
              onChange={(e) => setName(e.target.value)}
              required
              type="text"
              value={name}
            />
          </FormField>

          <FormField htmlFor="edit-product-category" label="Categoría">
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-product-category"
              onChange={(e) => setCategoryName(e.target.value)}
              required
              value={categoryName}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FormField>

          <FormField htmlFor="edit-product-cost-price" label="Precio de costo">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-product-cost-price"
              min="0"
              onChange={(e) => setCostPrice(e.target.value)}
              required
              step="0.01"
              type="number"
              value={costPrice}
            />
          </FormField>

          <FormField htmlFor="edit-product-sale-price" label="Precio de venta">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="edit-product-sale-price"
              min="0"
              onChange={(e) => setSalePrice(e.target.value)}
              required
              step="0.01"
              type="number"
              value={salePrice}
            />
          </FormField>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Stock actual
            </label>
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-sm text-slate-700">
                {numberFormatter.format(product.stock)} unidades
              </span>
              <span className="text-xs text-slate-400">
                Usa Ajustar stock para modificar
              </span>
            </div>
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

type AdjustStockModalProps = {
  product: ProductRecord;
  onClose: () => void;
  onSuccess: () => void;
};

function AdjustStockModal({ product, onClose, onSuccess }: AdjustStockModalProps) {
  const [newStock, setNewStock] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const newStockNumber = newStock === "" ? null : parseInt(newStock, 10);
  const difference =
    newStockNumber !== null && Number.isInteger(newStockNumber)
      ? newStockNumber - product.stock
      : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/inventory-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          newStock: Number(newStock),
          reason: reason.trim()
        })
      });
      const responseBody = (await response.json()) as StockAdjustmentResponse;

      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo ajustar el stock."
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
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
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

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <FormField htmlFor="new-stock" label="Nuevo stock">
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="new-stock"
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
          </FormField>

          <FormField htmlFor="adjustment-reason" label="Motivo del ajuste">
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="adjustment-reason"
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Conteo físico, merma, donación"
              required
              type="text"
              value={reason}
            />
          </FormField>

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
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type CategoryManagerModalProps = {
  customCategories: string[];
  products: ProductRecord[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onClose: () => void;
};

function CategoryManagerModal({
  customCategories,
  products,
  onAddCategory,
  onDeleteCategory,
  onClose
}: CategoryManagerModalProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allExisting = [...DEFAULT_PRODUCT_CATEGORIES, ...customCategories];

  function handleAdd() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setAddError("El nombre no puede estar vacío.");
      return;
    }
    if (allExisting.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("Ya existe una categoría con ese nombre.");
      return;
    }
    onAddCategory(trimmed);
    setNewCategoryName("");
    setAddError(null);
  }

  function handleDelete(cat: string) {
    const usedBy = products.filter((p) => p.categoryName === cat).length;
    if (usedBy > 0) {
      setDeleteError(
        `No se puede eliminar: ${usedBy} ${usedBy === 1 ? "producto usa" : "productos usan"} esta categoría.`
      );
      return;
    }
    onDeleteCategory(cat);
    setDeleteError(null);
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
            Gestionar categorías
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Predeterminadas
          </p>
          <ul className="mb-5 space-y-0.5">
            {DEFAULT_PRODUCT_CATEGORIES.map((cat) => (
              <li
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700"
                key={cat}
              >
                <span>{cat}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  Predeterminada
                </span>
              </li>
            ))}
          </ul>

          {customCategories.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Personalizadas
              </p>
              <ul className="mb-4 space-y-0.5">
                {customCategories.map((cat) => (
                  <li
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    key={cat}
                  >
                    <span>{cat}</span>
                    <button
                      className="text-xs font-medium text-rose-500 hover:text-rose-700"
                      onClick={() => handleDelete(cat)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {deleteError ? (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-medium text-rose-900">{deleteError}</p>
            </div>
          ) : null}

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nueva categoría
            </p>
            <div className="flex gap-2">
              <input
                autoFocus
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  setAddError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Ej. Mascotas"
                type="text"
                value={newCategoryName}
              />
              <button
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={handleAdd}
                type="button"
              >
                Agregar
              </button>
            </div>
            {addError ? (
              <p className="mt-1.5 text-xs text-rose-600">{addError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
};

function FormField({ label, htmlFor, children }: FormFieldProps) {
  return (
    <div>
      <label
        className="mb-1.5 block text-sm font-medium text-slate-700"
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
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

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <Package className="mx-auto mb-3 text-slate-300" size={32} />
      <p className="text-sm font-semibold text-slate-950">
        No hay productos que coincidan
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Intenta ajustar los filtros o la búsqueda.
      </p>
      <button
        className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-800"
        onClick={onClear}
        type="button"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
}

const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 0
});
