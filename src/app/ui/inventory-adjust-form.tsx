"use client";

import {
  ArrowLeft,
  Barcode,
  Box,
  ChevronDown,
  ClipboardList,
  Info,
  MoreHorizontal,
  Package,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProductRecord = {
  id: string;
  name: string;
  categoryName: string;
  costPrice: string;
  salePrice: string;
  stock: number;
};

type AdjustItem = {
  productId: string;
  productName: string;
  currentStock: number;
  quantity: number;
  costPrice: number;
};

type MovementRecord = {
  id: string;
  reason: string;
  quantityChange: number;
  createdAt: string;
  product: { name: string };
};

const TIPOS_AJUSTE = [
  "Pérdida / Deterioro",
  "Conteo físico",
  "Daño",
  "Robo",
  "Donación",
  "Corrección",
  "Otro"
] as const;

const MOTIVOS_BY_TIPO: Record<string, string[]> = {
  "Pérdida / Deterioro": [
    "Vencimiento de producto",
    "Deterioro por manejo",
    "Condiciones de almacenamiento",
    "Otro"
  ],
  "Conteo físico": [
    "Diferencia en conteo",
    "Corrección de inventario",
    "Error de conteo",
    "Otro"
  ],
  Daño: [
    "Daño accidental",
    "Daño en transporte",
    "Daño en almacenamiento",
    "Otro"
  ],
  Robo: [
    "Robo externo",
    "Robo interno",
    "Pérdida no justificada",
    "Otro"
  ],
  Donación: [
    "Donación a terceros",
    "Muestra gratuita",
    "Producto de cortesía",
    "Otro"
  ],
  Corrección: [
    "Error administrativo",
    "Ajuste contable",
    "Corrección de sistema",
    "Otro"
  ],
  Otro: ["Otro motivo"]
};

const ALMACENES = ["Tienda Principal", "Mostrador", "Bodega"] as const;

function makeReference(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

export function InventoryAdjustForm() {
  const router = useRouter();

  const [tipoAjuste, setTipoAjuste] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fechaAjuste, setFechaAjuste] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [referencia, setReferencia] = useState(() =>
    makeReference("AJUSTE")
  );
  const [almacen, setAlmacen] = useState("Tienda Principal");
  const [responsable, setResponsable] = useState("Propietario");
  const [notas, setNotas] = useState("");

  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [adjustItems, setAdjustItems] = useState<AdjustItem[]>([]);

  const [recentMovements, setRecentMovements] = useState<MovementRecord[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products", {
          headers: { Accept: "application/json" }
        });
        const body = (await res.json()) as { data?: ProductRecord[] };
        if (res.ok && body.data) setAllProducts(body.data);
      } catch {
        /* ignore */
      }
    }
    void loadProducts();
  }, []);

  useEffect(() => {
    async function loadMovements() {
      try {
        const res = await fetch("/api/inventory-movements", {
          headers: { Accept: "application/json" }
        });
        const body = (await res.json()) as { data?: MovementRecord[] };
        if (res.ok && body.data) setRecentMovements(body.data.slice(0, 3));
      } catch {
        /* ignore */
      }
    }
    void loadMovements();
  }, []);

  function handleTipoChange(tipo: string) {
    setTipoAjuste(tipo);
    const motivoOpts = MOTIVOS_BY_TIPO[tipo] ?? [];
    setMotivo(motivoOpts[0] ?? "");
  }

  const filteredProducts = allProducts.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.slice(-6).toLowerCase().includes(q)
    );
  });

  function addProduct(product: ProductRecord) {
    if (adjustItems.some((item) => item.productId === product.id)) return;
    setAdjustItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        quantity: 1,
        costPrice: parseFloat(product.costPrice) || 0
      }
    ]);
    setSearchQuery("");
    setShowDropdown(false);
  }

  function updateQuantity(productId: string, qty: number) {
    setAdjustItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.max(0, Math.min(Math.floor(qty), item.currentStock))
            }
          : item
      )
    );
  }

  function removeItem(productId: string) {
    setAdjustItems((prev) =>
      prev.filter((item) => item.productId !== productId)
    );
  }

  function clearAll() {
    setAdjustItems([]);
  }

  function handleSaveDraft() {
    try {
      const draft = {
        tipoAjuste,
        motivo,
        fechaAjuste,
        referencia,
        almacen,
        responsable,
        notas,
        adjustItems
      };
      localStorage.setItem(
        "solven-inventory-adjust-draft",
        JSON.stringify(draft)
      );
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const totalQuantities = adjustItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const costoTotal = adjustItems.reduce(
    (sum, item) => sum + item.quantity * item.costPrice,
    0
  );
  const impuestos = costoTotal * 0.21;
  const valorTotal = costoTotal + impuestos;

  function validate(): string | null {
    if (!tipoAjuste) return "Selecciona el tipo de ajuste.";
    if (!motivo) return "Selecciona el motivo del ajuste.";
    if (!fechaAjuste) return "La fecha del ajuste es obligatoria.";
    if (!almacen) return "Selecciona el almacén.";
    if (!responsable.trim()) return "El responsable es obligatorio.";
    if (adjustItems.length === 0)
      return "Agrega al menos un producto al ajuste.";
    for (const item of adjustItems) {
      if (item.quantity <= 0)
        return `La cantidad del producto "${item.productName}" debe ser mayor a cero.`;
      if (item.quantity > item.currentStock)
        return `La cantidad de "${item.productName}" excede el stock actual (${item.currentStock}).`;
    }
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    const reason =
      tipoAjuste +
      (notas.trim() ? ": " + notas.trim() : motivo ? " - " + motivo : "");

    try {
      for (const item of adjustItems) {
        const newStock = item.currentStock - item.quantity;
        const res = await fetch("/api/inventory-adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: item.productId,
            newStock,
            reason
          })
        });
        const body = (await res.json()) as {
          data?: unknown;
          error?: { message?: string; details?: string[] };
        };
        if (!res.ok || !body.data) {
          const msg =
            body.error?.details?.[0] ??
            body.error?.message ??
            "No se pudo guardar el ajuste.";
          setSubmitError(`Error en "${item.productName}": ${msg}`);
          setIsSubmitting(false);
          return;
        }
      }
      router.push("/inventory");
    } catch {
      setSubmitError("No se pudo guardar el ajuste de inventario.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="mb-3">
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
            onClick={() => router.push("/inventory")}
            type="button"
          >
            <ArrowLeft size={14} />
            Volver al inventario
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100">
              <Box className="text-rose-600" size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">
                Ajuste de inventario
              </h1>
              <p className="text-sm text-slate-500">
                Registra pérdidas, daños o correcciones de stock
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleSaveDraft}
              type="button"
            >
              {draftSaved ? "✓ Borrador guardado" : "Guardar como borrador"}
            </button>
            <button
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              type="button"
            >
              <MoreHorizontal size={16} />
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              <Save size={15} />
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: form sections */}
          <div className="space-y-6 lg:col-span-2">
            {/* Section 1 */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <ClipboardList className="text-slate-600" size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Información del ajuste
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="adj-tipo">
                    Tipo de ajuste <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    id="adj-tipo"
                    onChange={(e) => handleTipoChange(e.target.value)}
                    value={tipoAjuste}
                  >
                    <option value="">Selecciona un tipo</option>
                    {TIPOS_AJUSTE.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="adj-motivo">
                    Motivo del ajuste <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    disabled={!tipoAjuste}
                    id="adj-motivo"
                    onChange={(e) => setMotivo(e.target.value)}
                    value={motivo}
                  >
                    <option value="">Selecciona un motivo</option>
                    {(MOTIVOS_BY_TIPO[tipoAjuste] ?? []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="adj-fecha">
                    Fecha del ajuste <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="adj-fecha"
                    onChange={(e) => setFechaAjuste(e.target.value)}
                    required
                    type="date"
                    value={fechaAjuste}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="adj-ref">
                    Referencia / No. documento
                  </label>
                  <input
                    className={inputClass}
                    id="adj-ref"
                    onChange={(e) => setReferencia(e.target.value)}
                    type="text"
                    value={referencia}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="adj-almacen">
                    Almacén / Sucursal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    id="adj-almacen"
                    onChange={(e) => setAlmacen(e.target.value)}
                    value={almacen}
                  >
                    {ALMACENES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass} htmlFor="adj-responsable">
                    Responsable <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="adj-responsable"
                    onChange={(e) => setResponsable(e.target.value)}
                    type="text"
                    value={responsable}
                  />
                </div>

                <div className="col-span-2">
                  <label className={labelClass} htmlFor="adj-notas">
                    Notas (opcional)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    id="adj-notas"
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones sobre este ajuste de inventario..."
                    rows={2}
                    value={notas}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Products */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
                  <Package className="text-rose-600" size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Productos a ajustar
                </h2>
              </div>

              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Barcode
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={14}
                  />
                  <input
                    className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    onBlur={() =>
                      setTimeout(() => setShowDropdown(false), 150)
                    }
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() =>
                      searchQuery.length > 0 && setShowDropdown(true)
                    }
                    placeholder="Buscar producto por código, nombre o código de barras..."
                    type="text"
                    value={searchQuery}
                  />
                  {showDropdown && filteredProducts.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {filteredProducts.slice(0, 8).map((product) => (
                        <button
                          className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                          key={product.id}
                          onMouseDown={() => addProduct(product)}
                          type="button"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-950">
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Stock: {product.stock} ·{" "}
                              #{product.id.slice(-6).toUpperCase()}
                            </p>
                          </div>
                          <span className="ml-3 shrink-0 text-xs text-violet-600">
                            Agregar
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
                  onClick={() => {
                    if (filteredProducts.length > 0)
                      addProduct(filteredProducts[0]);
                  }}
                  type="button"
                >
                  + Agregar producto
                </button>
              </div>

              {adjustItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Código/SKU
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Stock actual
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cant. a ajustar
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Unidad
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Valor unitario
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Valor total
                          </th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {adjustItems.map((item, idx) => (
                          <tr className="hover:bg-slate-50/50" key={item.productId}>
                            <td className="px-3 py-3 text-sm text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100" />
                                <p className="max-w-[140px] truncate text-sm font-medium text-slate-950">
                                  {item.productName}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-slate-500">
                                #{item.productId.slice(-6).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`text-sm font-semibold ${
                                  item.currentStock === 0
                                    ? "text-rose-600"
                                    : item.currentStock <= 5
                                      ? "text-orange-600"
                                      : "text-emerald-600"
                                }`}
                              >
                                {item.currentStock}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <input
                                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                                  max={item.currentStock}
                                  min="0"
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.productId,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  step="1"
                                  type="number"
                                  value={item.quantity}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs text-slate-500">ud</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm text-slate-700">
                                AR$ {moneyFmt.format(item.costPrice)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-medium text-rose-600">
                                AR${" "}
                                {moneyFmt.format(item.quantity * item.costPrice)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <button
                                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => removeItem(item.productId)}
                                type="button"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Mostrando {adjustItems.length} de {adjustItems.length}{" "}
                      productos
                    </p>
                    <button
                      className="text-xs font-medium text-rose-600 hover:text-rose-800"
                      onClick={clearAll}
                      type="button"
                    >
                      Limpiar todo
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <Package className="mx-auto mb-2 text-slate-300" size={28} />
                  <p className="text-sm text-slate-500">
                    Busca y agrega productos para ajustar su stock
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Totales */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">
                Totales del ajuste
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Total unidades a ajustar
                  </span>
                  <span className="text-sm font-semibold text-slate-950">
                    {totalQuantities} ud
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Costo total de las unidades
                  </span>
                  <span className="text-sm font-semibold text-slate-950">
                    AR$ {moneyFmt.format(costoTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Impuesto (IVA 21%)
                  </span>
                  <span className="text-sm font-semibold text-slate-950">
                    AR$ {moneyFmt.format(impuestos)}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-950">
                      Valor total del ajuste
                    </span>
                    <span className="text-lg font-bold text-rose-600">
                      AR$ {moneyFmt.format(valorTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-medium text-rose-900">
                  {submitError}
                </p>
              </div>
            ) : null}

            {/* Bottom bar */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4">
              <button
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={isSubmitting}
                onClick={() => router.push("/inventory")}
                type="button"
              >
                <X size={14} />
                Cancelar
              </button>
              <button
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                disabled={isSubmitting}
                onClick={handleSubmit}
                type="button"
              >
                {isSubmitting ? "Guardando..." : "Guardar ajuste de inventario"}
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Panel 1: Resumen */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Resumen del ajuste
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Total productos
                    </span>
                    <span className="text-xs font-semibold text-slate-950">
                      {adjustItems.length}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Valor total del ajuste
                      </span>
                      <span className="text-base font-bold text-rose-600">
                        AR$ {moneyFmt.format(valorTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Disminución de inventario
                    </span>
                    <span className="text-xs font-semibold text-rose-600">
                      - AR$ {moneyFmt.format(costoTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Afecta al costo de inventario
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Sí
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Fecha de creación
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {new Date().toLocaleDateString("es-419")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel 2: Info violet */}
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Info className="text-violet-600" size={14} />
                  <h3 className="text-sm font-semibold text-violet-900">
                    Impacto del ajuste
                  </h3>
                </div>
                <p className="text-xs text-violet-700">
                  Este ajuste reducirá el stock de los productos seleccionados y
                  creará un movimiento de inventario para trazabilidad completa.
                </p>
              </div>

              {/* Panel 3: Afectación */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Afectación del inventario
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Valor total del ajuste
                    </span>
                    <span className="text-xs font-semibold text-rose-600">
                      - AR$ {moneyFmt.format(valorTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Nuevo valor de inventario
                    </span>
                    <span className="text-xs text-slate-400">
                      calculando...
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Productos afectados
                    </span>
                    <span className="text-xs font-semibold text-slate-950">
                      {adjustItems.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Unidades ajustadas
                    </span>
                    <span className="text-xs font-semibold text-slate-950">
                      {totalQuantities}
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel 4: Documentos */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Documentos / Evidencias
                </h3>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 text-center hover:border-violet-300 hover:bg-violet-50/30">
                  <Upload className="mb-2 text-slate-300" size={22} />
                  <p className="text-xs text-slate-500">
                    Subir archivos PDF, JPG o PNG
                  </p>
                  <p className="text-xs text-slate-400">(Máx. 5MB)</p>
                </div>
              </div>

              {/* Panel 5: Historial */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Historial de ajustes recientes
                  </h3>
                  <button
                    className="text-xs text-violet-600 hover:text-violet-800"
                    onClick={() => router.push("/inventory")}
                    type="button"
                  >
                    Ver todos →
                  </button>
                </div>
                {recentMovements.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Sin movimientos recientes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentMovements.map((m) => (
                      <div
                        className="flex items-start justify-between gap-2"
                        key={m.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-950">
                            {m.product.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {m.reason.slice(0, 30)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            m.quantityChange < 0
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {m.quantityChange > 0 ? "+" : ""}
                          {m.quantityChange} ud
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none";

const selectClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-violet-500 focus:outline-none";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const moneyFmt = new Intl.NumberFormat("es-419", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
