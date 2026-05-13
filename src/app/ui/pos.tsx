"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  Globe,
  Landmark,
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
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { formatARS } from "@/lib/format-currency";
import Link from "next/link";
import { SalesList } from "./sales-list";

type ProductRecord = {
  id: string;
  name: string;
  categoryName: string;
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
  categoryName: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
};

type CreateSaleResponse = {
  data?: { id: string };
  error?: { message: string; details?: string[] };
};

type RawDiscountedItem = {
  productId: string;
  quantity: number;
  unitPrice: string;
  finalPrice: string;
  discountAmount: string;
  promotionId?: string;
};

type RawAppliedPromotion = {
  promotionId: string;
  name: string;
  discountAmount: string;
};

type ApplyResultData = {
  discountedItems: RawDiscountedItem[];
  appliedPromotions: RawAppliedPromotion[];
  totalDiscount: string;
};

type ApplyResponse = {
  data?: ApplyResultData;
  error?: { message: string };
};

type ActivePromotion = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  discountValue: string;
  application: string;
  categoryName: string | null;
  activationType: string;
  startsAt: string;
  endsAt: string;
  minimumAmount: string | null;
  fixedPrice: string | null;
  productBDiscount: string | null;
};

type ActivePromotionsResponse = {
  data?: ActivePromotion[];
  error?: { message: string };
};

type CashPaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia" | "VentaWeb" | "Otro";
type PaymentMethod = CashPaymentMethod | "Fiado";
type ActiveTab = "Venta actual" | "Historial";

type CashPaymentCard = { method: CashPaymentMethod; Icon: LucideIcon };

const DRAFT_KEY = "solven_draft";
const CART_KEY = "solven_pos_cart";

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
  { method: "VentaWeb", Icon: Globe },
  { method: "Otro", Icon: MoreHorizontal },
];

const PROMO_TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "Porcentaje",
  FIXED_AMOUNT: "Monto fijo",
  TWO_FOR_ONE: "2×1",
  THREE_FOR_TWO: "3×2",
  MINIMUM_PURCHASE: "Compra mínima",
  SPECIAL_PRICE: "Precio especial",
  BUNDLED_PRODUCTS: "Paquete",
};

function formatPromoDiscount(promo: ActivePromotion): string {
  const val = parseFloat(promo.discountValue);
  switch (promo.type) {
    case "PERCENTAGE":
      return `${val}%`;
    case "FIXED_AMOUNT":
      return `-$${val.toFixed(2)}`;
    case "TWO_FOR_ONE":
      return "2 por 1";
    case "THREE_FOR_TWO":
      return "3 por 2";
    case "MINIMUM_PURCHASE":
      return `${val}% desde $${parseFloat(promo.minimumAmount ?? "0").toFixed(0)}`;
    case "SPECIAL_PRICE":
      return `Precio: $${parseFloat(promo.fixedPrice ?? "0").toFixed(2)}`;
    case "BUNDLED_PRODUCTS":
      return `${parseFloat(promo.productBDiscount ?? "0")}% prod B`;
    default:
      return promo.discountValue;
  }
}

function formatPromoApplication(promo: ActivePromotion): string {
  switch (promo.application) {
    case "ALL_PRODUCTS":
      return "Todos los productos";
    case "CATEGORY":
      return `Categoría: ${promo.categoryName ?? "—"}`;
    case "SPECIFIC_PRODUCT":
      return "Producto específico";
    case "BUNDLED":
      return "Productos en paquete";
    default:
      return promo.application;
  }
}

function getProductCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Otros";
}

