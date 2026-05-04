"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

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

export function Pos() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [paymentType, setPaymentType] = useState<"CASH" | "CREDIT">("CASH");
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
          headers: { Accept: "application/json" }
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
    if (paymentType !== "CREDIT" || customersLoaded) return;

    let isActive = true;
    setCustomersLoading(true);

    async function loadCustomers() {
      try {
        const response = await fetch("/api/customers", {
          headers: { Accept: "application/json" }
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
  }, [paymentType, customersLoaded]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
          maxStock: product.stock
        }
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

    if (paymentType === "CREDIT" && !selectedCustomerId) {
      setSubmitError("Seleccioná un cliente para la venta a crédito.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType,
          ...(paymentType === "CREDIT" ? { customerId: selectedCustomerId } : {}),
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        })
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
      setPaymentType("CASH");
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
    <div className="flex divide-x divide-slate-200">
      {/* Left panel: product search + grid */}
      <div className="flex-1 px-5 py-6 sm:px-8">
        <input
          className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto..."
          type="text"
          value={searchQuery}
        />

        {successMessage ? (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">
              {successMessage}
            </p>
          </div>
        ) : null}

        {productsLoading ? <ProductsLoadingState /> : null}

        {!productsLoading && productsError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-medium text-rose-900">{productsError}</p>
          </div>
        ) : null}

        {!productsLoading && !productsError && filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">
              {searchQuery.trim()
                ? "Sin resultados para esa búsqueda."
                : "No hay productos registrados."}
            </p>
            {!searchQuery.trim() ? (
              <p className="mt-1 text-sm text-slate-500">
                Registrá productos en el módulo de Inventario para poder
                vender.
              </p>
            ) : null}
          </div>
        ) : null}

        {!productsLoading && !productsError && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const cartItem = cartItems.find(
                (item) => item.productId === product.id
              );
              const inCartQty = cartItem?.quantity ?? 0;
              const isOutOfStock = product.stock === 0;

              return (
                <button
                  className={
                    isOutOfStock
                      ? "cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 p-3 text-left opacity-50"
                      : "rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-400 active:bg-slate-50"
                  }
                  disabled={isOutOfStock}
                  key={product.id}
                  onClick={() => addToCart(product)}
                  type="button"
                >
                  {inCartQty > 0 ? (
                    <div className="mb-1 flex justify-end">
                      <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-xs font-medium text-white">
                        {inCartQty}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-1 h-5" />
                  )}
                  <p className="text-sm font-medium leading-tight text-slate-950">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {formatMoney(product.salePrice)}
                  </p>
                  <div className="mt-2">
                    <ProductStockBadge stock={product.stock} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Right panel: cart */}
      <div className="flex w-72 flex-shrink-0 flex-col px-5 py-6 lg:w-80">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-950">
            Carrito
            {cartItemCount > 0 ? (
              <span className="ml-2 rounded-full bg-slate-950 px-1.5 py-0.5 text-xs font-medium text-white">
                {cartItemCount}
              </span>
            ) : null}
          </h2>
          {cartItems.length > 0 ? (
            <button
              className="text-xs text-slate-400 hover:text-rose-600"
              onClick={() => setCartItems([])}
              type="button"
            >
              Vaciar
            </button>
          ) : null}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 py-10">
            <p className="text-sm text-slate-400">El carrito está vacío</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div
                className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                key={item.productId}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-medium leading-tight text-slate-950">
                    {item.productName}
                  </p>
                  <button
                    className="flex-shrink-0 text-slate-400 hover:text-rose-600"
                    onClick={() => removeFromCart(item.productId)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      type="button"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-slate-950">
                      {item.quantity}
                    </span>
                    <button
                      className={
                        item.quantity >= item.maxStock
                          ? "flex h-6 w-6 cursor-not-allowed items-center justify-center rounded border border-slate-200 text-slate-300"
                          : "flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
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
                  <p className="text-sm font-semibold text-slate-950">
                    {formatMoneyNum(item.unitPrice * item.quantity)}
                  </p>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  {formatMoneyNum(item.unitPrice)} c/u
                </p>
              </div>
            ))}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-semibold text-slate-950">
                {formatMoneyNum(cartTotal)}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tipo de pago
            </p>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              <button
                className={
                  paymentType === "CASH"
                    ? "flex-1 rounded-md bg-slate-950 px-4 py-1.5 text-sm font-medium text-white"
                    : "flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
                }
                onClick={() => {
                  setPaymentType("CASH");
                  setSelectedCustomerId("");
                }}
                type="button"
              >
                Contado
              </button>
              <button
                className={
                  paymentType === "CREDIT"
                    ? "flex-1 rounded-md bg-slate-950 px-4 py-1.5 text-sm font-medium text-white"
                    : "flex-1 rounded-md px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
                }
                onClick={() => setPaymentType("CREDIT")}
                type="button"
              >
                Fiado
              </button>
            </div>
          </div>

          {paymentType === "CREDIT" ? (
            <div>
              {customersLoading ? (
                <p className="text-sm text-slate-500">Cargando clientes...</p>
              ) : customers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay clientes registrados. Creá un cliente primero.
                </p>
              ) : (
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
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

          {submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm font-medium text-rose-900">{submitError}</p>
            </div>
          ) : null}

          <button
            className="w-full rounded-md bg-slate-950 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={isSubmitting || cartItems.length === 0}
            type="submit"
          >
            {isSubmitting
              ? "Procesando..."
              : cartItems.length > 0
                ? `Cobrar ${formatMoneyNum(cartTotal)}`
                : "Cobrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductStockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
        Sin stock
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
        Stock: {stock}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
      Stock: {stock}
    </span>
  );
}

function ProductsLoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50"
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
  minimumFractionDigits: 2
});
