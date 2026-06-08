"use client";

import {
  ArrowLeft,
  Barcode,
  ChevronDown,
  Info,
  MoreHorizontal,
  Package,
  PackagePlus,
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

type EntryItem = {
  productId: string;
  productName: string;
  currentStock: number;
  quantity: number;
  unitCost: number;
  taxRate: number;
};

type MovementRecord = {
  id: string;
  reason: string;
  quantityChange: number;
  createdAt: string;
  product: { name: string };
};

const TIPOS_ENTRADA = [
  "Compra a proveedor",
  "Devolución de cliente",
  "Transferencia",
  "Ajuste positivo",
  "Otro"
] as const;

const ALMACENES = ["Tienda Principal", "Mostrador", "Bodega"] as const;

const TAX_OPTIONS = [
  { label: "21% IVA", value: 0.21 },
  { label: "10.5% IVA", value: 0.105 },
  { label: "27% IVA", value: 0.27 },
  { label: "Sin IVA (0%)", value: 0 }
] as const;

function makeReference(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${suffix}`;
}

export function InventoryEntryForm() {
  const router = useRouter();

  const [tipoEntrada, setTipoEntrada] = useState("Compra a proveedor");
  const [proveedor, setProveedor] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState(() =>
    makeReference("COMP")
  );
  const [fechaEntrada, setFechaEntrada] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [fechaFactura, setFechaFactura] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [numeroFactura, setNumeroFactura] = useState(() =>
    makeReference("FACT")
  );
  const [almacen, setAlmacen] = useState("Tienda Principal");
  const [moneda] = useState("ARS - Peso argentino");
  const [notas, setNotas] = useState("");

  const [allProducts, setAllProducts] = useState<ProductRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [entryItems, setEntryItems] = useState<EntryItem[]>([]);

  const [descuento, setDescuento] = useState("0");
  const [transporte, setTransporte] = useState("0");
  const [otrosGastos, setOtrosGastos] = useState("0");

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
        if (res.ok && body.data) {
          const entradas = body.data
            .filter((m) => m.quantityChange > 0)
            .slice(0, 3);
          setRecentMovements(entradas);
        }
      } catch {
        /* ignore */
      }
    }
    void loadMovements();
  }, []);

  const filteredProducts = allProducts.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.slice(-6).toLowerCase().includes(q)
    );
  });

  function addProduct(product: ProductRecord) {
    if (entryItems.some((item) => item.productId === product.id)) return;
    setEntryItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        quantity: 1,
        unitCost: parseFloat(product.costPrice) || 0,
        taxRate: 0.21
      }
    ]);
    setSearchQuery("");
    setShowDropdown(false);
  }

  function updateItem(
    productId: string,
    field: "quantity" | "unitCost" | "taxRate",
    value: number
  ) {
    setEntryItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(productId: string) {
    setEntryItems((prev) =>
      prev.filter((item) => item.productId !== productId)
    );
  }

  function clearAll() {
    setEntryItems([]);
  }

  function handleSaveDraft() {
    try {
      const draft = {
        tipoEntrada,
        proveedor,
        numeroDocumento,
        fechaEntrada,
        fechaFactura,
        numeroFactura,
        almacen,
        moneda,
        notas,
        entryItems,
        descuento,
        transporte,
        otrosGastos
      };
      localStorage.setItem(
        "solven-inventory-entry-draft",
        JSON.stringify(draft)
      );
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const subtotal = entryItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCost,
    0
  );
  const descuentoNum = parseFloat(descuento) || 0;
  const transporteNum = parseFloat(transporte) || 0;
  const otrosNum = parseFloat(otrosGastos) || 0;
  const totalFinal = subtotal - descuentoNum + transporteNum + otrosNum;

  function validate(): string | null {
    if (!tipoEntrada) return "Selecciona el tipo de entrada.";
    if (!proveedor.trim()) return "El proveedor es obligatorio.";
    if (!numeroDocumento.trim()) return "El número de documento es obligatorio.";
    if (!fechaEntrada) return "La fecha de entrada es obligatoria.";
    if (!numeroFactura.trim()) return "El número de factura es obligatorio.";
    if (!almacen) return "Selecciona el almacén.";
    if (entryItems.length === 0)
      return "Agrega al menos un producto a la entrada.";
    for (const item of entryItems) {
      if (item.quantity <= 0)
        return `La cantidad del producto "${item.productName}" debe ser mayor a cero.`;
      if (item.unitCost < 0)
        return `El costo unitario de "${item.productName}" no puede ser negativo.`;
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
      "Entrada de stock: " +
      tipoEntrada +
      (proveedor.trim() ? " - " + proveedor.trim() : "");

    try {
      for (const item of entryItems) {
        const newStock = item.currentStock + Math.floor(item.quantity);
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
            "No se pudo registrar la entrada.";
          setSubmitError(`Error en "${item.productName}": ${msg}`);
          setIsSubmitting(false);
          return;
        }
      }
      router.push("/inventory");
    } catch {
      setSubmitError("No se pudo registrar la entrada de stock.");
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <PackagePlus className="text-emerald-600" size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">
                Entrada de stock
              </h1>
              <p className="text-sm text-slate-500">
                Registra compras, devoluciones o transferencias de mercancía
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
              {isSubmitting ? "Guardando..." : "Guardar entrada"}
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <PackagePlus className="text-emerald-600" size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Información general
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass} htmlFor="ent-tipo">
                    Tipo de entrada <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    id="ent-tipo"
                    onChange={(e) => setTipoEntrada(e.target.value)}
                    value={tipoEntrada}
                  >
                    {TIPOS_ENTRADA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass} htmlFor="ent-proveedor">
                    Proveedor <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      id="ent-proveedor"
                      onChange={(e) => setProveedor(e.target.value)}
                      placeholder="Nombre del proveedor"
                      type="text"
                      value={proveedor}
                    />
                  </div>
                  <button
                    className="mt-1 text-xs font-medium text-violet-600 hover:text-violet-800"
                    type="button"
                  >
                    + Nuevo proveedor
                  </button>
                </div>

                <div>
                  <label className={labelClass} htmlFor="ent-num-doc">
                    Número de documento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="ent-num-doc"
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    type="text"
                    value={numeroDocumento}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="ent-fecha">
                    Fecha de entrada <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="ent-fecha"
                    onChange={(e) => setFechaEntrada(e.target.value)}
                    type="date"
                    value={fechaEntrada}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="ent-fecha-fact">
                    Fecha de factura
                  </label>
                  <input
                    className={inputClass}
                    id="ent-fecha-fact"
                    onChange={(e) => setFechaFactura(e.target.value)}
                    type="date"
                    value={fechaFactura}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="ent-num-fact">
                    Número de factura / comprobante{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    id="ent-num-fact"
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    type="text"
                    value={numeroFactura}
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="ent-almacen">
                    Almacén / Sucursal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={selectClass}
                    id="ent-almacen"
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

                <div className="col-span-2">
                  <label className={labelClass} htmlFor="ent-notas">
                    Notas (opcional)
                  </label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                    id="ent-notas"
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones sobre esta entrada de stock..."
                    rows={2}
                    value={notas}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Products */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Package className="text-emerald-600" size={15} />
                </div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Productos
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

              {entryItems.length > 0 ? (
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
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Unidad
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Costo unitario
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Impuestos
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Subtotal
                          </th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {entryItems.map((item, idx) => (
                          <tr
                            className="hover:bg-slate-50/50"
                            key={item.productId}
                          >
                            <td className="px-3 py-3 text-sm text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-100" />
                                <p className="max-w-[120px] truncate text-sm font-medium text-slate-950">
                                  {item.productName}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-slate-500">
                                #{item.productId.slice(-6).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <input
                                  className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                                  min="1"
                                  onChange={(e) =>
                                    updateItem(
                                      item.productId,
                                      "quantity",
                                      parseInt(e.target.value, 10) || 1
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
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-slate-500">
                                  AR$
                                </span>
                                <input
                                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                                  min="0"
                                  onChange={(e) =>
                                    updateItem(
                                      item.productId,
                                      "unitCost",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  step="0.01"
                                  type="number"
                                  value={item.unitCost}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <select
                                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
                                  onChange={(e) =>
                                    updateItem(
                                      item.productId,
                                      "taxRate",
                                      parseFloat(e.target.value)
                                    )
                                  }
                                  value={item.taxRate}
                                >
                                  {TAX_OPTIONS.map((opt) => (
                                    <option key={opt.label} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-medium text-emerald-600">
                                AR${" "}
                                {moneyFmt.format(
                                  item.quantity * item.unitCost
                                )}
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
                      Mostrando {entryItems.length} de {entryItems.length}{" "}
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
                    Busca y agrega productos para registrar la entrada
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Totales */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-950">
                Totales y ajustes adicionales
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <label
                    className="shrink-0 text-sm text-slate-600"
                    htmlFor="ent-descuento"
                  >
                    Descuento global
                  </label>
                  <div className="flex w-44 items-center">
                    <span className="flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      AR$
                    </span>
                    <input
                      className="w-full rounded-r-md border border-slate-300 px-3 py-2 text-right text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                      id="ent-descuento"
                      min="0"
                      onChange={(e) => setDescuento(e.target.value)}
                      step="0.01"
                      type="number"
                      value={descuento}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label
                    className="shrink-0 text-sm text-slate-600"
                    htmlFor="ent-transporte"
                  >
                    Transporte / Flete
                  </label>
                  <div className="flex w-44 items-center">
                    <span className="flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      AR$
                    </span>
                    <input
                      className="w-full rounded-r-md border border-slate-300 px-3 py-2 text-right text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                      id="ent-transporte"
                      min="0"
                      onChange={(e) => setTransporte(e.target.value)}
                      step="0.01"
                      type="number"
                      value={transporte}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label
                    className="shrink-0 text-sm text-slate-600"
                    htmlFor="ent-otros"
                  >
                    Otros gastos
                  </label>
                  <div className="flex w-44 items-center">
                    <span className="flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      AR$
                    </span>
                    <input
                      className="w-full rounded-r-md border border-slate-300 px-3 py-2 text-right text-sm text-slate-950 focus:border-violet-500 focus:outline-none"
                      id="ent-otros"
                      min="0"
                      onChange={(e) => setOtrosGastos(e.target.value)}
                      step="0.01"
                      type="number"
                      value={otrosGastos}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-950">
                      Total final
                    </span>
                    <span className="text-xl font-bold text-violet-600">
                      AR$ {moneyFmt.format(totalFinal)}
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
                {isSubmitting ? "Guardando..." : "Guardar entrada de stock"}
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
                  Resumen de la entrada
                </h3>
                <div className="mb-3 text-center">
                  <p className="text-xs text-slate-500">
                    Total productos: {entryItems.length}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    AR$ {moneyFmt.format(totalFinal)}
                  </p>
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Subtotal</span>
                    <span className="text-xs font-medium text-slate-950">
                      AR$ {moneyFmt.format(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Descuento</span>
                    <span className="text-xs font-medium text-rose-600">
                      - AR$ {moneyFmt.format(descuentoNum)}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-950">
                        Total final
                      </span>
                      <span className="text-sm font-bold text-violet-600">
                        AR$ {moneyFmt.format(totalFinal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 2: Info violet */}
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Info className="text-violet-600" size={14} />
                  <h3 className="text-sm font-semibold text-violet-900">
                    Impacto de la entrada
                  </h3>
                </div>
                <p className="text-xs text-violet-700">
                  Esta entrada aumentará el stock de los productos seleccionados
                  y creará un movimiento de inventario para trazabilidad
                  completa.
                </p>
              </div>

              {/* Panel 3: Entradas recientes */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Entradas recientes
                  </h3>
                  <button
                    className="text-xs text-violet-600 hover:text-violet-800"
                    onClick={() => router.push("/inventory")}
                    type="button"
                  >
                    Ver todas →
                  </button>
                </div>
                {recentMovements.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Sin entradas recientes
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentMovements.map((m) => (
                      <div
                        className="rounded-lg border border-slate-100 bg-slate-50 p-2.5"
                        key={m.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-950">
                              {m.product.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(m.createdAt).toLocaleDateString(
                                "es-419"
                              )}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xs font-semibold text-emerald-600">
                              +{m.quantityChange} ud
                            </span>
                            <p className="text-[10px] font-medium text-emerald-600">
                              Completada
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel 4: Documentos */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Documentos adjuntos
                </h3>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 text-center hover:border-violet-300 hover:bg-violet-50/30">
                  <Upload className="mb-2 text-slate-300" size={22} />
                  <p className="text-xs text-slate-500">
                    Subir archivos PDF, JPG o PNG
                  </p>
                  <p className="text-xs text-slate-400">(Máx. 5MB)</p>
                </div>
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