function readDraft(): CartItem[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function readSavedCart(): CartItem[] | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
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

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Efectivo");
  const [cashReceived, setCashReceived] = useState("");

  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [cotizacionOpen, setCotizacionOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const [applyResult, setApplyResult] = useState<ApplyResultData | null>(null);
  const [manualCodes, setManualCodes] = useState<string[]>([]);
  const [excludedPromotionIds, setExcludedPromotionIds] = useState<Set<string>>(new Set());
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoCodeOpen, setPromoCodeOpen] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null);

  const [promosPanelOpen, setPromosPanelOpen] = useState(false);
  const [activePromos, setActivePromos] = useState<ActivePromotion[]>([]);
  const [activePromosLoading, setActivePromosLoading] = useState(false);
  const [promoPanelSearch, setPromoPanelSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [cashRegisterStatus, setCashRegisterStatus] = useState<"loading" | "open" | "closed">("loading");
  const [showPrintModal, setShowPrintModal] = useState<{
    saleId: string;
    total: number;
    cartItems: CartItem[];
    paymentMethod: PaymentMethod;
  } | null>(null);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [optionalCustomerOpen, setOptionalCustomerOpen] = useState(false);

  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const applyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlCustomerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const savedCart = readSavedCart();
    if (savedCart) setCartItems(savedCart);
    if (readDraft()) setShowDraftBanner(true);
    const params = new URLSearchParams(window.location.search);
    const preselectedCustomerId = params.get("customerId");
    if (preselectedCustomerId) {
      urlCustomerIdRef.current = preselectedCustomerId;
      setPaymentMethod("Fiado");
    }
  }, []);

  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
      } else {
        localStorage.removeItem(CART_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [cartItems]);

  useEffect(() => {
    async function checkCashRegister() {
      try {
        const response = await fetch("/api/cash-register", {
          headers: { Accept: "application/json" },
        });
        const body = (await response.json()) as { data: unknown };
        setCashRegisterStatus(response.ok && body.data ? "open" : "closed");
      } catch {
        setCashRegisterStatus("closed");
      }
    }
    void checkCashRegister();
  }, []);

  useEffect(() => {
    if (!moreDropdownOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [moreDropdownOpen]);

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
    if ((!isFiado && !optionalCustomerOpen) || customersLoaded) return;

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
        }
      } catch {
        // customer search shows empty state
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
  }, [isFiado, optionalCustomerOpen, customersLoaded]);

  useEffect(() => {
    if (!urlCustomerIdRef.current || !customersLoaded) return;
    const target = customers.find((c) => c.id === urlCustomerIdRef.current);
    if (target) {
      setSelectedCustomer(target);
      urlCustomerIdRef.current = null;
    }
  }, [customers, customersLoaded]);

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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  useEffect(() => {
    if (applyDebounceRef.current) clearTimeout(applyDebounceRef.current);

    if (cartItems.length === 0) {
      setApplyResult(null);
      return;
    }

    applyDebounceRef.current = setTimeout(() => {
      async function run() {
        try {
          const response = await fetch("/api/promotions/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cartItems: cartItems.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                categoryName: item.categoryName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
              ...(manualCodes.length > 0 ? { promotionCodes: manualCodes } : {}),
              ...(selectedCustomer?.id ? { customerId: selectedCustomer.id } : {}),
            }),
          });
          const body = (await response.json()) as ApplyResponse;
          if (response.ok && body.data) setApplyResult(body.data);
        } catch {
          // promotions are non-blocking
        }
      }
      void run();
    }, 400);

    return () => {
      if (applyDebounceRef.current) clearTimeout(applyDebounceRef.current);
    };
  }, [cartItems, manualCodes, selectedCustomer]);

  useEffect(() => {
    if (!promosPanelOpen) return;
    let isActive = true;
    setActivePromosLoading(true);

    async function fetchActivePromos() {
      try {
        const response = await fetch("/api/promotions/active");
        const body = (await response.json()) as ActivePromotionsResponse;
        if (isActive && response.ok && body.data) setActivePromos(body.data);
      } catch {
        // panel shows empty state on error
      } finally {
        if (isActive) setActivePromosLoading(false);
      }
    }

    void fetchActivePromos();
    return () => { isActive = false; };
  }, [promosPanelOpen]);

  const displayedAppliedPromotions = useMemo(() => {
    if (!applyResult) return [];
    return applyResult.appliedPromotions.filter(
      (p) => !excludedPromotionIds.has(p.promotionId)
    );
  }, [applyResult, excludedPromotionIds]);

  const totalDiscount = useMemo(
    () => displayedAppliedPromotions.reduce((sum, p) => sum + parseFloat(p.discountAmount), 0),
    [displayedAppliedPromotions]
  );

  const discountedItemsMap = useMemo(() => {
    if (!applyResult) return new Map<string, RawDiscountedItem>();
    const map = new Map<string, RawDiscountedItem>();
    for (const item of applyResult.discountedItems) {
      const existing = map.get(item.productId);
      if (!existing || parseFloat(item.finalPrice) < parseFloat(existing.finalPrice)) {
        map.set(item.productId, item);
      }
    }
    return map;
  }, [applyResult]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cashReceivedNum = Number(cashReceived) || 0;
  const selectedCustomerId = selectedCustomer?.id ?? "";

  function clearSale() {
    setCartItems([]);
    setPaymentMethod("Efectivo");
    setCashReceived("");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSubmitError(null);
    setSuccessMessage(null);
    setApplyResult(null);
    setManualCodes([]);
    setExcludedPromotionIds(new Set());
    setPromoCodeInput("");
    setPromoCodeOpen(false);
    setPromoCodeError(null);
    setOptionalCustomerOpen(false);
    try { localStorage.removeItem(CART_KEY); } catch { /* ignore */ }
  }

  function handleNewSale() {
    const draft = readDraft();
    if (draft) {
      setShowDraftBanner(true);
      return;
    }
    clearSale();
  }

  function handleSuspend() {
    if (cartItems.length === 0) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage errors
    }
    clearSale();
    setSuccessMessage("Venta suspendida — puedes recuperarla con Nueva venta");
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  function handleRecoverDraft() {
    const draft = readDraft();
    if (draft) {
      setCartItems(draft);
      localStorage.removeItem(DRAFT_KEY);
    }
    setShowDraftBanner(false);
  }

  function handleDiscardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftBanner(false);
    clearSale();
  }

  function handleLimpiarVenta() {
    if (window.confirm("¿Limpiar la venta actual?")) {
      clearSale();
    }
  }

  async function handleApplyPromoCode() {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    if (manualCodes.includes(code)) {
      setPromoCodeInput("");
      setPromoCodeOpen(false);
      return;
    }

    const newCodes = [...manualCodes, code];

    try {
      const response = await fetch("/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cartItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            categoryName: getProductCategory(item.productName),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          promotionCodes: newCodes,
          ...(selectedCustomer?.id ? { customerId: selectedCustomer.id } : {}),
        }),
      });

      const body = (await response.json()) as ApplyResponse;
      if (response.ok && body.data) {
        const currentIds = new Set(applyResult?.appliedPromotions.map((p) => p.promotionId) ?? []);
        const hasNew = body.data.appliedPromotions.some((p) => !currentIds.has(p.promotionId));

        if (!hasNew) {
          setPromoCodeError("Código no válido");
          return;
        }

        setManualCodes(newCodes);
        setApplyResult(body.data);
        setPromoCodeInput("");
        setPromoCodeOpen(false);
        setPromoCodeError(null);
      } else {
        setPromoCodeError("Código no válido");
      }
    } catch {
      setPromoCodeError("Código no válido");
    }
  }

  function handleApplyActivePromotion(promo: ActivePromotion) {
    if (promo.code) {
      setManualCodes((prev) =>
        prev.includes(promo.code!) ? prev : [...prev, promo.code!]
      );
    } else {
      setSuccessMessage("Promoción aplicada automáticamente");
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    setPromosPanelOpen(false);
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
          categoryName: product.categoryName,
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
          ...(displayedAppliedPromotions.length > 0
            ? {
                promotionIds: displayedAppliedPromotions.map((p) => p.promotionId),
                discountAmount: totalDiscount,
              }
            : {}),
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

      const successSaleId = body.data.id;
      const successTotal = cartTotal - totalDiscount;
      const successCartItems = [...cartItems];
      const successPaymentMethod = paymentMethod;

      try { localStorage.removeItem(CART_KEY); } catch { /* ignore */ }

      setCartItems([]);
      setPaymentMethod("Efectivo");
      setCashReceived("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      setApplyResult(null);
      setManualCodes([]);
      setExcludedPromotionIds(new Set());
      setPromoCodeInput("");
      setPromoCodeOpen(false);
      setPromoCodeError(null);
      setOptionalCustomerOpen(false);
      setProductsRefreshKey((k) => k + 1);
      setShowPrintModal({
        saleId: successSaleId,
        total: successTotal,
        cartItems: successCartItems,
        paymentMethod: successPaymentMethod,
      });
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
        <div className="flex h-[calc(100vh-49px)] divide-x divide-slate-200">
          {/* ── LEFT PANEL ── */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">

            {/* Cash register closed banner */}
            {cashRegisterStatus === "closed" ? (
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-3">
                <p className="text-sm font-medium text-amber-800">
                  Debes abrir la caja antes de realizar ventas.
                </p>
                <Link
                  className="flex-shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                  href="/cash-movements"
                >
                  Abrir caja →
                </Link>
              </div>
            ) : null}

            {/* 1. Page header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
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
                  onClick={handleSuspend}
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
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setBarcodeNotFound(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (filteredProducts.length === 1 && cashRegisterStatus === "open") {
                        addToCart(filteredProducts[0]);
                        setSearchQuery("");
                        setBarcodeNotFound(false);
                      } else if (filteredProducts.length === 0 && searchQuery.trim()) {
                        setBarcodeNotFound(true);
                        setTimeout(() => setBarcodeNotFound(false), 2000);
                      }
                    }}
                    placeholder="Buscar o escanear código..."
                    type="text"
                    value={searchQuery}
                  />
                  {searchQuery ? (
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => { setSearchQuery(""); setBarcodeNotFound(false); }}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <Barcode size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  )}
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
            <div className="px-4 py-3 sm:px-5">
              {/* Success banner */}
              {successMessage ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
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

              {/* Barcode not found flash */}
              {barcodeNotFound ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                  <Barcode size={14} className="flex-shrink-0 text-amber-500" />
                  <p className="text-sm font-medium text-amber-800">Producto no encontrado</p>
                </div>
              ) : null}

              {productsLoading ? <ProductsLoadingState /> : null}

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
                  <div className="space-y-1">
                    {paginatedProducts.map((product) => {
                      const cartItem = cartItems.find((item) => item.productId === product.id);
                      const inCartQty = cartItem?.quantity ?? 0;
                      const isOutOfStock = product.stock === 0;
                      const canAdd = !isOutOfStock && cashRegisterStatus === "open";

                      return (
                        <div
                          key={product.id}
                          className={
                            isOutOfStock
                              ? "flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 opacity-50"
                              : inCartQty > 0
                                ? "flex items-center gap-2.5 rounded-lg border-2 border-violet-400 bg-violet-50 px-3 py-2"
                                : "flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300"
                          }
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-100">
                            <Package size={13} className="text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-950">{product.name}</p>
                            <p className="text-[10px] text-slate-400">{product.categoryName}</p>
                          </div>
                          <ProductStockBadge stock={product.stock} />
                          <p className="flex-shrink-0 tabular-nums text-sm font-bold text-emerald-700">
                            {formatMoney(product.salePrice)}
                          </p>
                          {inCartQty > 0 ? (
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                              {inCartQty}
                            </span>
                          ) : null}
                          <button
                            className="flex-shrink-0 rounded-md bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!canAdd}
                            onClick={() => addToCart(product)}
                            type="button"
                          >
                            Agregar
                          </button>
                        </div>
                      );
                    })}
                  </div>

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
                <QuickActionButton
                  Icon={Users}
                  label="Buscar cliente"
                  onClick={() => setPaymentMethod("Fiado")}
                />
                <QuickActionButton
                  Icon={FileText}
                  indicator={!!noteText}
                  label="Nota / Observación"
                  onClick={() => setNoteModalOpen(true)}
                />
                <QuickActionButton
                  Icon={FileText}
                  label="Cotización"
                  onClick={() => setCotizacionOpen(true)}
                />
                <QuickActionButton
                  Icon={PauseCircle}
                  label="Suspender"
                  onClick={handleSuspend}
                />
                <QuickActionButton
                  danger
                  Icon={Trash2}
                  label="Limpiar venta"
                  onClick={handleLimpiarVenta}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex h-full w-80 flex-shrink-0 flex-col bg-white lg:w-96">

            {/* Draft recovery banner */}
            {showDraftBanner ? (
              <div className="flex-shrink-0 border-b border-amber-100 bg-amber-50 px-5 py-3">
                <p className="mb-2 text-xs font-semibold text-amber-800">
                  Tienes una venta suspendida
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                    onClick={handleRecoverDraft}
                    type="button"
                  >
                    Recuperar
                  </button>
                  <button
                    className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                    onClick={handleDiscardDraft}
                    type="button"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ) : null}

            {/* Cart header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">
                Venta actual
                {cartItemCount > 0 ? (
                  <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {cartItemCount}
                  </span>
                ) : null}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  className="flex items-center gap-1 rounded-lg border border-violet-300 px-2 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50"
                  onClick={() => {
                    setPromoPanelSearch("");
                    setPromosPanelOpen(true);
                  }}
                  type="button"
                >
                  <Tag size={12} />
                  Promociones
                </button>
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
                <div className="flex flex-shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-1.5">
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
                <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                  {cartItems.map((item) => {
                    const discountedItem = discountedItemsMap.get(item.productId);
                    const isDiscounted =
                      discountedItem !== undefined &&
                      parseFloat(discountedItem.discountAmount) > 0 &&
                      !excludedPromotionIds.has(discountedItem.promotionId ?? "");
                    const displayPrice = isDiscounted
                      ? parseFloat(discountedItem.finalPrice)
                      : item.unitPrice;
                    const promoName = isDiscounted
                      ? (displayedAppliedPromotions.find(
                          (p) => p.promotionId === discountedItem?.promotionId
                        )?.name ?? displayedAppliedPromotions[0]?.name)
                      : undefined;

                    return (
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
                        {promoName ? (
                          <p className="truncate text-[9px] font-medium text-violet-600">
                            {promoName}
                          </p>
                        ) : null}
                      </div>
                      <div className="w-12 text-right text-xs tabular-nums">
                        {isDiscounted ? (
                          <>
                            <span className="block text-[10px] text-slate-400 line-through">
                              {formatMoneyNum(item.unitPrice)}
                            </span>
                            <span className="block font-semibold text-emerald-600">
                              {formatMoneyNum(displayPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500">
                            {formatMoneyNum(item.unitPrice)}
                          </span>
                        )}
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
                        {formatMoneyNum(displayPrice * item.quantity)}
                      </div>
                      <button
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-slate-300 hover:text-rose-500"
                        onClick={() => removeFromCart(item.productId)}
                        type="button"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    );
                  })}

                  {/* Agregar descuento row */}
                  <div className="flex flex-col gap-1 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50">
                        <Tag size={13} className="text-violet-500" />
                      </div>
                      {promoCodeOpen ? (
                        <>
                          <input
                            autoFocus
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            onChange={(e) => {
                              setPromoCodeInput(e.target.value);
                              setPromoCodeError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void handleApplyPromoCode();
                            }}
                            placeholder="Código de promoción"
                            type="text"
                            value={promoCodeInput}
                          />
                          <button
                            className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                            onClick={() => void handleApplyPromoCode()}
                            type="button"
                          >
                            Aplicar
                          </button>
                          <button
                            className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                            onClick={() => {
                              setPromoCodeOpen(false);
                              setPromoCodeInput("");
                              setPromoCodeError(null);
                            }}
                            type="button"
                          >
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-xs font-medium text-violet-600 hover:text-violet-700"
                          onClick={() => setPromoCodeOpen(true)}
                          type="button"
                        >
                          Agregar descuento
                        </button>
                      )}
                    </div>
                    {promoCodeError ? (
                      <p className="pl-10 text-xs font-medium text-rose-600">
                        {promoCodeError}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Applied promotions panel */}
                {displayedAppliedPromotions.length > 0 ? (
                  <div className="flex-shrink-0 border-t border-violet-100 bg-violet-50/60 px-4 py-2.5">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                      Promociones aplicadas
                    </p>
                    <div className="space-y-1">
                      {displayedAppliedPromotions.map((promo) => (
                        <div key={promo.promotionId} className="flex items-center gap-2">
                          <Tag size={11} className="flex-shrink-0 text-violet-500" />
                          <span className="min-w-0 flex-1 truncate text-xs text-violet-700">
                            {promo.name}
                          </span>
                          <span className="tabular-nums text-xs font-semibold text-emerald-600">
                            -{formatMoneyNum(parseFloat(promo.discountAmount))}
                          </span>
                          <button
                            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-violet-400 hover:bg-violet-200 hover:text-violet-600"
                            onClick={() =>
                              setExcludedPromotionIds((prev) => new Set([...prev, promo.promotionId]))
                            }
                            type="button"
                          >
                            <X size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {/* Payment form */}
            <form
              className="flex-shrink-0 space-y-3 border-t border-slate-200 px-5 py-4"
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
                    -{formatMoneyNum(totalDiscount)}
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
                      {formatMoneyNum(cartTotal - totalDiscount)}
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
                        setSelectedCustomer(null);
                        setCustomerSearch("");
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
                          cashReceivedNum >= cartTotal - totalDiscount
                            ? "tabular-nums text-sm font-semibold text-emerald-600"
                            : "tabular-nums text-sm font-semibold text-rose-600"
                        }
                      >
                        {cashReceivedNum >= cartTotal - totalDiscount
                          ? formatMoneyNum(cashReceivedNum - (cartTotal - totalDiscount))
                          : `-${formatMoneyNum((cartTotal - totalDiscount) - cashReceivedNum)}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Optional customer selector — non-Fiado */}
              {!isFiado ? (
                <div className="border-t border-slate-100 pt-2">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                      <span className="text-xs text-slate-600">{selectedCustomer.name}</span>
                      <button
                        className="text-slate-400 hover:text-slate-600"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                          setOptionalCustomerOpen(false);
                        }}
                        type="button"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : optionalCustomerOpen ? (
                    <div className="relative">
                      {customersLoading ? (
                        <p className="text-xs text-slate-400">Cargando clientes...</p>
                      ) : (
                        <>
                          <input
                            autoFocus
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 pr-8 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            onBlur={() => setTimeout(() => setCustomerSearchOpen(false), 150)}
                            onChange={(e) => { setCustomerSearch(e.target.value); setCustomerSearchOpen(true); }}
                            onFocus={() => setCustomerSearchOpen(true)}
                            placeholder="Buscar cliente..."
                            type="text"
                            value={customerSearch}
                          />
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            onClick={() => { setOptionalCustomerOpen(false); setCustomerSearch(""); }}
                            type="button"
                          >
                            <X size={12} />
                          </button>
                          {customerSearchOpen ? (
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {filteredCustomers.length === 0 ? (
                                <p className="px-3 py-2.5 text-xs text-slate-500">No hay clientes. Crea uno primero.</p>
                              ) : (
                                filteredCustomers.map((customer) => (
                                  <button
                                    className="flex w-full items-center px-3 py-2.5 text-left text-sm text-slate-950 hover:bg-violet-50"
                                    key={customer.id}
                                    onClick={() => {
                                      setSelectedCustomer(customer);
                                      setCustomerSearch("");
                                      setCustomerSearchOpen(false);
                                      setOptionalCustomerOpen(false);
                                    }}
                                    type="button"
                                  >
                                    {customer.name}
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => setOptionalCustomerOpen(true)}
                        type="button"
                      >
                        <UserPlus size={12} />
                        Seleccionar cliente (opcional)
                      </button>
                      <Link
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                        href="/customers/new"
                        target="_blank"
                      >
                        <Users size={12} />
                        Nuevo cliente →
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Customer search — Fiado only */}
              {isFiado ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cliente
                  </label>
                  {customersLoading ? (
                    <p className="text-sm text-slate-500">Cargando clientes...</p>
                  ) : selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="text-sm font-medium text-slate-950">
                        {selectedCustomer.name}
                      </span>
                      <button
                        className="text-slate-400 hover:text-slate-600"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                        }}
                        type="button"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                        onBlur={() =>
                          setTimeout(() => setCustomerSearchOpen(false), 150)
                        }
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setCustomerSearchOpen(true);
                        }}
                        onFocus={() => setCustomerSearchOpen(true)}
                        placeholder="Buscar cliente..."
                        type="text"
                        value={customerSearch}
                      />
                      {customerSearchOpen ? (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {filteredCustomers.length === 0 ? (
                            <p className="px-3 py-2.5 text-xs text-slate-500">
                              No hay clientes. Crea uno primero.
                            </p>
                          ) : (
                            filteredCustomers.map((customer) => (
                              <button
                                className="flex w-full items-center px-3 py-2.5 text-left text-sm text-slate-950 hover:bg-violet-50"
                                key={customer.id}
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setCustomerSearch("");
                                  setCustomerSearchOpen(false);
                                }}
                                type="button"
                              >
                                {customer.name}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
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
                    isSubmitting || cartItems.length === 0 || cashRegisterStatus !== "open"
                      ? "flex flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-400"
                      : isFiado
                        ? "flex flex-1 items-center justify-center rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 active:scale-[0.98]"
                        : "flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.98]"
                  }
                  disabled={isSubmitting || cartItems.length === 0 || cashRegisterStatus !== "open"}
                  type="submit"
                >
                  {isSubmitting
                    ? "Procesando..."
                    : cartItems.length > 0
                      ? `Cobrar ${formatMoneyNum(cartTotal - totalDiscount)}`
                      : "Cobrar"}
                </button>
                <button
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  onClick={() => setCotizacionOpen(true)}
                  title="Imprimir"
                  type="button"
                >
                  <Printer size={15} />
                </button>
                <div className="relative" ref={moreDropdownRef}>
                  <button
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                    onClick={() => setMoreDropdownOpen((v) => !v)}
                    title="Más opciones"
                    type="button"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {moreDropdownOpen ? (
                    <div className="absolute bottom-full right-0 mb-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          handleSuspend();
                          setMoreDropdownOpen(false);
                        }}
                        type="button"
                      >
                        <PauseCircle size={14} className="text-slate-400" />
                        Guardar como borrador
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setCotizacionOpen(true);
                          setMoreDropdownOpen(false);
                        }}
                        type="button"
                      >
                        <Printer size={14} className="text-slate-400" />
                        Imprimir presupuesto
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nota / Observación modal */}
      {noteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setNoteModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Nota de la venta
              </h3>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setNoteModalOpen(false)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-5 py-4">
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribe una nota u observación para esta venta..."
                rows={4}
                value={noteText}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setNoteModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                onClick={() => setNoteModalOpen(false)}
                type="button"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cotización modal */}
      {cotizacionOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setCotizacionOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Cotización
              </h3>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setCotizacionOpen(false)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-4">
              {cartItems.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay productos en la venta.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-2 text-left text-xs font-semibold uppercase text-slate-500">
                        Producto
                      </th>
                      <th className="pb-2 text-center text-xs font-semibold uppercase text-slate-500">
                        Cant.
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase text-slate-500">
                        Precio
                      </th>
                      <th className="pb-2 text-right text-xs font-semibold uppercase text-slate-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item) => (
                      <tr key={item.productId}>
                        <td className="py-2 text-sm text-slate-950">
                          {item.productName}
                        </td>
                        <td className="py-2 text-center text-sm text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right tabular-nums text-sm text-slate-700">
                          {formatMoneyNum(item.unitPrice)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-sm font-semibold text-slate-950">
                          {formatMoneyNum(item.unitPrice * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td
                        className="pt-3 text-sm font-bold text-slate-950"
                        colSpan={3}
                      >
                        Total
                      </td>
                      <td className="pt-3 text-right tabular-nums text-sm font-bold text-slate-950">
                        {formatMoneyNum(cartTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setCotizacionOpen(false)}
                type="button"
              >
                Cerrar
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => window.print()}
                type="button"
              >
                <Printer size={14} />
                Imprimir cotización
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Promotions panel */}
      {promosPanelOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          onClick={() => setPromosPanelOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Promociones disponibles
              </h3>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setPromosPanelOpen(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 border-b border-slate-100 px-4 py-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100"
                  onChange={(e) => setPromoPanelSearch(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  type="text"
                  value={promoPanelSearch}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {activePromosLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                      key={i}
                    />
                  ))}
                </div>
              ) : null}

              {!activePromosLoading &&
              activePromos.filter((p) => {
                const q = promoPanelSearch.trim().toLowerCase();
                return (
                  !q ||
                  p.name.toLowerCase().includes(q) ||
                  (p.code?.toLowerCase().includes(q) ?? false)
                );
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Tag size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    No hay promociones activas
                  </p>
                </div>
              ) : null}

              {!activePromosLoading ? (
                <div className="space-y-2">
                  {activePromos
                    .filter((p) => {
                      const q = promoPanelSearch.trim().toLowerCase();
                      return (
                        !q ||
                        p.name.toLowerCase().includes(q) ||
                        (p.code?.toLowerCase().includes(q) ?? false)
                      );
                    })
                    .map((promo) => (
                      <div
                        key={promo.id}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {promo.name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                                {PROMO_TYPE_LABEL[promo.type] ?? promo.type}
                              </span>
                              <span className="text-xs font-semibold text-emerald-700">
                                {formatPromoDiscount(promo)}
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatPromoApplication(promo)} · Vence{" "}
                              {new Date(promo.endsAt).toLocaleDateString(
                                "es-419",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                            </p>
                            {(promo.activationType === "MANUAL_CODE" ||
                              promo.activationType === "BOTH") &&
                            promo.code ? (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                  {promo.code}
                                </span>
                                <button
                                  className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-violet-600"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(promo.code!);
                                    setCopiedCode(promo.code!);
                                    setTimeout(() => setCopiedCode(null), 2000);
                                  }}
                                  type="button"
                                >
                                  <Copy size={11} />
                                  {copiedCode === promo.code
                                    ? "¡Copiado!"
                                    : "Copiar código"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                          {promo.activationType === "AUTOMATIC" ? (
                            <span className="flex-shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              ✓ Se aplica automáticamente
                            </span>
                          ) : promo.activationType === "BOTH" ? (
                            <button
                              className="flex-shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                              onClick={() => handleApplyActivePromotion(promo)}
                              type="button"
                            >
                              Aplicar código
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-slate-200 px-5 py-3">
              <Link
                className="text-sm font-medium text-violet-600 hover:text-violet-700"
                href="/promotions"
                onClick={() => setPromosPanelOpen(false)}
              >
                Gestionar promociones →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Print modal */}
      {showPrintModal ? (
        <PrintModal
          cartItems={showPrintModal.cartItems}
          paymentMethod={showPrintModal.paymentMethod}
          saleId={showPrintModal.saleId}
          total={showPrintModal.total}
          onClose={() => setShowPrintModal(null)}
        />
      ) : null}
    </>
  );
}

type QuickActionButtonProps = {
  Icon: LucideIcon;
  label: string;
  danger?: boolean;
  indicator?: boolean;
  onClick?: () => void;
};

function QuickActionButton({
  Icon,
  label,
  danger = false,
  indicator = false,
  onClick,
}: QuickActionButtonProps) {
  return (
    <button
      className={
        danger
          ? "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50"
          : "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }
      onClick={onClick}
      type="button"
    >
      <span className="relative">
        <Icon size={13} />
        {indicator ? (
          <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-violet-500" />
        ) : null}
      </span>
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

function ProductsLoadingState() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          className="h-11 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
          key={index}
        />
      ))}
    </div>
  );
}

function PrintModal({
  saleId,
  total,
  cartItems,
  paymentMethod,
  onClose,
}: {
  saleId: string;
  total: number;
  cartItems: CartItem[];
  paymentMethod: PaymentMethod;
  onClose: () => void;
}) {
  const [emailSent, setEmailSent] = useState(false);
  const saleNumber = saleId.slice(-6).toUpperCase();
  const saleDate = new Intl.DateTimeFormat("es-419", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date());

  function openPrintWindow(html: string) {
    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  function handlePrintTicket() {
    const rows = cartItems
      .map((item) => `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatARS(item.unitPrice * item.quantity)}</td></tr>`)
      .join("");
    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:monospace;width:72mm;margin:0 auto;padding:4mm;font-size:11px}
      h2{text-align:center;font-size:13px;margin:0 0 4px}
      p{margin:2px 0}table{width:100%;border-collapse:collapse;margin:6px 0}
      td{padding:2px 0}.center{text-align:center}
      .total{font-weight:bold;font-size:13px;border-top:1px dashed #000;padding-top:4px;margin-top:4px}
    </style></head><body>
      <h2>Tienda Demo</h2>
      <p class="center">Venta #${saleNumber}</p>
      <p class="center">${saleDate}</p>
      <p class="center">Pago: ${paymentMethod}</p>
      <hr style="border-style:dashed"/>
      <table><thead><tr><th style="text-align:left">Producto</th><th>Cant.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <hr style="border-style:dashed"/>
      <p class="total center">Total: ${formatARS(total)}</p>
      <p class="center" style="margin-top:8px;font-size:10px">¡Gracias por su compra!</p>
    </body></html>`);
  }

  function handlePrintInvoice() {
    const rows = cartItems
      .map((item) => `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatARS(item.unitPrice)}</td><td style="text-align:right">${formatARS(item.unitPrice * item.quantity)}</td></tr>`)
      .join("");
    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:24px;font-size:13px;color:#1e293b}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .business{font-size:20px;font-weight:bold;color:#0f172a}
      .meta{color:#64748b;font-size:12px;text-align:right}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
      td{padding:10px 12px;border-bottom:1px solid #f1f5f9}
      .total-row td{font-weight:bold;font-size:15px;border-top:2px solid #e2e8f0;border-bottom:none}
      .footer{margin-top:24px;text-align:center;color:#94a3b8;font-size:11px}
    </style></head><body>
      <div class="header">
        <div class="business">Tienda Demo</div>
        <div class="meta"><p><strong>Factura #${saleNumber}</strong></p><p>${saleDate}</p><p>Método de pago: ${paymentMethod}</p></div>
      </div>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Precio unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="total-row"><td colspan="3">Total</td><td style="text-align:right">${formatARS(total)}</td></tr></tfoot></table>
      <div class="footer">Tienda Demo · ¡Gracias por su compra!</div>
    </body></html>`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
          <p className="text-sm font-semibold text-emerald-800">✓ Venta registrada</p>
          <p className="mt-0.5 text-xs text-emerald-600">
            #{saleNumber} · {formatARS(total)}
          </p>
        </div>
        <div className="space-y-2 px-6 py-4">
          <button
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={handlePrintTicket}
            type="button"
          >
            <Printer size={16} className="flex-shrink-0 text-slate-400" />
            Imprimir ticket
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={handlePrintInvoice}
            type="button"
          >
            <FileText size={16} className="flex-shrink-0 text-slate-400" />
            Imprimir factura
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setEmailSent(true)}
            type="button"
          >
            <MoreHorizontal size={16} className="flex-shrink-0 text-slate-400" />
            {emailSent ? "Próximamente disponible" : "Enviar por email"}
          </button>
        </div>
        <div className="border-t border-slate-200 px-6 py-3">
          <button
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: string) {
  return formatARS(Number(value));
}

function formatMoneyNum(value: number) {
  return formatARS(value);
}
