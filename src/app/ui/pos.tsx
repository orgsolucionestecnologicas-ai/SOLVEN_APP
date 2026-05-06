"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Grid3X3,
  Landmark,
  LayoutList,
  MoreHorizontal,
  Package,
  PauseCircle,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { SalesList } from "./sales-list";

type ProductRecord = {
  id: string;
  name: string;
  salePrice: string;
  stock: number;
};

type ProductsResponse = {
  data?: ProductRecord[];
  error?: { message: string };
};

type CustomerRecord = {
  id: string;
  name: string;
};

type CustomersResponse = {
  data?: CustomerRecord[];
  error?: { message: string };
};

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
};

type CreateSaleResponse = {
  data?: { id: string };
  error?: { message: string; details?: string[] };
};

type CashPaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "Otro";
type PaymentMethod = CashPaymentMethod | "Fiado";
type ActiveTab = "Venta actual" | "Historial";

type CashPaymentCard = { method: CashPaymentMethod; Icon: LucideIcon };

const CATEGORIES = [
  "Todos",
  "Alimentos",
  "Bebidas",
  "Limpieza",
  "Cuidado Personal",
  "Hogar",
  "Otros",
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentos: ["arroz", "azúcar", "aceite", "leche", "pan", "huevo", "atún", "café", "harina", "frijol", "sal"],
  Bebidas: ["agua", "refresco", "jugo", "gaseosa", "bebida"],
  Limpieza: ["jabón", "detergente", "cloro", "limpiador", "escoba"],
  "Cuidado Personal": ["shampoo", "pasta dental", "desodorante", "crema"],
  Hogar: ["papel", "servilleta", "bolsa", "foco"],
};

const PRODUCTS_PER_PAGE = 10;

const TABS: ActiveTab[] = ["Venta actual", "Historial"];

const CASH_PAYMENT_CARDS: CashPaymentCard[] = [
  { method: "Efectivo", Icon: Wallet },
  { method: "Tarjeta", Icon: CreditCard },
  { method: "Transferencia", Icon: Landmark },
  { method: "Otro", Icon: MoreHorizontal },
];

function getProductCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Otros";
}

