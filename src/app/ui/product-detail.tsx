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
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-12 text-center">
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

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
