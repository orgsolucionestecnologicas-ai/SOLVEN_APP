"use client";

import { useEffect, useState } from "react";

type MovementRecord = {
  id: string;
  movementDate: string;
  reason: string;
  previousStock: number;
  newStock: number;
  quantityChange: number;
  createdAt: string;
};

type ApiResponse = { data?: MovementRecord[]; error?: { message: string } };

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    SALE: "Venta",
    ADJUSTMENT_IN: "Ajuste entrada",
    ADJUSTMENT_OUT: "Ajuste salida",
    RETURN: "Devolución",
    INITIAL: "Stock inicial",
    TRANSFER_IN: "Transferencia entrada",
    TRANSFER_OUT: "Transferencia salida",
  };
  return map[reason] ?? reason;
}

function reasonColor(reason: string): string {
  if (reason === "SALE" || reason === "ADJUSTMENT_OUT" || reason === "TRANSFER_OUT")
    return "bg-rose-100 text-rose-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PriceChangeMetadata = {
  costPriceBefore: number;
  costPriceAfter: number;
  salePriceBefore: number;
  salePriceAfter: number;
};

type PriceHistoryEntry = {
  id: string;
  createdAt: string;
  metadata: PriceChangeMetadata;
  user: { name: string };
};

type PriceHistoryApiResponse = { data?: PriceHistoryEntry[]; error?: { message: string } };

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function ProductPriceHistory({ productId }: { productId: string }) {
  const [entries, setEntries] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/price-history`)
      .then((res) => res.json())
      .then((body: PriceHistoryApiResponse) => {
        if (body.data) setEntries(body.data);
        else setError(body.error?.message ?? "Error al cargar el historial de precios.");
      })
      .catch(() => setError("Error al cargar el historial de precios."))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-base font-semibold text-slate-950">
        Historial de precios
      </h2>

      {loading && (
        <p className="text-sm text-slate-500">Cargando historial de precios...</p>
      )}

      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-12 text-center shadow-sm">
          <p className="text-sm text-slate-500">Sin cambios de precio registrados para este producto.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-slate-700">{entry.user.name}</span>
                <span className="flex-shrink-0 text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
              </div>
              <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:gap-6">
                <span>
                  Costo: <strong className="text-slate-700">{arsFormatter.format(entry.metadata.costPriceBefore)}</strong>
                  <span className="text-slate-300"> → </span>
                  <strong className="text-slate-700">{arsFormatter.format(entry.metadata.costPriceAfter)}</strong>
                </span>
                <span>
                  Venta: <strong className="text-slate-700">{arsFormatter.format(entry.metadata.salePriceBefore)}</strong>
                  <span className="text-slate-300"> → </span>
                  <strong className="text-slate-700">{arsFormatter.format(entry.metadata.salePriceAfter)}</strong>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductMovementsTimeline({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/movements`)
      .then((res) => res.json())
      .then((body: ApiResponse) => {
        if (body.data) setMovements(body.data);
        else setError(body.error?.message ?? "Error al cargar movimientos.");
      })
      .catch(() => setError("Error al cargar movimientos."))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-base font-semibold text-slate-950">
        Historial de movimientos
      </h2>

      {loading && (
        <p className="text-sm text-slate-500">Cargando movimientos...</p>
      )}

      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}

      {!loading && !error && movements.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-12 text-center shadow-sm">
          <p className="text-sm text-slate-500">Sin movimientos registrados para este producto.</p>
        </div>
      )}

      {!loading && !error && movements.length > 0 && (
        <div className="relative">
          {/* línea vertical de timeline */}
          <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-200" />

          <ol className="space-y-4 pl-12">
            {movements.map((m) => {
              const isOut = m.quantityChange < 0;
              return (
                <li key={m.id} className="relative">
                  {/* punto de timeline */}
                  <span
                    className={`absolute -left-8 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                      isOut ? "bg-rose-400" : "bg-emerald-400"
                    }`}
                    style={{ top: "2px" }}
                  />

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reasonColor(m.reason)}`}
                        >
                          {reasonLabel(m.reason)}
                        </span>
                        <span
                          className={`text-sm font-bold ${isOut ? "text-rose-700" : "text-emerald-700"}`}
                        >
                          {isOut ? "" : "+"}
                          {m.quantityChange} uds.
                        </span>
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {formatDate(m.movementDate)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span>Stock anterior: <strong className="text-slate-700">{m.previousStock}</strong></span>
                      <span className="text-slate-300">→</span>
                      <span>Stock nuevo: <strong className="text-slate-700">{m.newStock}</strong></span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
