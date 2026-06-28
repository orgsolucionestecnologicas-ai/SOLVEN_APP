"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Barcode,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
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
  X,
  Receipt,
} from "lucide-react";
import { formatARS } from "@/lib/format-currency";
import QRCode from "qrcode";
import Link from "next/link";
import { SalesList } from "./sales-list";
import { SaleGateModal, type SaleGateResult } from "./sale-gate-modal";

// ── Tipos de pago ──────────────────────────────────────────────────────────
type PaymentMethodKey =
  | "Efectivo"
  | "Tarjeta"
  | "Transferencia"
  | "VentaWeb"
  | "Otro"
  | "Fiado";

type PaymentSplit = {
  id: string;            // cuid local para key de React
  method: PaymentMethodKey;
  amount: string;       // string controlado para el <input>
  reference?: string;   // N° de operación (Tarjeta / Transferencia)
};

function localId() {
  return Math.random().toString(36).slice(2, 10);
}

const PAYMENT_METHOD_CONFIG: { method: PaymentMethodKey; label: string }[] = [
  { method: "Efectivo",      label: "Efectivo"       },
  { method: "Tarjeta",       label: "Tarjeta"        },
  { method: "Transferencia", label: "Transferencia"  },
  { method: "VentaWeb",      label: "Venta web"      },
  { method: "Otro",          label: "Otro"           },
  { method: "Fiado",         label: "Fiado (crédito)" },
];

