"use client";

import {
  ArrowLeft,
  ArrowUpCircle,
  Barcode,
  Calendar,
  CheckCircle,
  Diamond,
  FileText,
  Info,
  Package,
  Tag
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

const SELECTABLE_CATEGORIES = [
  "Alimentos",
  "Bebidas",
  "Lácteos",
  "Limpieza",
  "Cuidado Personal",
  "Hogar",
  "Panadería",
  "Snacks",
  "Otros"
] as const;

const UNITS = [
  "Unidad (ud)",
  "Kilogramo (kg)",
  "Gramo (g)",
  "Litro (L)",
  "Mililitro (ml)",
  "Caja",
  "Bolsa",
  "Paquete"
] as const;

const LOCATIONS = [
  "Almacén Principal",
  "Mostrador",
  "Refrigerador",
  "Bodega",
  "Otro"
] as const;

type CreateProductResponse = {
  data?: { id: string };
  error?: { message: string; details?: string[] };
};

type InitialProductData = {
  name: string;
  categoryName: string;
  costPrice: string;
  salePrice: string;
  stock: number;
  minStock?: number;
  productCode?: string | null;
};

type ProductFormProps = {
  initialData?: InitialProductData;
  productId?: string;
};

type CategoryApiRecord = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

function generateSku(productName: string): string {
  return productName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 24);
}

