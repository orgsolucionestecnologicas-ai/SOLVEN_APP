"use client";

import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowUpCircle as UploadIcon,
  Calendar,
  CheckCircle,
  HelpCircle,
  Info,
  Save,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SessionRecord = {
  id: string;
  cashierName: string;
  openingAmount: string;
  openedAt: string;
};

type CashMovementRecord = {
  id: string;
  type: "IN" | "OUT";
  amount: string;
  movementDate: string;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const CATEGORIES_IN = [
  "Ventas en efectivo",
  "Cobros a crédito",
  "Devoluciones a favor",
  "Otros ingresos",
] as const;

const CATEGORIES_OUT = [
  "Retiros de efectivo",
  "Pago a proveedor",
  "Gastos operativos",
  "Compra de suministros",
  "Transporte",
  "Otros gastos",
] as const;

const CAJAS = ["Caja 1 - Mostrador", "Caja 2 - Bodega", "Caja Principal"] as const;
const METODOS_PAGO = ["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Otro"] as const;

const moneyFmt = new Intl.NumberFormat("es-419", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("es-419", { day: "2-digit", month: "short", year: "numeric" });

function fmtMoney(v: number) { return `$ ${moneyFmt.format(v)}`; }
function fmtDate(v: string) { return dateFmt.format(new Date(v)); }

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CashMovementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramType = searchParams.get("type");
  const paramCategory = searchParams.get("category");

  const [movementType, setMovementType] = useState<"IN" | "OUT">(
    paramType === "OUT" ? "OUT" : "IN"
  );
  const [fecha, setFecha] = useState(todayISO());
  const [hora, setHora] = useState(currentTimeHHMM());
  const [caja, setCaja] = useState<string>(CAJAS[0]);
  const [cajero, setCajero] = useState("Propietario");
  const [categoria, setCategoria] = useState("");
  const [referencia, setReferencia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [metodoPago, setMetodoPago] = useState<string>(METODOS_PAGO[0]);
  const [requiereComprobante, setRequiereComprobante] = useState(true);
  const [monto, setMonto] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [todayMovements, setTodayMovements] = useState<CashMovementRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [sRes, mRes] = await Promise.all([
          fetch("/api/cash-register"),
          fetch("/api/cash-movements")
        ]);
        const [sBody, mBody] = await Promise.all([sRes.json(), mRes.json()]) as [
          ApiResponse<SessionRecord | null>, ApiResponse<CashMovementRecord[]>
        ];
        if (sBody.data) {
          setSession(sBody.data);
          setCajero(sBody.data.cashierName || "Propietario");
        }
        if (mBody.data) {
          const now = new Date();
          setTodayMovements(mBody.data.filter((m) => isSameLocalDay(new Date(m.movementDate), now)));
        }
      } catch { /* non-critical */ }
    }
    void load();
  }, []);

  useEffect(() => {
    const cats = movementType === "IN" ? CATEGORIES_IN : CATEGORIES_OUT;
    const matched = paramCategory ? cats.find((c) => c.toLowerCase().includes(paramCategory.toLowerCase())) : null;
    setCategoria(matched ?? cats[0]);
  }, [movementType, paramCategory]);

  const amountNum = parseFloat(monto) || 0;

  const currentExpectedCash = useMemo(() => {
    const opening = session ? Number(session.openingAmount) : 0;
    const todayIN = todayMovements.filter((m) => m.type === "IN").reduce((s, m) => s + Number(m.amount), 0);
    const todayOUT = todayMovements.filter((m) => m.type === "OUT").reduce((s, m) => s + Number(m.amount), 0);
    return opening + todayIN - todayOUT;
  }, [session, todayMovements]);

  const newExpectedCash = movementType === "IN"
    ? currentExpectedCash + amountNum
    : currentExpectedCash - amountNum;

  const categories = movementType === "IN" ? CATEGORIES_IN : CATEGORIES_OUT;

  function validate(): string | null {
    if (amountNum <= 0) return "El monto debe ser mayor a cero.";
    if (!descripcion.trim()) return "La descripción es requerida.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setSubmitError(err); return; }

    setIsSubmitting(true);
    setSubmitError(null);

    const referenceId = referencia.trim() || descripcion.trim();

    try {
      const res = await fetch("/api/cash-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movementType,
          amount: amountNum,
          source: "MANUAL",
          referenceId
        })
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.data) {
        setSubmitError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el movimiento.");
        return;
      }
      router.push("/cash-movements");
    } catch {
      setSubmitError("No se pudo registrar el movimiento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            href="/cash-movements"
          >
            <ArrowLeftRight size={15} />
            Volver a movimientos de caja
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Nuevo movimiento de caja</h1>
            <p className="text-xs text-slate-500">Registra un ingreso o salida de dinero en caja.</p>
          </div>
        </div>
        <button
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          type="button"
        >
          <HelpCircle size={13} />
          Ayuda
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: form */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-24 pt-5">
          <div className="mx-auto max-w-2xl space-y-5">

            {/* Section 1: Información general */}
            <FormSection number={1} title="Información general">
              <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
                {/* Type toggle */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tipo de movimiento <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                        movementType === "IN"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                      onClick={() => setMovementType("IN")}
                      type="button"
                    >
                      <ArrowUpCircle className={movementType === "IN" ? "text-emerald-500" : "text-slate-300"} size={28} />
                      <span className="font-semibold">Ingreso</span>
                      <span className="text-xs font-normal text-slate-400">Dinero que entra a caja</span>
                    </button>
                    <button
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                        movementType === "OUT"
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                      onClick={() => setMovementType("OUT")}
                      type="button"
                    >
                      <ArrowDownCircle className={movementType === "OUT" ? "text-rose-500" : "text-slate-300"} size={28} />
                      <span className="font-semibold">Salida</span>
                      <span className="text-xs font-normal text-slate-400">Dinero que sale de caja</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Fecha */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-fecha">
                      Fecha del movimiento <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                      id="cm-fecha"
                      onChange={(e) => setFecha(e.target.value)}
                      type="date"
                      value={fecha}
                    />
                  </div>
                  {/* Hora */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-hora">
                      Hora <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                      id="cm-hora"
                      onChange={(e) => setHora(e.target.value)}
                      type="time"
                      value={hora}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Caja */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-caja">
                      Caja / Punto de venta <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                      id="cm-caja"
                      onChange={(e) => setCaja(e.target.value)}
                      value={caja}
                    >
                      {CAJAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Cajero */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-cajero">
                      Cajero <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                      id="cm-cajero"
                      onChange={(e) => setCajero(e.target.value)}
                      type="text"
                      value={cajero}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Section 2: Detalles del movimiento */}
            <FormSection number={2} title="Detalles del movimiento">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                {/* Categoría */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-categoria">
                    Categoría <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                    id="cm-categoria"
                    onChange={(e) => setCategoria(e.target.value)}
                    value={categoria}
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Referencia */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-referencia">
                    Referencia / Nº documento
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    id="cm-referencia"
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Ej: FAC-000987, REC-001, etc."
                    type="text"
                    value={referencia}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-descripcion">
                    Descripción <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    id="cm-descripcion"
                    maxLength={200}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el motivo del movimiento..."
                    rows={3}
                    value={descripcion}
                  />
                  <p className="mt-1 text-right text-[10px] text-slate-400">{descripcion.length}/200</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Método de pago */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cm-metodo">
                      Método de pago
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                      id="cm-metodo"
                      onChange={(e) => setMetodoPago(e.target.value)}
                      value={metodoPago}
                    >
                      {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Comprobante */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      ¿Requiere comprobante?
                    </label>
                    <div className="flex gap-4 pt-2">
                      {[{ label: "Sí", value: true }, { label: "No", value: false }].map(({ label, value }) => (
                        <label className="flex cursor-pointer items-center gap-2" key={label}>
                          <input
                            checked={requiereComprobante === value}
                            className="accent-violet-600"
                            onChange={() => setRequiereComprobante(value)}
                            type="radio"
                          />
                          <span className="text-sm text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Section 3: Monto */}
            <FormSection number={3} title="Monto del movimiento">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 focus-within:border-violet-500">
                  <span className="border-r border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
                    $
                  </span>
                  <input
                    autoFocus
                    className="flex-1 bg-white px-4 py-3 text-2xl font-bold text-slate-950 placeholder:text-slate-300 focus:outline-none"
                    min="0.01"
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={monto}
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <Info className="shrink-0 text-amber-500" size={13} />
                  <p className="text-xs text-amber-700">Asegúrate de ingresar el monto correcto.</p>
                </div>
              </div>
            </FormSection>

            {/* Section 4: Comprobante (visual only) */}
            <FormSection number={4} title="Comprobante / Evidencia (opcional)">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 py-8">
                  <UploadIcon className="text-slate-300" size={32} />
                  <div className="text-center">
                    <button className="text-sm font-medium text-violet-600 hover:text-violet-800" type="button">
                      Subir archivo
                    </button>
                    <p className="mt-0.5 text-xs text-slate-400">PDF, JPG o PNG (Máx. 5MB)</p>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Section 5: Observaciones */}
            <FormSection number={5} title="Observaciones adicionales (opcional)">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <textarea
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                  maxLength={200}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Agrega cualquier observación adicional..."
                  rows={3}
                  value={observaciones}
                />
                <p className="mt-1 text-right text-[10px] text-slate-400">{observaciones.length}/200</p>
              </div>
            </FormSection>

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-900">{submitError}</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 px-4 py-5">
          <div className="space-y-4">

            {/* Panel 1: Resumen del movimiento */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Resumen del movimiento</h3>
              <div className="space-y-2.5">
                <SummaryRow
                  label="Tipo"
                  value={
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${movementType === "IN" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {movementType === "IN" ? "↑ Ingreso" : "↓ Salida"}
                    </span>
                  }
                />
                <SummaryRow label="Categoría" value={<span className="text-xs font-medium text-slate-950">{categoria || "—"}</span>} />
                <SummaryRow
                  label="Descripción"
                  value={<span className="max-w-[140px] truncate text-right text-xs text-slate-600">{descripcion.trim() || "—"}</span>}
                />
                <SummaryRow label="Fecha" value={<span className="text-xs text-slate-600">{fmtDate(fecha + "T00:00:00")}</span>} />
                <SummaryRow label="Caja" value={<span className="text-xs text-slate-600">{caja}</span>} />
                <SummaryRow label="Cajero" value={<span className="text-xs text-slate-600">{cajero}</span>} />
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 text-center">
                <p className="text-xs text-slate-400">Monto</p>
                <p className={`mt-0.5 text-xl font-bold ${movementType === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                  {amountNum > 0 ? (movementType === "IN" ? "+" : "−") + fmtMoney(amountNum) : "—"}
                </p>
              </div>
            </div>

            {/* Panel 2: Saldo después */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Saldo después de este movimiento</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Efectivo actual esperado</span>
                  <span className="text-xs font-semibold text-slate-950">{fmtMoney(currentExpectedCash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Impacto</span>
                  <span className={`text-xs font-semibold ${movementType === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                    {amountNum > 0 ? (movementType === "IN" ? `+ ${fmtMoney(amountNum)}` : `− ${fmtMoney(amountNum)}`) : "—"}
                  </span>
                </div>
              </div>
              <div className="my-2.5 border-t border-slate-100" />
              <p className="text-xs text-slate-400">Nuevo saldo esperado</p>
              <p className={`mt-0.5 text-lg font-bold ${newExpectedCash >= currentExpectedCash ? "text-emerald-600" : "text-violet-600"}`}>
                {fmtMoney(newExpectedCash)}
              </p>
            </div>

            {/* Panel 3: Categorías comunes */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-950">Categorías comunes</h3>
              <div className="space-y-1">
                {(movementType === "IN" ? CATEGORIES_IN : CATEGORIES_OUT).map((cat) => (
                  <button
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${categoria === cat ? "bg-violet-50 font-medium text-violet-700" : "text-slate-600 hover:bg-slate-50"}`}
                    key={cat}
                    onClick={() => setCategoria(cat)}
                    type="button"
                  >
                    {categoria === cat ? <CheckCircle className="shrink-0 text-violet-500" size={11} /> : <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel 4: Información importante */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-950">Información importante</h3>
              <ul className="space-y-1.5">
                {[
                  "Todos los movimientos quedan registrados.",
                  "No se pueden eliminar, solo anular.",
                  "Los movimientos se verán reflejados en el cierre de caja.",
                ].map((point) => (
                  <li className="flex items-start gap-2 text-xs text-slate-500" key={point}>
                    <Info className="mt-0.5 shrink-0 text-slate-400" size={11} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/cash-movements"
          >
            <X size={14} />
            Cancelar
          </Link>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            disabled={isSubmitting || amountNum <= 0 || !descripcion.trim()}
            onClick={handleSubmit}
            type="button"
          >
            <Save size={15} />
            {isSubmitting ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
          {number}
        </div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      {value}
    </div>
  );
}