type ProductRecord = {
  id: string;
  name: string;
  productCode: string | null;
  categoryName: string;
  salePrice: string;
  stock: number;
  ivaRate: number;
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

type ServiceRecord = {
  id: string;
  code: string;
  name: string;
  price: string;
  isActive: boolean;
};

type ServicesResponse = {
  data?: ServiceRecord[];
  error?: { message: string };
};

type CartItem = {
  productId?: string;
  serviceId?: string;
  productName: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
  ivaRate: number;
};

function cartItemKey(item: CartItem): string {
  return item.productId ?? item.serviceId ?? "";
}

type CreateSaleResponse = {
  data?: {
    id: string;
    folio: number;
    receiptType: "TICKET" | "INVOICE";
    receiptNumber: number;
    sellerCode: string | null;
  };
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

type ActiveTab = "Venta actual" | "Historial";

const DRAFT_KEY = "solven_draft";
const CART_KEY = "solven_pos_cart";

const PRODUCTS_PER_PAGE = 10;

const TABS: ActiveTab[] = ["Venta actual", "Historial"];

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

type InvoiceResult = {
  id: string;
  cae: string;
  caeFchVto: string;
  voucherNumber: number;
  voucherType: number;
  puntoVenta: number;
  docTipo: number;
  docNro: string;
  cuit: string;
};

export function Pos() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Venta actual");

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);

  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([]);
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
    folio: number;
    total: number;
    cartItems: CartItem[];
    paymentMethod: string;
    receiptType: "TICKET" | "INVOICE";
    receiptNumber: number;
    sellerCode: string;
    invoice?: InvoiceResult | null;
  } | null>(null);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [optionalCustomerOpen, setOptionalCustomerOpen] = useState(false);
  const [saleGateOpen, setSaleGateOpen] = useState(false);
  const [saleGateResult, setSaleGateResult] = useState<SaleGateResult | null>(null);
  const [arcaEnabled, setArcaEnabled] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

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
      setPaymentSplits([{ id: localId(), method: "Fiado", amount: "" }]);
    }
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { headers: { Accept: "application/json" } });
        const body = await res.json();
        if (res.ok && body.data?.arcaEnabled) setArcaEnabled(true);
      } catch { /* default false */ }
    }
    void loadSettings();
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

  useEffect(() => {
    let isActive = true;
    async function loadServices() {
      try {
        const response = await fetch("/api/services", { headers: { Accept: "application/json" } });
        const body = (await response.json()) as ServicesResponse;
        if (isActive && response.ok && body.data) {
          setServices(body.data.filter((s) => s.isActive));
        }
      } catch {
        if (isActive) setServicesError(true);
      } finally {
        if (isActive) setServicesLoading(false);
      }
    }
    void loadServices();
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!urlCustomerIdRef.current || !customersLoaded) return;
    const target = customers.find((c) => c.id === urlCustomerIdRef.current);
    if (target) {
      setSelectedCustomer(target);
      urlCustomerIdRef.current = null;
    }
  }, [customers, customersLoaded]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(products.map((p) => p.categoryName).filter(Boolean))
    ).sort();
    return ["Todos", ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.productCode?.toLowerCase().includes(q) ?? false)
    );
    if (activeCategory !== "Todos") {
      result = result.filter((p) => p.categoryName === activeCategory);
    }
    return result;
  }, [products, searchQuery, activeCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || cashRegisterStatus !== "open") return;
    const exact = products.find((p) => p.productCode && p.productCode.toLowerCase() === q.toLowerCase());
    if (exact) {
      addToCart(exact);
      setSearchQuery("");
      setBarcodeNotFound(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const filteredCustomers = customerSearch.trim().length >= 2
    ? customers
        .filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
        .slice(0, 5)
    : [];

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
              cartItems: cartItems
                .filter((item) => item.productId)
                .map((item) => ({
                  productId: item.productId!,
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
  const selectedCustomerId = selectedCustomer?.id ?? "";

  const cartNet = cartTotal - totalDiscount;
  const totalAssigned = paymentSplits.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0
  );
  const remaining = cartNet - totalAssigned;

  const hasFiado  = paymentSplits.some(s => s.method === "Fiado");
  const onlyFiado = paymentSplits.length === 1 && paymentSplits[0].method === "Fiado";
  const hasCash   = paymentSplits.some(s => s.method !== "Fiado");
  const isMixto   = hasFiado && hasCash; // paymentType MIXED — cliente obligatorio

  useEffect(() => {
    if ((!hasFiado && !optionalCustomerOpen) || customersLoaded) return;

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
  }, [hasFiado, optionalCustomerOpen, customersLoaded]);

  useEffect(() => {
    if (!showPaymentModal) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPaymentModal(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPaymentModal]);

  function clearSale() {
    setCartItems([]);
    setPaymentSplits([]);
    setShowPaymentModal(false);
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
    setSaleGateResult(null);
    try { localStorage.removeItem(CART_KEY); } catch { /* ignore */ }
  }

  function handleNewSale() {
    const draft = readDraft();
    if (draft) {
      setShowDraftBanner(true);
      return;
    }
    clearSale();
    setSaleGateResult(null);
    setSaleGateOpen(true);
  }

  function handleSaleGateConfirm(result: SaleGateResult) {
    setSaleGateResult(result);
    setSaleGateOpen(false);
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
          cartItems: cartItems
            .filter((item) => item.productId)
            .map((item) => ({
              productId: item.productId!,
              productName: item.productName,
              categoryName: item.categoryName,
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
          ivaRate: product.ivaRate != null ? Number(product.ivaRate) : 0.21,
        },
      ];
    });
  }

  function addServiceToCart(service: ServiceRecord) {
    setSubmitError(null);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.serviceId === service.id);
      if (existing) {
        return prev.map((item) =>
          item.serviceId === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          productName: service.name,
          categoryName: "Servicio",
          quantity: 1,
          unitPrice: Number(service.price),
          maxStock: 9999,
          ivaRate: 0.21,
        },
      ];
    });
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) {
      setCartItems((prev) => prev.filter((item) => cartItemKey(item) !== itemId));
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        cartItemKey(item) === itemId
          ? { ...item, quantity: Math.min(quantity, item.maxStock) }
          : item
      )
    );
  }

  function removeFromCart(itemId: string) {
    setCartItems((prev) => prev.filter((item) => cartItemKey(item) !== itemId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSale();
  }

  async function submitSale() {
    if (cartItems.length === 0) {
      setSubmitError("El carrito está vacío. Agregá al menos un producto.");
      return;
    }

    if (paymentSplits.length === 0) {
      setSubmitError("Seleccioná al menos un método de pago.");
      return;
    }

    if (hasFiado && !selectedCustomerId) {
      setSubmitError("Seleccioná un cliente para la venta con crédito (Fiado).");
      return;
    }
    if (!onlyFiado && Math.abs(remaining) > 0.01) {
      setSubmitError(
        `El monto asignado (${formatMoneyNum(totalAssigned)}) no coincide con el total (${formatMoneyNum(cartNet)}). Diferencia: ${formatMoneyNum(Math.abs(remaining))}`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const apiPaymentType = onlyFiado ? "CREDIT" : isMixto ? "MIXED" : "CASH";

    const fiadoSplit    = paymentSplits.find(s => s.method === "Fiado");
    const fiadoAmount   = fiadoSplit ? (parseFloat(fiadoSplit.amount) || 0) : 0;
    const cashPartForApi = isMixto
      ? Math.max(cartNet - fiadoAmount, 0)
      : undefined;

    const paymentDetailsPayload = paymentSplits.map(s => ({
      method:  s.method,
      amount:  parseFloat(s.amount) || (onlyFiado ? cartNet : 0),
      ...(s.reference?.trim() ? { reference: s.reference.trim() } : {}),
    }));

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: apiPaymentType,
          sellerCode: saleGateResult?.sellerCode ?? "",
          sellerId: saleGateResult?.sellerId ?? "",
          receiptType: saleGateResult?.receiptType ?? "TICKET",
          ...(hasFiado ? { customerId: selectedCustomerId } : {}),
          ...(isMixto && cashPartForApi !== undefined ? { cashAmount: cashPartForApi } : {}),
          paymentDetails: paymentDetailsPayload,
          items: cartItems.map((item) =>
            item.serviceId
              ? { serviceId: item.serviceId, quantity: item.quantity }
              : { productId: item.productId, quantity: item.quantity }
          ),
          ...(displayedAppliedPromotions.length > 0
            ? {
                promotionIds: displayedAppliedPromotions.map((p) => p.promotionId),
                discountAmount: totalDiscount,
              }
            : {}),
          ...(noteText.trim() ? { note: noteText.trim() } : {}),
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
      const successFolio = body.data.folio;
      const successTotal = cartTotal - totalDiscount;
      const successCartItems = [...cartItems];
      const successPaymentMethod = onlyFiado
        ? "Fiado"
        : paymentSplits.map(s => s.method).join(" + ");

      try { localStorage.removeItem(CART_KEY); } catch { /* ignore */ }

      setCartItems([]);
      setPaymentSplits([]);
      setShowPaymentModal(false);
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
        folio: successFolio,
        total: successTotal,
        cartItems: successCartItems,
        paymentMethod: successPaymentMethod,
        receiptType: body.data.receiptType,
        receiptNumber: body.data.receiptNumber,
        sellerCode: body.data.sellerCode ?? "",
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
                  className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
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
                {categories.map((cat) => (
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
                      const canAdd = !isOutOfStock && cashRegisterStatus === "open" && saleGateResult !== null;

                      return (
                        <div
                          key={product.id}
                          className={
                            isOutOfStock
                              ? "flex items-center gap-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1 opacity-50"
                              : inCartQty > 0
                                ? "flex items-center gap-2.5 rounded-lg border-2 border-violet-400 bg-violet-50 px-3 py-1"
                                : "flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1 hover:border-slate-300"
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

              {/* Services section */}
              {servicesError ? (
                <p className="text-sm text-red-400 p-3">No se pudieron cargar los servicios.</p>
              ) : null}
              {!servicesLoading && !servicesError && services.length > 0 ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Servicios disponibles
                  </p>
                  <div className="space-y-1">
                    {services.map((service) => {
                      const inCartQty = cartItems.find((item) => item.serviceId === service.id)?.quantity ?? 0;
                      return (
                        <div
                          key={service.id}
                          className={
                            inCartQty > 0
                              ? "flex items-center gap-2.5 rounded-lg border-2 border-violet-400 bg-violet-50 px-3 py-1"
                              : "flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1 hover:border-slate-300"
                          }
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-violet-50">
                            <Tag size={13} className="text-violet-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-950">{service.name}</p>
                            <p className="text-[10px] text-slate-400">{service.code}</p>
                          </div>
                          <p className="flex-shrink-0 tabular-nums text-sm font-bold text-emerald-700">
                            {formatMoneyNum(Number(service.price))}
                          </p>
                          {inCartQty > 0 ? (
                            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                              {inCartQty}
                            </span>
                          ) : null}
                          <button
                            className="flex-shrink-0 rounded-md bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={cashRegisterStatus !== "open" || saleGateResult === null}
                            onClick={() => addServiceToCart(service)}
                            type="button"
                          >
                            Agregar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* 4. Quick actions bar */}
              <div className="mt-5 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-4">
                <QuickActionButton
                  Icon={Users}
                  label="Buscar cliente"
                  onClick={() => {
                    setOptionalCustomerOpen(true);
                    setShowPaymentModal(true);
                  }}
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
          <div className="flex h-full w-96 flex-shrink-0 flex-col bg-white lg:w-[480px]">

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
              <h2 className="flex items-center text-sm font-semibold text-slate-950">
                Venta actual
                {cartItemCount > 0 ? (
                  <span className="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {cartItemCount}
                  </span>
                ) : null}
                {saleGateResult ? (
                  <span className="ml-2 flex items-center gap-2">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                      {saleGateResult.sellerCode}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {saleGateResult.receiptType === "INVOICE" ? "Factura" : "Ticket"}
                    </span>
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
            {!saleGateResult && cartItems.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-slate-400">
                <p className="text-sm font-medium">
                  Hacé clic en <strong>Nueva venta</strong> para comenzar
                </p>
                <p className="mt-1 text-xs">
                  Debés seleccionar el vendedor y tipo de comprobante primero.
                </p>
              </div>
            ) : cartItems.length === 0 ? (
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
                    const discountedItem = item.productId ? discountedItemsMap.get(item.productId) : undefined;
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
                      key={cartItemKey(item)}
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
                            updateQuantity(cartItemKey(item), item.quantity - 1)
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
                            updateQuantity(cartItemKey(item), item.quantity + 1)
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
                        onClick={() => removeFromCart(cartItemKey(item))}
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

              {/* Cobrar button row */}
              <div className="flex gap-2">
                <button
                  className={
                    cartItems.length === 0 || cashRegisterStatus !== "open" || saleGateResult === null
                      ? "flex flex-1 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-400"
                      : "flex flex-1 items-center justify-center rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.98]"
                  }
                  disabled={cartItems.length === 0 || cashRegisterStatus !== "open" || saleGateResult === null}
                  onClick={() => {
                    setSubmitError(null);
                    setPaymentSplits([{ id: localId(), method: "Efectivo", amount: cartNet.toFixed(2) }]);
                    setCashReceived("");
                    setShowPaymentModal(true);
                  }}
                  type="button"
                >
                  {cartItems.length > 0
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
                      <tr key={cartItemKey(item)}>
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
          receiptType={showPrintModal.receiptType}
          receiptNumber={showPrintModal.receiptNumber}
          sellerCode={showPrintModal.sellerCode}
          arcaEnabled={arcaEnabled}
          invoice={showPrintModal.invoice ?? null}
          onEmitInvoice={() => setShowInvoiceModal(true)}
          onClose={() => setShowPrintModal(null)}
        />
      ) : null}

      {showInvoiceModal && showPrintModal ? (
        <InvoiceModal
          saleId={showPrintModal.saleId}
          total={showPrintModal.total}
          items={showPrintModal.cartItems}
          onSuccess={(result) => {
            setShowPrintModal((prev) => (prev ? { ...prev, invoice: result } : null));
            setShowInvoiceModal(false);
          }}
          onClose={() => setShowInvoiceModal(false)}
        />
      ) : null}

      <SaleGateModal
        open={saleGateOpen}
        arcaEnabled={arcaEnabled}
        onConfirm={handleSaleGateConfirm}
        onCancel={() => setSaleGateOpen(false)}
      />

      {/* ══════════════════════════════════════════════
          MODAL DE COBRO
      ══════════════════════════════════════════════ */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}
        >
          <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
               style={{ maxHeight: "92dvh" }}>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Cobrar</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Agregá los métodos y montos de pago
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-slate-950">
                    {formatMoneyNum(cartNet)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar"
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => setShowPaymentModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* ── Body scrollable ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── Filas de pago ── */}
              <div className="space-y-3">
                {paymentSplits.map((split, splitIndex) => {
                  const showReference  = split.method === "Tarjeta" || split.method === "Transferencia";
                  const showCashHelper = split.method === "Efectivo";
                  const parsedAmount   = parseFloat(split.amount) || 0;
                  const cashNum        = parseFloat(cashReceived) || 0;

                  return (
                    <div key={split.id} className="space-y-2">
                      {/* Fila principal: monto + select + quitar */}
                      <div className="flex items-center gap-2">
                        {/* Monto */}
                        <div className="relative w-40 flex-shrink-0">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                            $
                          </span>
                          <input
                            autoFocus={splitIndex === paymentSplits.length - 1}
                            className="w-full rounded-xl border border-slate-200 bg-white pl-7 pr-3 py-2.5 text-right text-sm tabular-nums font-medium text-slate-950 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            inputMode="decimal"
                            min="0"
                            placeholder="0.00"
                            step="0.01"
                            type="number"
                            value={split.amount}
                            onChange={(e) =>
                              setPaymentSplits(prev =>
                                prev.map(p => p.id === split.id ? { ...p, amount: e.target.value } : p)
                              )
                            }
                          />
                        </div>

                        {/* Dropdown de método */}
                        <div className="relative flex-1">
                          <select
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 cursor-pointer"
                            value={split.method}
                            onChange={(e) =>
                              setPaymentSplits(prev =>
                                prev.map(p =>
                                  p.id === split.id
                                    ? { ...p, method: e.target.value as PaymentMethodKey, reference: "" }
                                    : p
                                )
                              )
                            }
                          >
                            {PAYMENT_METHOD_CONFIG.map(cfg => (
                              <option key={cfg.method} value={cfg.method}>
                                {cfg.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            size={15}
                          />
                        </div>

                        {/* Quitar fila */}
                        <button
                          type="button"
                          aria-label="Quitar"
                          className="flex-shrink-0 rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                          onClick={() =>
                            setPaymentSplits(prev => prev.filter(p => p.id !== split.id))
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* N° de operación (Tarjeta / Transferencia) */}
                      {showReference && (
                        <div className="pl-2">
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            placeholder={
                              split.method === "Tarjeta"
                                ? "N° de operación (opcional)"
                                : "N° / CBU / alias (opcional)"
                            }
                            type="text"
                            value={split.reference ?? ""}
                            onChange={(e) =>
                              setPaymentSplits(prev =>
                                prev.map(p => p.id === split.id ? { ...p, reference: e.target.value } : p)
                              )
                            }
                          />
                        </div>
                      )}

                      {/* Efectivo recibido + cambio */}
                      {showCashHelper && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500">Recibido</label>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                              <input
                                className="w-28 rounded-xl border border-slate-200 bg-white pl-6 pr-3 py-1.5 text-right text-sm tabular-nums text-slate-950 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                                inputMode="decimal"
                                min="0"
                                placeholder="0.00"
                                step="0.01"
                                type="number"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                              />
                            </div>
                          </div>
                          {cashNum > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Cambio</span>
                              <span
                                className={`text-sm font-semibold tabular-nums ${
                                  cashNum >= (parsedAmount || cartNet)
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {formatMoneyNum(
                                  Math.max(cashNum - (parsedAmount || cartNet), 0)
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Botón agregar método ── */}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                onClick={() =>
                  setPaymentSplits(prev => [
                    ...prev,
                    { id: localId(), method: "Efectivo", amount: remaining > 0.005 ? remaining.toFixed(2) : "" },
                  ])
                }
              >
                <Plus size={15} />
                Agregar método de pago
              </button>

              {/* ── Balance ── */}
              {paymentSplits.length > 0 && (
                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                    Math.abs(remaining) < 0.01
                      ? "bg-emerald-50 text-emerald-700"
                      : remaining > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                  }`}
                >
                  <span>
                    {Math.abs(remaining) < 0.01
                      ? "✓ Monto completo"
                      : remaining > 0
                        ? "Pendiente por asignar"
                        : "Monto excedido"}
                  </span>
                  <span className="tabular-nums">
                    {Math.abs(remaining) < 0.01
                      ? formatMoneyNum(cartNet)
                      : formatMoneyNum(Math.abs(remaining))}
                  </span>
                </div>
              )}

              {/* ── Cliente — obligatorio con Fiado, opcional en el resto ── */}
              {hasFiado ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cliente <span className="text-rose-400 font-bold">*</span>
                  </label>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <span className="text-sm font-medium text-amber-800">
                        {selectedCustomer.name}
                      </span>
                      <button
                        type="button"
                        className="text-amber-400 hover:text-amber-600 transition-colors"
                        onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      {customersLoading ? (
                        <p className="text-xs text-slate-400">Cargando clientes...</p>
                      ) : (
                        <>
                          <input
                            autoFocus
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            onBlur={() => setTimeout(() => setCustomerSearchOpen(false), 150)}
                            onChange={(e) => { setCustomerSearch(e.target.value); setCustomerSearchOpen(true); }}
                            onFocus={() => setCustomerSearchOpen(true)}
                            placeholder="Buscar cliente..."
                            type="text"
                            value={customerSearch}
                          />
                          <Search
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={15}
                          />
                          {customerSearchOpen && filteredCustomers.length > 0 && (
                            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                              {filteredCustomers.map((c) => (
                                <li key={c.id}>
                                  <button
                                    type="button"
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-violet-50"
                                    onMouseDown={() => {
                                      setSelectedCustomer(c);
                                      setCustomerSearch("");
                                      setCustomerSearchOpen(false);
                                    }}
                                  >
                                    {c.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-3">
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
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setCustomerSearchOpen(true);
                            }}
                            onFocus={() => setCustomerSearchOpen(true)}
                            placeholder="Buscar cliente..."
                            type="text"
                            value={customerSearch}
                          />
                          <Search
                            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            size={14}
                          />
                          {customerSearchOpen && filteredCustomers.length > 0 ? (
                            <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                              {filteredCustomers.map((c) => (
                                <li key={c.id}>
                                  <button
                                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-violet-50"
                                    onMouseDown={() => {
                                      setSelectedCustomer(c);
                                      setCustomerSearch("");
                                      setCustomerSearchOpen(false);
                                    }}
                                    type="button"
                                  >
                                    {c.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      className="flex w-full items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors"
                      onClick={() => setOptionalCustomerOpen(true)}
                      type="button"
                    >
                      <UserPlus size={12} />
                      Agregar cliente (opcional)
                    </button>
                  )}
                </div>
              )}

              {/* ── Error ── */}
              {submitError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-medium text-rose-900">{submitError}</p>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  paymentSplits.length === 0 ||
                  (!onlyFiado && Math.abs(remaining) > 0.01) ||
                  (hasFiado && !selectedCustomerId)
                }
                className={
                  isSubmitting ||
                  paymentSplits.length === 0 ||
                  (!onlyFiado && Math.abs(remaining) > 0.01) ||
                  (hasFiado && !selectedCustomerId)
                    ? "flex flex-[2] cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 py-3 text-sm font-bold text-slate-400"
                    : "flex flex-[2] items-center justify-center rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.99]"
                }
                onClick={() => void submitSale()}
              >
                {isSubmitting
                  ? "Procesando..."
                  : Math.abs(remaining) < 0.01 && paymentSplits.length > 0
                    ? `Confirmar cobro — ${formatMoneyNum(cartNet)}`
                    : "Confirmar cobro"}
              </button>
            </div>
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
  receiptType,
  receiptNumber,
  sellerCode,
  arcaEnabled,
  invoice,
  onEmitInvoice,
  onClose,
}: {
  saleId: string;
  total: number;
  cartItems: CartItem[];
  paymentMethod: string;
  receiptType: "TICKET" | "INVOICE";
  receiptNumber: number;
  sellerCode: string;
  arcaEnabled?: boolean;
  invoice?: InvoiceResult | null;
  onEmitInvoice?: () => void;
  onClose: () => void;
}) {
  const [emailSent, setEmailSent] = useState(false);
  const [businessName, setBusinessName] = useState("Mi negocio");
  const receiptPrefix = receiptType === "INVOICE" ? "FAC" : "TKT";
  const saleNumber = `${receiptPrefix}-${String(receiptNumber).padStart(4, "0")}`;
  const saleDate = new Intl.DateTimeFormat("es-419", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(new Date());
  const itemsTotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = itemsTotal - total;

  useEffect(() => {
    fetch("/api/settings", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body) => {
        if (body.data?.businessName) setBusinessName(body.data.businessName);
      })
      .catch(() => {});
  }, []);

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
      .map((item) => `<tr><td>${item.productName}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">${formatARS(item.unitPrice)}</td><td style="text-align:right">${formatARS(item.unitPrice * item.quantity)}</td></tr>`)
      .join("");
    const discountRow = discount > 0
      ? `<p class="center">Descuento: -${formatARS(discount)}</p>`
      : "";
    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:monospace;width:72mm;margin:0 auto;padding:4mm;font-size:11px}
      h2{text-align:center;font-size:13px;margin:0 0 4px}
      p{margin:2px 0}table{width:100%;border-collapse:collapse;margin:6px 0}
      td{padding:2px 0}.center{text-align:center}
      .total{font-weight:bold;font-size:13px;border-top:1px dashed #000;padding-top:4px;margin-top:4px}
    </style></head><body>
      <h2>${businessName}</h2>
      <p class="center">${receiptType === "INVOICE" ? "FACTURA" : "TICKET DE VENTA"} ${saleNumber}</p>
      <p class="center">${saleDate}</p>
      <p class="center">Pago: ${paymentMethod}</p>
      ${sellerCode ? `<p class="center">Vendedor: ${sellerCode}</p>` : ""}
      <hr style="border-style:dashed"/>
      <table><thead><tr><th style="text-align:left">Producto</th><th>Cant.</th><th style="text-align:right">P.Unit</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <hr style="border-style:dashed"/>
      ${discountRow}
      <p class="total center">Total: ${formatARS(total)}</p>
      <p class="center" style="font-size:9px;margin-top:4px">IVA incluido en los precios</p>
      <p class="center" style="margin-top:8px;font-size:10px">¡Gracias por su compra!</p>
    </body></html>`);
  }

  async function handlePrintInvoice() {
    const enrichedItems = cartItems.map((item) => {
      const totalFinal = item.unitPrice * item.quantity;
      const neto = item.ivaRate > 0 ? totalFinal / (1 + item.ivaRate) : totalFinal;
      const ivaAmount = totalFinal - neto;
      return { ...item, totalFinal, neto, ivaAmount };
    });

    const rows = enrichedItems
      .map((item) => `
        <tr>
          <td>${item.productName}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatARS(item.unitPrice / (item.ivaRate > 0 ? 1 + item.ivaRate : 1))}</td>
          <td style="text-align:right">${formatARS(item.neto)}</td>
          <td style="text-align:right">${item.ivaRate > 0 ? `${(item.ivaRate * 100).toFixed(item.ivaRate === 0.105 ? 1 : 0)}%` : "Exento"}</td>
          <td style="text-align:right">${formatARS(item.ivaAmount)}</td>
          <td style="text-align:right">${formatARS(item.totalFinal)}</td>
        </tr>`)
      .join("");

    const ivaGroups = new Map<number, number>();
    for (const item of enrichedItems) {
      if (item.ivaRate > 0) {
        ivaGroups.set(item.ivaRate, (ivaGroups.get(item.ivaRate) ?? 0) + item.ivaAmount);
      }
    }
    const totalNeto = enrichedItems.reduce((sum, item) => sum + item.neto, 0);
    const totalIva = enrichedItems.reduce((sum, item) => sum + item.ivaAmount, 0);

    const ivaRows = Array.from(ivaGroups.entries())
      .sort(([a], [b]) => b - a)
      .map(([rate, amount]) => `
        <tr>
          <td colspan="5" style="text-align:right;color:#64748b">IVA ${(rate * 100).toFixed(rate === 0.105 ? 1 : 0)}%</td>
          <td style="text-align:right;color:#7c3aed">${formatARS(amount)}</td>
          <td></td>
        </tr>`)
      .join("");

    const discountRow = discount > 0
      ? `<tr><td colspan="6" style="text-align:right;color:#64748b">Descuento</td><td style="text-align:right">-${formatARS(discount)}</td></tr>`
      : "";

    let arcaSection = "";
    if (invoice?.cae) {
      const vto = invoice.caeFchVto;
      const expiry = `${vto.slice(6, 8)}/${vto.slice(4, 6)}/${vto.slice(0, 4)}`;
      const payload = {
        ver: 1,
        fecha: `${vto.slice(0, 4)}-${vto.slice(4, 6)}-${vto.slice(6, 8)}`,
        cuit: Number(invoice.cuit),
        ptoVta: invoice.puntoVenta,
        tipoCmp: invoice.voucherType,
        nroCmp: invoice.voucherNumber,
        importe: total,
        moneda: "PES",
        ctz: 1,
        tipoDocRec: invoice.docTipo,
        nroDocRec: Number(invoice.docNro) || 0,
        tipoCodAut: "E",
        codAut: Number(invoice.cae),
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      const qrDataUrl = await QRCode.toDataURL(
        `https://www.arca.gob.ar/fe/qr/?p=${encoded}`,
        { width: 120, margin: 1 }
      );
      arcaSection = `<div style="margin-top:16px;padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc"><div style="display:flex;align-items:flex-start;gap:12px"><img src="${qrDataUrl}" width="80" height="80" style="flex-shrink:0"/><div style="font-size:11px;color:#475569"><p style="font-weight:600;color:#1e293b;margin:0 0 4px">Comprobante Electrónico ARCA/AFIP</p><p style="margin:2px 0">CAE: ${invoice.cae}</p><p style="margin:2px 0">Vencimiento CAE: ${expiry}</p><p style="margin:2px 0">CUIT emisor: ${invoice.cuit}</p><p style="margin:2px 0">Tipo ${invoice.voucherType} · Pto.Vta. ${invoice.puntoVenta} · Nro. ${invoice.voucherNumber}</p></div></div></div>`;
    }
    openPrintWindow(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:24px;font-size:13px;color:#1e293b}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .business{font-size:20px;font-weight:bold;color:#0f172a}
      .meta{color:#64748b;font-size:12px;text-align:right}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
      td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
      .subtotal-row td{color:#64748b;font-size:12px;border-bottom:none;padding-top:4px;padding-bottom:2px}
      .iva-row td{color:#7c3aed;font-size:12px;border-bottom:none;padding-top:2px;padding-bottom:2px}
      .total-row td{font-weight:bold;font-size:15px;border-top:2px solid #e2e8f0;border-bottom:none;padding-top:10px}
      .footer{margin-top:24px;text-align:center;color:#94a3b8;font-size:11px}
      .tax-note{margin-top:12px;padding:10px 12px;background:#f8fafc;border-radius:6px;font-size:11px;color:#64748b;border:1px solid #e2e8f0}
    </style></head><body>
      <div class="header">
        <div>
          <div class="business">${businessName}</div>
          <p style="margin:2px 0;color:#64748b;font-size:12px">${receiptType === "INVOICE" ? "FACTURA" : "TICKET DE VENTA"}</p>
        </div>
        <div class="meta">
          <p><strong>Comprobante ${saleNumber}</strong></p>
          <p>${saleDate}</p>
          <p>Método de pago: ${paymentMethod}</p>
          ${sellerCode ? `<p>Vendedor: ${sellerCode}</p>` : ""}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Producto / Servicio</th>
            <th style="text-align:center">Cant.</th>
            <th style="text-align:right">P. Unit. Neto</th>
            <th style="text-align:right">Subtotal Neto</th>
            <th style="text-align:right">Alíc. IVA</th>
            <th style="text-align:right">IVA</th>
            <th style="text-align:right">Total c/IVA</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="subtotal-row">
            <td colspan="3" style="text-align:right">Subtotal neto (sin IVA)</td>
            <td style="text-align:right">${formatARS(totalNeto)}</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          ${ivaRows}
          ${discountRow}
          <tr class="total-row">
            <td colspan="6">Total a pagar (IVA incluido)</td>
            <td style="text-align:right">${formatARS(total)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="tax-note">
        Los precios incluyen IVA. Documento no válido como factura fiscal.
        IVA total: ${formatARS(totalIva)} | Neto gravado: ${formatARS(totalNeto)}
      </div>
      <div class="footer">${businessName} · ¡Gracias por su compra!</div>
      ${arcaSection}
    </body></html>`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-emerald-100 bg-emerald-50 px-6 py-4">
          <p className="text-sm font-semibold text-emerald-800">✓ Venta registrada</p>
          <p className="mt-0.5 text-xs text-emerald-600">
            {saleNumber} · {formatARS(total)}
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
            onClick={() => { void handlePrintInvoice(); }}
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
          {invoice?.cae ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="text-xs font-semibold text-violet-800">✓ Factura electrónica emitida</p>
              <p className="mt-0.5 font-mono text-xs text-violet-700">CAE: {invoice.cae}</p>
              <p className="text-xs text-violet-600">
                Vto.: {invoice.caeFchVto.slice(6, 8)}/{invoice.caeFchVto.slice(4, 6)}/{invoice.caeFchVto.slice(0, 4)}
              </p>
            </div>
          ) : arcaEnabled ? (
            <button
              className="flex w-full items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-left text-sm font-medium text-violet-700 hover:bg-violet-100"
              onClick={onEmitInvoice}
              type="button"
            >
              <Receipt size={16} className="flex-shrink-0 text-violet-500" />
              Emitir Factura Electrónica
            </button>
          ) : null}
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

function InvoiceModal({
  saleId,
  total,
  items,
  onSuccess,
  onClose,
}: {
  saleId: string;
  total: number;
  items: CartItem[];
  onSuccess: (result: InvoiceResult) => void;
  onClose: () => void;
}) {
  const [docTipo, setDocTipo] = useState(99);
  const [docNro, setDocNro] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmit() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId,
          total,
          docTipo,
          docNro,
          items: items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            ivaRate: item.ivaRate,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json?.error?.message ?? "No se pudo emitir la factura.");
        return;
      }
      onSuccess(json.data as InvoiceResult);
    } catch {
      setError("No se pudo emitir la factura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Emitir Factura Electrónica</h3>
        </div>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de comprobante</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={docTipo}
              onChange={(e) => setDocTipo(Number(e.target.value))}
            >
              <option value={99}>Consumidor Final (sin CUIT/DNI)</option>
              <option value={96}>DNI</option>
              <option value={80}>CUIT</option>
            </select>
          </div>
          {docTipo !== 99 ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Número de documento</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={docNro}
                onChange={(e) => setDocNro(e.target.value)}
                placeholder={docTipo === 80 ? "CUIT" : "DNI"}
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            onClick={() => { void handleEmit(); }}
            type="button"
            disabled={loading}
          >
            {loading ? "Emitiendo..." : "Emitir"}
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