function formatMoney(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

export function ProductForm({ initialData, productId }: ProductFormProps = {}) {
  const router = useRouter();
  const isEditMode = Boolean(productId);

  const [name, setName] = useState(initialData?.name ?? "");
  const [sku, setSku] = useState(initialData?.productCode ?? "");
  const [barcode, setBarcode] = useState("");
  const [categoryName, setCategoryName] = useState(initialData?.categoryName ?? "");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<string>("Unidad (ud)");
  const [costPrice, setCostPrice] = useState(initialData?.costPrice ?? "");
  const [margin, setMargin] = useState(() => {
    if (initialData) {
      const cost = parseFloat(initialData.costPrice);
      const sale = parseFloat(initialData.salePrice);
      if (!isNaN(cost) && cost > 0 && !isNaN(sale)) {
        return (((sale - cost) / cost) * 100).toFixed(1);
      }
    }
    return "30";
  });
  const [salePrice, setSalePrice] = useState(initialData?.salePrice ?? "");
  const [stock, setStock] = useState(initialData?.stock !== undefined ? String(initialData.stock) : "0");
  const [minStock, setMinStock] = useState(initialData?.minStock !== undefined ? String(initialData.minStock) : "0");
  const [stockAlert, setStockAlert] = useState("0");
  const [location, setLocation] = useState("");
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [allowSaleWithoutStock, setAllowSaleWithoutStock] = useState(false);

  const [subcategoryName, setSubcategoryName] = useState("");
  const [apiCategories, setApiCategories] = useState<CategoryApiRecord[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories", { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = (await res.json()) as { data?: CategoryApiRecord[] };
        if (body.data) setApiCategories(body.data);
      } catch {}
    }
    void loadCategories();
  }, []);

  const selectedCategoryRecord = apiCategories.find((c) => c.name === categoryName);
  const availableSubcategories = selectedCategoryRecord?.subcategories ?? [];

  function handleCostPriceChange(value: string) {
    setCostPrice(value);
    const cost = parseFloat(value);
    const m = parseFloat(margin);
    if (!isNaN(cost) && cost > 0 && !isNaN(m)) {
      setSalePrice((cost * (1 + m / 100)).toFixed(2));
    }
  }

  function handleMarginChange(value: string) {
    setMargin(value);
    const cost = parseFloat(costPrice);
    const m = parseFloat(value);
    if (!isNaN(cost) && cost > 0 && !isNaN(m)) {
      setSalePrice((cost * (1 + m / 100)).toFixed(2));
    }
  }

  function handleSalePriceChange(value: string) {
    setSalePrice(value);
    const cost = parseFloat(costPrice);
    const sale = parseFloat(value);
    if (!isNaN(cost) && cost > 0 && !isNaN(sale)) {
      setMargin((((sale - cost) / cost) * 100).toFixed(1));
    }
  }

  function handleGenerateSku() {
    if (name.trim()) {
      setSku(generateSku(name));
    }
  }

  function validate(): string | null {
    if (!name.trim()) return "El nombre del producto es obligatorio.";
    if (!sku.trim()) return "El código / SKU es obligatorio.";
    if (!categoryName) return "La categoría es obligatoria.";
    const cost = parseFloat(costPrice);
    if (!costPrice || isNaN(cost) || cost < 0)
      return "El precio de compra es obligatorio y debe ser válido.";
    const sale = parseFloat(salePrice);
    if (!salePrice || isNaN(sale) || sale < 0)
      return "El precio de venta es obligatorio y debe ser válido.";
    const stockNum = parseInt(stock, 10);
    if (stock === "" || isNaN(stockNum) || stockNum < 0)
      return "El stock actual es obligatorio.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const url = isEditMode ? `/api/products/${productId}` : "/api/products";
      const method = isEditMode ? "PUT" : "POST";
      const payload = isEditMode
        ? { name: name.trim(), categoryName, costPrice: parseFloat(costPrice), salePrice: parseFloat(salePrice), minStock: parseInt(minStock, 10) || 0 }
        : { name: name.trim(), categoryName, costPrice: parseFloat(costPrice), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10), minStock: parseInt(minStock, 10) || 0 };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const responseBody = (await response.json()) as CreateProductResponse;
      if (!response.ok || !responseBody.data) {
        const errorDetail = responseBody.error?.details?.[0];
        const errorMessage = responseBody.error?.message;
        setSubmitError(
          errorDetail ?? errorMessage ?? (isEditMode ? "No se pudo actualizar el producto." : "No se pudo guardar el producto.")
        );
        return;
      }
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/products");
      }, 1500);
    } catch {
      setSubmitError(isEditMode ? "No se pudo actualizar el producto." : "No se pudo guardar el producto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const costNum = parseFloat(costPrice) || 0;
  const saleNum = parseFloat(salePrice) || 0;
  const marginNum = parseFloat(margin) || 0;
  const profitPerUnit = saleNum - costNum;
  const stockNum = parseInt(stock, 10) || 0;
  const minStockNum = parseInt(minStock, 10) || 0;
  const stockAlertNum = parseInt(stockAlert, 10) || 0;

  return (
    <div className="flex flex-col">
      {showSuccess ? (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3 shadow-lg">
            <p className="text-sm font-medium text-emerald-800">
              {isEditMode ? "✓ Producto actualizado exitosamente. Redirigiendo..." : "✓ Producto creado exitosamente. Redirigiendo..."}
            </p>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="mb-3">
          <button
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
            onClick={() => router.back()}
            type="button"
          >
            <ArrowLeft size={14} />
            Productos
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              {isEditMode ? "Editar producto" : "Nuevo producto"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isEditMode
                ? "Modifica los datos del producto y guardá los cambios."
                : "Completa la información para registrar un nuevo producto en tu inventario."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => router.back()}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={isSubmitting}
              form="new-product-form"
              type="submit"
            >
              <CheckCircle size={15} />
              {isSubmitting ? "Guardando..." : "Guardar producto"}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: form */}
          <div className="space-y-6 lg:col-span-2">
            <form id="new-product-form" onSubmit={handleSubmit}>
              {/* Section 1 — Información básica */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                    <Tag className="text-blue-600" size={15} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Información básica
                  </h2>
                </div>

                <div className="space-y-4">
                  <FormField htmlFor="pf-name" label="Nombre del producto" required>
                    <input
                      autoFocus
                      className={inputClass}
                      disabled={isSubmitting}
                      id="pf-name"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Arroz Premium 5kg"
                      required
                      type="text"
                      value={name}
                    />
                  </FormField>

                  <FormField htmlFor="pf-sku" label="Código / SKU" required>
                    <div className="flex gap-2">
                      <input
                        className={`${inputClass} flex-1`}
                        disabled={isSubmitting}
                        id="pf-sku"
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="Ej. ARROZ-5KG"
                        required
                        type="text"
                        value={sku}
                      />
                      <button
                        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        onClick={handleGenerateSku}
                        title="Generar SKU desde nombre"
                        type="button"
                      >
                        <Barcode size={14} />
                        Auto
                      </button>
                    </div>
                  </FormField>

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Código del producto</p>
                    {isEditMode && initialData?.productCode ? (
                      <p className="font-mono text-sm font-semibold text-slate-700">{initialData.productCode}</p>
                    ) : (
                      <p className="text-xs text-slate-400">Se generará al guardar (ej. PROD-0001)</p>
                    )}
                  </div>

                  <FormField htmlFor="pf-barcode" label="Código de barras">
                    <div className="relative">
                      <input
                        className={`${inputClass} pr-9`}
                        disabled={isSubmitting}
                        id="pf-barcode"
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Ej. 7501234567890"
                        type="text"
                        value={barcode}
                      />
                      <Barcode
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"
                        size={14}
                      />
                    </div>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField htmlFor="pf-category" label="Categoría" required>
                      <select
                        className={selectClass}
                        disabled={isSubmitting}
                        id="pf-category"
                        onChange={(e) => {
                          setCategoryName(e.target.value);
                          setSubcategoryName("");
                        }}
                        required
                        value={categoryName}
                      >
                        <option disabled value="">
                          Selecciona una categoría
                        </option>
                        {SELECTABLE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField htmlFor="pf-brand" label="Marca">
                      <input
                        className={inputClass}
                        disabled={isSubmitting}
                        id="pf-brand"
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ej. La Garza"
                        type="text"
                        value={brand}
                      />
                    </FormField>
                  </div>

                  {availableSubcategories.length > 0 ? (
                    <FormField htmlFor="pf-subcategory" label="Subcategoría">
                      <select
                        className={selectClass}
                        disabled={isSubmitting}
                        id="pf-subcategory"
                        onChange={(e) => setSubcategoryName(e.target.value)}
                        value={subcategoryName}
                      >
                        <option value="">Sin subcategoría</option>
                        {availableSubcategories.map((sub) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  ) : null}

                  <FormField htmlFor="pf-unit" label="Unidad de medida" required>
                    <select
                      className={selectClass}
                      disabled={isSubmitting}
                      id="pf-unit"
                      onChange={(e) => setUnit(e.target.value)}
                      value={unit}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Section 2 — Precios */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                    <Diamond className="text-violet-600" size={15} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Precios
                  </h2>
                </div>

                <div className="space-y-4">
                  <FormField htmlFor="pf-cost" label="Precio de compra" required>
                    <div className="flex">
                      <span className="flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                        AR$
                      </span>
                      <input
                        className="w-full rounded-r-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                        disabled={isSubmitting}
                        id="pf-cost"
                        min="0"
                        onChange={(e) => handleCostPriceChange(e.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        type="number"
                        value={costPrice}
                      />
                    </div>
                  </FormField>

                  <FormField htmlFor="pf-margin" label="Margen de ganancia %">
                    <input
                      className={inputClass}
                      disabled={isSubmitting}
                      id="pf-margin"
                      min="0"
                      onChange={(e) => handleMarginChange(e.target.value)}
                      placeholder="30"
                      step="0.1"
                      type="number"
                      value={margin}
                    />
                  </FormField>

                  <FormField htmlFor="pf-sale" label="Precio de venta" required>
                    <div className="flex">
                      <span className="flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
                        AR$
                      </span>
                      <input
                        className="w-full rounded-r-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                        disabled={isSubmitting}
                        id="pf-sale"
                        min="0"
                        onChange={(e) => handleSalePriceChange(e.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        type="number"
                        value={salePrice}
                      />
                    </div>
                  </FormField>

                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                    <p className="text-xs text-violet-700">
                      El precio de venta se calcula automáticamente según el
                      margen de ganancia.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3 — Inventario */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <Calendar className="text-emerald-600" size={15} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Inventario
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField htmlFor="pf-stock" label="Stock actual" required={!isEditMode}>
                      {isEditMode ? (
                        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="text-sm text-slate-700">{stock} unidades</span>
                          <span className="text-xs text-slate-400">Ajustá desde inventario</span>
                        </div>
                      ) : (
                        <input
                          className={inputClass}
                          disabled={isSubmitting}
                          id="pf-stock"
                          min="0"
                          onChange={(e) => setStock(e.target.value)}
                          placeholder="0"
                          required
                          step="1"
                          type="number"
                          value={stock}
                        />
                      )}
                    </FormField>

                    <FormField
                      htmlFor="pf-min-stock"
                      label="Stock mínimo"
                      tooltip="Nivel mínimo antes de alerta"
                    >
                      <input
                        className={inputClass}
                        disabled={isSubmitting}
                        id="pf-min-stock"
                        min="0"
                        onChange={(e) => setMinStock(e.target.value)}
                        placeholder="0"
                        step="1"
                        type="number"
                        value={minStock}
                      />
                    </FormField>

                    <FormField
                      htmlFor="pf-stock-alert"
                      label="Alerta de stock bajo"
                      tooltip="Cantidad para notificación"
                    >
                      <input
                        className={inputClass}
                        disabled={isSubmitting}
                        id="pf-stock-alert"
                        min="0"
                        onChange={(e) => setStockAlert(e.target.value)}
                        placeholder="0"
                        step="1"
                        type="number"
                        value={stockAlert}
                      />
                    </FormField>
                  </div>

                  <FormField htmlFor="pf-location" label="Ubicación">
                    <select
                      className={selectClass}
                      disabled={isSubmitting}
                      id="pf-location"
                      onChange={(e) => setLocation(e.target.value)}
                      value={location}
                    >
                      <option value="">Selecciona una ubicación</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <div>
                    <FormField htmlFor="pf-supplier" label="Proveedor">
                      <select
                        className={selectClass}
                        disabled={isSubmitting}
                        id="pf-supplier"
                        onChange={(e) => setSupplier(e.target.value)}
                        value={supplier}
                      >
                        <option value="">Selecciona un proveedor</option>
                      </select>
                    </FormField>
                    <button
                      className="mt-1.5 text-xs font-medium text-violet-600 hover:text-violet-800"
                      type="button"
                    >
                      + Nuevo proveedor
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 4 — Información adicional */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="text-slate-600" size={15} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Información adicional
                  </h2>
                </div>

                <div className="space-y-4">
                  <FormField htmlFor="pf-description" label="Descripción">
                    <textarea
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
                      disabled={isSubmitting}
                      id="pf-description"
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe tu producto, características, presentaciones, etc."
                      rows={3}
                      value={description}
                    />
                  </FormField>

                  <FormField htmlFor="pf-tags" label="Etiquetas">
                    <input
                      className={inputClass}
                      disabled={isSubmitting}
                      id="pf-tags"
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Ej. orgánico, importado, oferta — Separa las etiquetas con comas"
                      type="text"
                      value={tags}
                    />
                  </FormField>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        Producto activo
                      </p>
                      <p className="text-xs text-slate-500">
                        El producto estará disponible para ventas
                      </p>
                    </div>
                    <button
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                        isActive ? "bg-violet-600" : "bg-slate-300"
                      }`}
                      onClick={() => setIsActive(!isActive)}
                      type="button"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          isActive ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
                    <input
                      checked={allowSaleWithoutStock}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-violet-600"
                      disabled={isSubmitting}
                      onChange={(e) =>
                        setAllowSaleWithoutStock(e.target.checked)
                      }
                      type="checkbox"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        Permitir venta sin stock
                      </p>
                      <p className="text-xs text-slate-500">
                        Se podrá vender aunque no haya inventario
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {submitError ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm font-medium text-rose-900">
                    {submitError}
                  </p>
                </div>
              ) : null}
            </form>
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Panel 1: Imagen */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Imagen del producto
                </h3>
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-4 py-8 text-center hover:border-violet-300 hover:bg-violet-50/30">
                  <ArrowUpCircle className="mb-2 text-slate-300" size={28} />
                  <p className="text-sm font-medium text-violet-600">
                    Subir imagen
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    PNG, JPG o WEBP (Máx. 2MB)
                  </p>
                  <p className="text-xs text-slate-400">
                    Recomendado: 800x800px
                  </p>
                </div>
              </div>

              {/* Panel 2: Vista previa */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Vista previa
                </h3>
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Package className="text-slate-300" size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {name || "Nombre del producto"}
                      </p>
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        {isEditMode ? "Editando" : "Nuevo"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      SKU: {sku || "--"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Categoría: {categoryName || "--"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel 3: Resumen del producto */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Resumen del producto
                </h3>
                <dl className="space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Precio de compra</dt>
                    <dd className="text-xs font-medium text-slate-950">
                      AR$ {formatMoney(costNum)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">
                      Margen de ganancia
                    </dt>
                    <dd className="text-xs font-semibold text-emerald-600">
                      {marginNum.toFixed(1)}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Precio de venta</dt>
                    <dd className="text-xs font-semibold text-emerald-600">
                      AR$ {formatMoney(saleNum)}
                    </dd>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between">
                      <dt className="text-xs text-slate-500">
                        Ganancia por unidad
                      </dt>
                      <dd
                        className={`text-xs font-semibold ${
                          profitPerUnit >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        AR$ {formatMoney(profitPerUnit)}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Panel 4: Inventario */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-950">
                  Inventario
                </h3>
                <dl className="space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Stock actual</dt>
                    <dd className="text-xs font-medium text-slate-950">
                      {stockNum} unidades
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">Stock mínimo</dt>
                    <dd className="text-xs font-medium text-slate-950">
                      {minStockNum} unidades
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-slate-500">
                      Alerta de stock bajo
                    </dt>
                    <dd className="text-xs font-medium text-slate-950">
                      {stockAlertNum} unidades
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Panel 5: Info */}
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Info className="text-violet-600" size={14} />
                  <h3 className="text-sm font-semibold text-violet-900">
                    Información
                  </h3>
                </div>
                <p className="text-xs text-violet-700">
                  Los campos marcados con * son obligatorios. Puedes editar esta
                  información en cualquier momento desde la lista de productos.
                </p>
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

type FormFieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  tooltip?: string;
  children: ReactNode;
};

function FormField({
  label,
  htmlFor,
  required,
  tooltip,
  children
}: FormFieldProps) {
  return (
    <div>
      <label
        className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700"
        htmlFor={htmlFor}
      >
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
        {tooltip ? (
          <span className="group relative ml-0.5 cursor-default">
            <Info className="text-slate-400" size={12} />
            <span className="absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
              {tooltip}
            </span>
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