export function Pos() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Venta actual");

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashReceived, setCashReceived] = useState("");

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setProductsLoading(true);
    setProductsError(null);

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          headers: { Accept: "application/json" },
        });
        const body = (await response.json()) as ProductsResponse;

        if (!isActive) return;

        if (!response.ok || !body.data) {
          setProductsError("No se pudieron cargar los productos.");
          return;
        }

        setProducts(body.data);
      } catch {
        if (isActive) setProductsError("No se pudieron cargar los productos.");
      } finally {
        if (isActive) setProductsLoading(false);
      }
    }

    void loadProducts();
    return () => {
      isActive = false;
    };
  }, [productsRefreshKey]);

  const isFiado = paymentMethod === "Fiado";

  useEffect(() => {
    if (!isFiado || customersLoaded) return;

    let isActive = true;
    setCustomersLoading(true);

    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers", {
          headers: { Accept: "application/json" },
        });
        const body = (await response.json()) as CustomersResponse;

        if (isActive && response.ok && body.data) {
          setCustomers(body.data);
          if (body.data.length > 0) {
            setSelectedCustomerId(body.data[0].id);
          }
        }
      } catch {
        // customer selector shows empty state
      } finally {
        if (isActive) {
          setCustomersLoading(false);
          setCustomersLoaded(true);
        }
      }
    }

    void loadCustomers();
    return () => {
      isActive = false;
    };
  }, [isFiado, customersLoaded]);

  const filteredProducts = useMemo(() => {
    let result = products;
    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((p) => p.name.toLowerCase().includes(q));
    if (activeCategory !== "Todos") {
      result = result.filter((p) => getProductCategory(p.name) === activeCategory);
    }
    return result;
  }, [products, searchQuery, activeCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cashReceivedNum = Number(cashReceived) || 0;

  function handleNewSale() {
    setCartItems([]);
    setPaymentMethod("Efectivo");
    setCashReceived("");
    setSelectedCustomerId("");
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function addToCart(product: ProductRecord) {
    if (product.stock === 0) return;

    setSubmitError(null);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity >= existing.maxStock) return prev;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: Number(product.salePrice),
          maxStock: product.stock,
        },
      ];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity < 1) {
      setCartItems((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(quantity, item.maxStock) }
          : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cartItems.length === 0) {
      setSubmitError("El carrito está vacío. Agregá al menos un producto.");
      return;
    }

    if (isFiado && !selectedCustomerId) {
      setSubmitError("Seleccioná un cliente para la venta a crédito.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const apiPaymentType = isFiado ? "CREDIT" : "CASH";

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: apiPaymentType,
          ...(isFiado ? { customerId: selectedCustomerId } : {}),
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      const body = (await response.json()) as CreateSaleResponse;

      if (!response.ok || !body.data) {
        const errorDetail = body.error?.details?.[0];
        const errorMessage = body.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? "No se pudo registrar la venta."
        );
        return;
      }

      setCartItems([]);
      setPaymentMethod("Efectivo");
      setCashReceived("");
      setSelectedCustomerId("");
      setProductsRefreshKey((k) => k + 1);
      setSuccessMessage("Venta registrada exitosamente.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setSubmitError("No se pudo registrar la venta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-slate-200 px-5 sm:px-6">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab
                  ? "border-b-2 border-violet-600 pb-3 pt-4 text-sm font-semibold text-violet-600"
                  : "border-b-2 border-transparent pb-3 pt-4 text-sm font-medium text-slate-500 hover:text-slate-900"
              }
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "Historial" ? (
        <SalesList />
      ) : (
        <div className="flex divide-x divide-slate-200">
          {/* ── LEFT PANEL ── */}
          <div className="flex min-w-0 flex-1 flex-col">

            {/* 1. Page header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h1 className="text-lg font-bold text-slate-950">Ventas</h1>
                <p className="text-xs text-slate-500">
                  Realiza ventas rápidas y eficientes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                  onClick={handleNewSale}
                  type="button"
                >
                  <Plus size={13} />
                  Nueva venta
                </button>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-orange-300 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                  type="button"
                >
                  <PauseCircle size={13} />
                  Suspender venta
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  type="button"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </div>

            {/* 2. Search + controls bar */}
            <div className="border-b border-slate-100 px-5 pb-0 pt-4 sm:px-6">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    type="text"
                    value={searchQuery}
                  />
                  {searchQuery ? (
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => setSearchQuery("")}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    className={
                      viewMode === "grid"
                        ? "rounded-md bg-white p-1.5 text-slate-700 shadow-sm"
                        : "rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                    }
                    onClick={() => setViewMode("grid")}
                    title="Vista cuadrícula"
                    type="button"
                  >
                    <Grid3X3 size={15} />
                  </button>
                  <button
                    className={
                      viewMode === "list"
                        ? "rounded-md bg-white p-1.5 text-slate-700 shadow-sm"
                        : "rounded-md p-1.5 text-slate-400 hover:text-slate-600"
                    }
                    onClick={() => setViewMode("list")}
                    title="Vista lista"
                    type="button"
                  >
                    <LayoutList size={15} />
                  </button>
                </div>

                <button
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  onClick={() => setProductsRefreshKey((k) => k + 1)}
                  title="Actualizar productos"
                  type="button"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              {/* Category pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={
                      activeCategory === cat
                        ? "flex-shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white"
                        : "flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }
                    onClick={() => setActiveCategory(cat)}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Products area */}
            <div className="px-5 py-4 sm:px-6">
              {/* Success banner */}
              {successMessage ? (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="flex-1 text-sm font-medium text-emerald-800">
                    {successMessage}
                  </p>
                  <button
                    className="text-emerald-500 hover:text-emerald-700"
                    onClick={() => setSuccessMessage(null)}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}

              {productsLoading ? <ProductsLoadingState viewMode={viewMode} /> : null}

              {!productsLoading && productsError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-medium text-rose-900">{productsError}</p>
                </div>
              ) : null}

              {!productsLoading && !productsError && filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-950">
                    {searchQuery.trim() || activeCategory !== "Todos"
                      ? "Sin resultados para ese filtro."
                      : "No hay productos registrados."}
                  </p>
                  {searchQuery.trim() || activeCategory !== "Todos" ? (
                    <button
                      className="mt-3 text-sm text-violet-600 hover:text-violet-700"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("Todos");
                      }}
                      type="button"
                    >
                      Limpiar filtros
                    </button>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      Registrá productos en el módulo de Inventario para poder vender.
                    </p>
                  )}
                </div>
              ) : null}

              {!productsLoading && !productsError && paginatedProducts.length > 0 ? (
                <>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                      {paginatedProducts.map((product) => {
                        const cartItem = cartItems.find(
                          (item) => item.productId === product.id
                        );
                        const inCartQty = cartItem?.quantity ?? 0;
                        const isOutOfStock = product.stock === 0;

                        return (
                          <button
                            className={
                              isOutOfStock
                                ? "cursor-not-allowed rounded-xl border border-slate-100 bg-slate-50 p-3 text-left opacity-50"
                                : inCartQty > 0
                                  ? "rounded-xl border-2 border-violet-400 bg-violet-50 p-3 text-left transition-colors"
                                  : "rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-violet-300 hover:shadow active:bg-slate-50"
                            }
                            disabled={isOutOfStock}
                            key={product.id}
                            onClick={() => addToCart(product)}
                            type="button"
                          >
                            <div className="mb-1.5 flex items-start justify-between">
                              <ProductStockBadge stock={product.stock} />
                              {inCartQty > 0 ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                                  {inCartQty}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm font-medium leading-tight text-slate-950">
                              {product.name}
                            </p>
                            <p className="mt-1.5 text-sm font-bold text-emerald-700">
                              {formatMoney(product.salePrice)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {paginatedProducts.map((product) => {
                        const cartItem = cartItems.find(
                          (item) => item.productId === product.id
                        );
                        const inCartQty = cartItem?.quantity ?? 0;
                        const isOutOfStock = product.stock === 0;

                        return (
                          <button
                            className={
                              isOutOfStock
                                ? "flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-left opacity-50"
                                : inCartQty > 0
                                  ? "flex w-full items-center gap-3 rounded-lg border-2 border-violet-400 bg-violet-50 px-4 py-2.5 text-left"
                                  : "flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left shadow-sm hover:border-violet-300"
                            }
                            disabled={isOutOfStock}
                            key={product.id}
                            onClick={() => addToCart(product)}
                            type="button"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-950">
                                {product.name}
                              </p>
                            </div>
                            <ProductStockBadge stock={product.stock} />
                            <p className="tabular-nums text-sm font-bold text-emerald-700">
                              {formatMoney(product.salePrice)}
                            </p>
                            {inCartQty > 0 ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                                {inCartQty}
                              </span>
                            ) : (
                              <div className="h-5 w-5 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 ? (
                    <div className="mt-5 flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {filteredProducts.length} productos · página {currentPage} de{" "}
                        {totalPages}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                          type="button"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (page) => (
                            <button
                              key={page}
                              className={
                                page === currentPage
                                  ? "flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-xs font-semibold text-white"
                                  : "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                              }
                              onClick={() => setCurrentPage(page)}
                              type="button"
                            >
                              {page}
                            </button>
                          )
                        )}
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                          type="button"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              {/* 4. Quick actions bar */}
              <div className="mt-5 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-4">
                <QuickActionButton Icon={Users} label="Buscar cliente" />
                <QuickActionButton Icon={FileText} label="Nota / Observación" />
                <QuickActionButton Icon={FileText} label="Cotización" />
                <QuickActionButton Icon={PauseCircle} label="Suspender" />
                <QuickActionButton Icon={Trash2} label="Limpiar venta" danger />
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex w-80 flex-shrink-0 flex-col bg-white lg:w-96">

            {/* Cart header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">
                Venta actual
                {cartItemCount > 0 ? (
                  <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {cartItemCount}
                  </span>
                ) : null}
              </h2>
              {cartItems.length > 0 ? (
                <button
                  className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => setCartItems([])}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>

            {/* Cart table */}
            {cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <ShoppingCart size={18} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  El carrito está vacío
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tocá un producto para agregarlo
                </p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-1.5">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Producto
                  </div>
                  <div className="w-12 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Precio
                  </div>
                  <div className="w-[68px] text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Cant.
                  </div>
                  <div className="w-14 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Subtotal
                  </div>
                  <div className="w-5 flex-shrink-0" />
                </div>

                {/* Cart rows */}
                <div className="divide-y divide-slate-100">
                  {cartItems.map((item) => (
                    <div
                      className="flex items-center gap-2 px-4 py-2.5"
                      key={item.productId}
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Package size={13} className="text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-950">
                          {item.productName}
                        </p>
                      </div>
                      <div className="w-12 text-right text-xs tabular-nums text-slate-500">
                        {formatMoneyNum(item.unitPrice)}
                      </div>
                      <div className="flex w-[68px] items-center justify-center gap-0.5">
                        <button
                          className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] text-slate-600 hover:bg-slate-50"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          type="button"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums text-slate-950">
                          {item.quantity}
                        </span>
                        <button
                          className={
                            item.quantity >= item.maxStock
                              ? "flex h-5 w-5 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] text-slate-300"
                              : "flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-[11px] text-slate-600 hover:bg-slate-50"
                          }
                          disabled={item.quantity >= item.maxStock}
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-14 text-right text-xs font-semibold tabular-nums text-slate-950">
                        {formatMoneyNum(item.unitPrice * item.quantity)}
                      </div>
                      <button
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-slate-300 hover:text-rose-500"
                        onClick={() => removeFromCart(item.productId)}
                        type="button"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {/* Agregar descuento row */}
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <Tag size={13} className="text-violet-500" />
                    </div>
                    <button
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                      type="button"
                    >
                      Agregar descuento
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Payment form */}
            <form
              className="space-y-3 border-t border-slate-200 px-5 py-4"
              onSubmit={handleSubmit}
            >
              {/* Totals */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Subtotal</span>
                  <span className="tabular-nums text-xs font-medium text-slate-700">
                    {formatMoneyNum(cartTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Descuento</span>
                  <span className="tabular-nums text-xs font-medium text-emerald-600">
                    -{formatMoneyNum(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Impuestos (0%)</span>
                  <span className="tabular-nums text-xs font-medium text-slate-700">
                    {formatMoneyNum(0)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-950">
                      Total a pagar
                    </span>
                    <span className="tabular-nums text-lg font-bold text-slate-950">
                      {formatMoneyNum(cartTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment method — 4 cards */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Método de pago
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {CASH_PAYMENT_CARDS.map(({ method, Icon }) => (
                    <button
                      key={method}
                      className={
                        paymentMethod === method
                          ? "flex flex-col items-center gap-1 rounded-xl border-2 border-violet-500 bg-violet-50 px-1 py-2.5"
                          : "flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1 py-2.5 hover:border-slate-300 hover:bg-white"
                      }
                      onClick={() => {
                        setPaymentMethod(method);
                        setSelectedCustomerId("");
                      }}
                      type="button"
                    >
                      <Icon
                        size={15}
                        className={
                          paymentMethod === method
                            ? "text-violet-600"
                            : "text-slate-400"
                        }
                      />
                      <span
                        className={
                          paymentMethod === method
                            ? "text-[9px] font-semibold text-violet-700"
                            : "text-[9px] font-medium text-slate-600"
                        }
                      >
                        {method}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Fiado — 5th option */}
                <button
                  className={
                    paymentMethod === "Fiado"
                      ? "mt-1.5 flex w-full items-center justify-center rounded-xl border-2 border-amber-400 bg-amber-50 py-2 text-xs font-semibold text-amber-800"
                      : "mt-1.5 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-white"
                  }
                  onClick={() => setPaymentMethod("Fiado")}
                  type="button"
                >
                  Venta a crédito (Fiado)
                </button>
              </div>

              {/* Efectivo recibido + Cambio */}
              {paymentMethod === "Efectivo" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex-shrink-0 text-xs font-medium text-slate-600">
                      Efectivo recibido
                    </label>
                    <input
                      className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-right text-sm tabular-nums text-slate-950 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                      inputMode="decimal"
                      min="0"
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={cashReceived}
                    />
                  </div>
                  {cashReceivedNum > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        Cambio
                      </span>
                      <span
                        className={
                          cashReceivedNum >= cartTotal
                            ? "tabular-nums text-sm font-semibold text-emerald-600"
                            : "tabular-nums text-sm font-semibold text-rose-600"
                        }
                      >
                        {cashReceivedNum >= cartTotal
                          ? formatMoneyNum(cashReceivedNum - cartTotal)
                          : `-${formatMoneyNum(cartTotal - cashReceivedNum)}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Customer selector — Fiado only */}
              {isFiado ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cliente
                  </label>
                  {customersLoading ? (
                    <p className="text-sm text-slate-500">Cargando clientes...</p>
                  ) : customers.length === 0 ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      No hay clientes registrados. Creá un cliente primero.
                    </p>
                  ) : (
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
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

              {/* Submit error */}
              {submitError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
                  <p className="text-sm font-medium text-rose-900">{submitError}</p>
                </div>
              ) : null}

              {/* Cobrar button row */}
              <div className="flex gap-2">
                <button
                  className={
                    isSubmitting || cartItems.length === 0
                      ? "flex flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-400"
                      : isFiado
                        ? "flex flex-1 items-center justify-center rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 active:scale-[0.98]"
                        : "flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.98]"
                  }
                  disabled={isSubmitting || cartItems.length === 0}
                  type="submit"
                >
                  {isSubmitting
                    ? "Procesando..."
                    : cartItems.length > 0
                      ? `Cobrar ${formatMoneyNum(cartTotal)}`
                      : "Cobrar"}
                </button>
                <button
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  title="Imprimir"
                  type="button"
                >
                  <Printer size={15} />
                </button>
                <button
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  title="Más opciones"
                  type="button"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

type QuickActionButtonProps = {
  Icon: LucideIcon;
  label: string;
  danger?: boolean;
};

function QuickActionButton({ Icon, label, danger = false }: QuickActionButtonProps) {
  return (
    <button
      className={
        danger
          ? "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50"
          : "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }
      type="button"
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function ProductStockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
        Sin stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Stock: {stock}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      Stock: {stock}
    </span>
  );
}

function ProductsLoadingState({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            className="h-12 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
            key={index}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          key={index}
        />
      ))}
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
}

function formatMoneyNum(value: number) {
  return moneyFormatter.format(value);
}

const moneyFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});
