"use client";

import { useEffect, useState } from "react";

type ProductRecord = {
  id: string;
  name: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

type ProductsResponse = {
  data?: ProductRecord[];
  error?: {
    message: string;
  };
};

export function ProductsInventory() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          headers: {
            Accept: "application/json"
          }
        });
        const responseBody = (await response.json()) as ProductsResponse;

        if (!isActive) {
          return;
        }

        if (!response.ok || !responseBody.data) {
          setErrorMessage("No se pudo cargar el inventario.");
          setProducts([]);
          return;
        }

        setProducts(responseBody.data);
        setErrorMessage(null);
      } catch {
        if (isActive) {
          setErrorMessage("No se pudo cargar el inventario.");
          setProducts([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="px-5 py-6 sm:px-8">
      {isLoading ? <LoadingState /> : null}
      {!isLoading && errorMessage ? <ErrorState message={errorMessage} /> : null}
      {!isLoading && !errorMessage && products.length === 0 ? <EmptyState /> : null}
      {!isLoading && !errorMessage && products.length > 0 ? (
        <InventoryTable products={products} />
      ) : null}
    </section>
  );
}

function InventoryTable({ products }: { products: ProductRecord[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Productos registrados
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Consulta de productos, precios y existencias actuales.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <TableHeader>Producto</TableHeader>
              <TableHeader>Costo</TableHeader>
              <TableHeader>Precio de venta</TableHeader>
              <TableHeader>Stock</TableHeader>
              <TableHeader>Actualizado</TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-950">
                  {product.name}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {formatMoney(product.costPrice)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                  {formatMoney(product.salePrice)}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <StockBadge stock={product.stock} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                  {formatDate(product.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
      {children}
    </th>
  );
}

function StockBadge({ stock }: { stock: number }) {
  const isLowStock = stock <= 5;

  return (
    <span
      className={
        isLowStock
          ? "inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800"
          : "inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800"
      }
    >
      {numberFormatter.format(stock)}
    </span>
  );
}

function LoadingState() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">
        Cargando inventario...
      </p>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="h-16 animate-pulse border-b border-slate-100 bg-slate-50 last:border-b-0"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
      <p className="text-sm font-medium text-rose-900">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">
        No hay productos registrados.
      </p>
      <p className="mt-1 text-sm text-slate-500">
        El inventario aparecerá aquí cuando existan productos en el sistema.
      </p>
    </div>
  );
}

function formatMoney(value: string) {
  return moneyFormatter.format(Number(value));
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

const moneyFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("es-419", {
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});
