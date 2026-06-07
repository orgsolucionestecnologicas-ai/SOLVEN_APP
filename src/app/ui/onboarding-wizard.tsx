"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Store, Package, Wallet, CheckCircle } from "lucide-react";

type Product = { name: string; price: string; stock: string };

const emptyProduct = (): Product => ({ name: "", price: "", stock: "0" });

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("ARS");

  const [products, setProducts] = useState<Product[]>([emptyProduct()]);

  const [cashOpened, setCashOpened] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");

  function addProduct() {
    if (products.length < 5) setProducts((p) => [...p, emptyProduct()]);
  }

  function updateProduct(i: number, field: keyof Product, value: string) {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }

  function removeProduct(i: number) {
    if (products.length > 1) setProducts((p) => p.filter((_, idx) => idx !== i));
  }

  async function submitStep1() {
    if (!businessName.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), currency }),
      });
      if (!res.ok) throw new Error();
      setStep(2);
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function submitStep2() {
    const valid = products.filter((p) => p.name.trim() && Number(p.price) > 0);
    if (valid.length === 0) {
      setError("Agregá al menos un producto con nombre y precio.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.all(
        valid.map((p) =>
          fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name.trim(),
              costPrice: Number(p.price),
              salePrice: Number(p.price),
              stock: Number(p.stock) || 0,
              categoryName: "Otros",
            }),
          })
        )
      );
      setStep(3);
    } catch {
      setError("Error al cargar los productos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function submitStep3() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierName: "Propietario",
          openingAmount: Number(openingBalance) || 0,
        }),
      });
      // 409 = ya hay una caja abierta, tratar como éxito
      if (!res.ok && res.status !== 409) throw new Error();
      setCashOpened(true);
    } catch {
      setError("No se pudo abrir la caja. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } finally {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-4">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Bienvenido a SOLVEN</h1>
        <p className="text-gray-400 mt-1 text-sm">Configuración inicial — {step} de 3</p>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-orange-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-900/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <Store className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Tu negocio</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre del negocio *</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Almacén Don Pepe"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
              >
                <option value="ARS">ARS — Peso argentino</option>
                <option value="USD">USD — Dólar</option>
                <option value="UYU">UYU — Peso uruguayo</option>
                <option value="CLP">CLP — Peso chileno</option>
              </select>
            </div>

            <button
              onClick={submitStep1}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Guardando..." : "Continuar"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Tus primeros productos</h2>
            </div>

            <p className="text-sm text-gray-400">
              Cargá al menos 1 producto para empezar. Podés agregar más después.
            </p>

            {products.map((p, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updateProduct(i, "name", e.target.value)}
                    placeholder={`Producto ${i + 1}`}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => updateProduct(i, "price", e.target.value)}
                      placeholder="Precio"
                      min="0"
                      className="w-1/2 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                    />
                    <input
                      type="number"
                      value={p.stock}
                      onChange={(e) => updateProduct(i, "stock", e.target.value)}
                      placeholder="Stock"
                      min="0"
                      className="w-1/2 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                </div>
                {products.length > 1 && (
                  <button
                    onClick={() => removeProduct(i)}
                    className="mt-2 text-gray-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {products.length < 5 && (
              <button
                onClick={addProduct}
                className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                + Agregar otro producto
              </button>
            )}

            <button
              onClick={submitStep2}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm mt-2"
            >
              {loading ? "Guardando..." : "Continuar"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && !cashOpened && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Abrí la primera caja</h2>
            </div>

            <p className="text-sm text-gray-400">
              Ingresá el monto inicial en caja (el efectivo que tenés para dar cambio).
              Podés poner 0 si no querés registrarlo ahora.
            </p>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Monto inicial en caja</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            <button
              onClick={submitStep3}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Abriendo caja..." : "Abrir caja y continuar"}
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCashOpened(true)}
              className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
            >
              Saltear por ahora
            </button>
          </div>
        )}

        {step === 3 && cashOpened && (
          <div className="text-center space-y-6 py-4">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">¡Todo listo!</h2>
              <p className="text-gray-400 text-sm">
                Tu negocio está configurado. Empezá a usar SOLVEN.
              </p>
            </div>
            <button
              onClick={complete}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Entrando..." : "Ir al dashboard →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
