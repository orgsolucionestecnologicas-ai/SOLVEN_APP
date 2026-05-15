"use client";

import {
  AlertTriangle,
  ChevronLeft,
  HelpCircle,
  Info,
  Landmark,
  Lock,
  X,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { formatARS as fmt } from "@/lib/format-currency";

type ApiResponse<T> = { data?: T; error?: { message: string } };

const DENOMINATIONS = [
  { key: "20000", label: "$20.000", value: 20000 },
  { key: "10000", label: "$10.000", value: 10000 },
  { key: "2000", label: "$2.000", value: 2000 },
  { key: "1000", label: "$1.000", value: 1000 },
  { key: "500", label: "$500", value: 500 },
  { key: "200", label: "$200", value: 200 },
  { key: "100", label: "$100", value: 100 },
  { key: "50", label: "$50", value: 50 },
  { key: "20", label: "$20", value: 20 },
  { key: "c10", label: "Moneda $10", value: 10 },
  { key: "c5", label: "Moneda $5", value: 5 },
  { key: "c2", label: "Moneda $2", value: 2 },
  { key: "c1", label: "Moneda $1", value: 1 },
] as const;

type DenominationKey = (typeof DENOMINATIONS)[number]["key"];
type BreakdownCounts = Record<DenominationKey, number>;

const dateFmt = new Intl.DateTimeFormat("es-419", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("es-419", {
  hour: "2-digit",
  minute: "2-digit",
});

function emptyBreakdown(): BreakdownCounts {
  return Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])) as BreakdownCounts;
}

export function CashRegisterOpen({ onOpened }: { onOpened: () => void }) {
  const now = new Date();

  const [cashierName, setCashierName] = useState("Propietario");
  const [shift, setShift] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [breakdown, setBreakdown] = useState<BreakdownCounts>(emptyBreakdown);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openingAmountNum = Math.max(0, parseFloat(openingAmount) || 0);

  const breakdownTotal = useMemo(
    () => DENOMINATIONS.reduce((sum, d) => sum + (breakdown[d.key] ?? 0) * d.value, 0),
    [breakdown]
  );

  const anyBreakdownFilled = DENOMINATIONS.some((d) => (breakdown[d.key] ?? 0) > 0);
  const breakdownMismatch =
    anyBreakdownFilled && Math.abs(breakdownTotal - openingAmountNum) > 0.01;

  function setDenomCount(key: DenominationKey, count: number) {
    setBreakdown((prev) => ({ ...prev, [key]: Math.max(0, count) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cashierName.trim()) {
      setError("El nombre del cajero es requerido.");
      return;
    }
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      setError("El monto de apertura debe ser un número no negativo.");
      return;
    }
    setIsSaving(true);
    setError(null);

    const breakdownPayload: Record<string, number> = {};
    for (const d of DENOMINATIONS) {
      if ((breakdown[d.key] ?? 0) > 0) breakdownPayload[d.key] = breakdown[d.key];
    }

    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierName: cashierName.trim(),
          openingAmount: amount,
          ...(shift ? { shift } : {}),
          ...(openingNotes.trim() ? { openingNotes: openingNotes.trim() } : {}),
          ...(Object.keys(breakdownPayload).length > 0
            ? { openingBreakdown: breakdownPayload }
            : {}),
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok) {
        setError(body.error?.message ?? "No se pudo abrir la caja.");
        return;
      }
      onOpened();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-5 py-5 sm:px-8">
        <Link
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
          href="/cash-movements"
        >
          <ChevronLeft size={14} />
          Volver a cajas
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100">
              <Landmark className="text-violet-600" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Apertura de caja
              </h1>
              <p className="text-sm text-slate-500">
                Abre tu caja para comenzar a realizar ventas.
              </p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-800"
            type="button"
          >
            <HelpCircle size={15} />
            ¿Cómo funciona la apertura de caja?
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="border-b border-violet-100 bg-violet-50 px-5 py-3 sm:px-8">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 flex-shrink-0 text-violet-600" size={16} />
          <div>
            <p className="text-sm font-medium text-violet-900">
              Para comenzar a vender, debes abrir la caja con un monto de efectivo inicial.
            </p>
            <p className="text-xs text-violet-700">
              Este dinero será tu fondo de caja para dar cambios y cubrir operaciones del día.
            </p>
          </div>
        </div>
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <div className="flex min-h-0 flex-1">
          {/* Main content */}
          <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            {error ? (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm text-rose-800">{error}</p>
              </div>
            ) : null}

            {/* Section 1 — Información */}
            <section className="mb-8">
              <h2 className="mb-4 text-base font-semibold text-slate-950">
                Información de la apertura
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-slate-700"
                    htmlFor="cr-cashier"
                  >
                    Cajero <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    id="cr-cashier"
                    onChange={(e) => setCashierName(e.target.value)}
                    required
                    type="text"
                    value={cashierName}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Caja / Punto de venta <span className="text-rose-500">*</span>
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none">
                    <option>Caja 1 - Mostrador</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Sucursal <span className="text-rose-500">*</span>
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none">
                    <option>Tienda Principal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    readOnly
                    type="text"
                    value={dateFmt.format(now)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Turno{" "}
                    <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-violet-500 focus:outline-none"
                    onChange={(e) => setShift(e.target.value)}
                    value={shift}
                  >
                    <option value="">Sin turno</option>
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noche">Noche</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Hora de apertura
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    readOnly
                    type="text"
                    value={timeFmt.format(now)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Observaciones{" "}
                    <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                    maxLength={200}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder="Alguna observación relevante al momento de abrir la caja..."
                    rows={3}
                    value={openingNotes}
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {openingNotes.length}/200
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 — Monto inicial */}
            <section className="mb-8">
              <h2 className="mb-1 text-base font-semibold text-slate-950">
                Monto de efectivo inicial
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                Ingresa el monto de efectivo con el que inicias la caja.
              </p>
              <div className="mb-4">
                <div className="flex overflow-hidden rounded-xl border-2 border-slate-200 focus-within:border-violet-500">
                  <span className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-500">
                    AR$
                  </span>
                  <input
                    className="flex-1 px-4 py-3 text-2xl font-bold text-slate-950 focus:outline-none"
                    min="0"
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={openingAmount}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Este monto debe ser el dinero físico en caja al momento de abrir.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-1 text-sm font-semibold text-emerald-900">Importante</p>
                <p className="text-xs text-emerald-800">
                  Este monto se usará como referencia para el cierre de caja.
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Caja esperada = Monto inicial + Ventas en efectivo − Gastos / Retiros
                </p>
              </div>
            </section>

            {/* Section 3 — Desglose */}
            <section>
              <h2 className="mb-1 text-base font-semibold text-slate-950">
                Desglose del efectivo inicial{" "}
                <span className="text-sm font-normal text-slate-400">(opcional)</span>
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                Puedes registrar cómo está compuesto el efectivo inicial.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {DENOMINATIONS.map((denom) => {
                  const count = breakdown[denom.key] ?? 0;
                  const denomTotal = count * denom.value;
                  return (
                    <div className="rounded-lg border border-slate-200 p-3" key={denom.key}>
                      <p className="mb-1.5 text-sm font-semibold text-slate-700">
                        {denom.label}
                      </p>
                      <input
                        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-center text-sm focus:border-violet-500 focus:outline-none"
                        min="0"
                        onChange={(e) =>
                          setDenomCount(denom.key, parseInt(e.target.value) || 0)
                        }
                        placeholder="0"
                        type="number"
                        value={count === 0 ? "" : count}
                      />
                      <p className="mt-1.5 text-center text-xs text-slate-500">
                        Total: {fmt(denomTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div
                className={`mt-4 flex items-center justify-between rounded-lg border p-3 ${
                  breakdownMismatch
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <span className="text-sm font-medium text-slate-700">
                  Total del efectivo inicial
                </span>
                <span
                  className={`text-lg font-bold ${
                    breakdownMismatch ? "text-amber-700" : "text-emerald-700"
                  }`}
                >
                  {fmt(breakdownTotal)}
                </span>
              </div>
              {breakdownMismatch ? (
                <p className="mt-1.5 text-xs text-amber-700">
                  El total del desglose ({fmt(breakdownTotal)}) no coincide con el monto de
                  apertura ({fmt(openingAmountNum)}).
                </p>
              ) : null}
            </section>
          </div>

          {/* Right sidebar */}
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-200 px-4 py-6 xl:block">
            <h3 className="mb-4 text-sm font-semibold text-slate-950">
              Resumen de la apertura
            </h3>
            <div className="space-y-2.5 text-sm">
              {[
                { label: "Cajero", value: cashierName.trim() || "—" },
                { label: "Caja / Punto de venta", value: "Caja 1 - Mostrador" },
                { label: "Sucursal", value: "Tienda Principal" },
                { label: "Turno", value: shift || "Sin turno" },
                { label: "Fecha", value: dateFmt.format(now) },
                { label: "Hora de apertura", value: timeFmt.format(now) },
              ].map(({ label, value }) => (
                <div className="flex items-start justify-between gap-2" key={label}>
                  <span className="flex-shrink-0 text-slate-500">{label}</span>
                  <span className="text-right font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-violet-600 p-4 text-white">
              <p className="text-xs font-medium text-violet-200">Monto inicial en efectivo</p>
              <p className="mt-1 text-3xl font-bold">{fmt(openingAmountNum)}</p>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <AlertTriangle className="text-amber-600" size={14} />
                <p className="text-xs font-semibold text-amber-900">Ten en cuenta</p>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800">
                <li>• Verifica el efectivo antes de abrir la caja.</li>
                <li>• Una vez abierta, el monto no se puede cambiar.</li>
                <li>• Guarda los billetes ordenados por denominación.</li>
              </ul>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Proceso de apertura
              </p>
              <div className="space-y-3">
                {[
                  "Completa la información del cajero",
                  "Define el monto inicial de efectivo",
                  "Confirma la apertura de caja",
                ].map((step, i) => (
                  <div className="flex items-start gap-2.5" key={i}>
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {i + 1}
                    </div>
                    <p className="text-xs text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              href="/cash-movements"
            >
              <X size={15} />
              Cancelar
            </Link>
            <div className="text-center">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                <Lock size={15} />
                {isSaving ? "Abriendo caja..." : "Abrir caja y comenzar a vender"}
              </button>
              <p className="mt-1 text-xs text-slate-400">
                Al confirmar, la caja quedará disponible para registrar ventas.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
