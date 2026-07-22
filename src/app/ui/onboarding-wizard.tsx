"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Store,
  Package,
  CreditCard,
  UserPlus,
  CheckCircle
} from "lucide-react";

type Item = { name: string; price: string; stock: string };

const emptyItem = (): Item => ({ name: "", price: "", stock: "0" });

const BUSINESS_TYPES = [
  "Almacén / Kiosco",
  "Indumentaria",
  "Ferretería",
  "Farmacia",
  "Librería / Papelería",
  "Gastronomía",
  "Otro"
];

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "billetera", label: "Billetera virtual" }
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [businessType, setBusinessType] = useState("");

  const [itemType, setItemType] = useState<"producto" | "servicio">("producto");
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState("efectivo");

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSkipped, setInviteSkipped] = useState(false);

  const [openingBalance, setOpeningBalance] = useState("0");
  const [cashOpened, setCashOpened] = useState(false);

  function addItem() {
    if (items.length < 5) setItems((p) => [...p, emptyItem()]);
  }

  function updateItem(i: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  function removeItem(i: number) {
    if (items.length > 1) setItems((p) => p.filter((_, idx) => idx !== i));
  }

  async function skipAll() {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } finally {
      router.push("/dashboard");
    }
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
        body: JSON.stringify({
          businessName: businessName.trim(),
          currency,
          businessType,
          preferredPaymentMethod
        })
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
    const valid = items.filter((it) => it.name.trim() && Number(it.price) > 0);
    if (valid.length === 0) {
      setError(`Agregá al menos un ${itemType} con nombre y precio.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (itemType === "producto") {
        await Promise.all(
          valid.map((it) =>
            fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: it.name.trim(),
                costPrice: Number(it.price),
                salePrice: Number(it.price),
                stock: Number(it.stock) || 0,
                categoryName: "Otros"
              })
            })
          )
        );
      } else {
        await Promise.all(
          valid.map((it) =>
            fetch("/api/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: it.name.trim(), price: Number(it.price) })
            })
          )
        );
      }
      setStep(3);
    } catch {
      setError(`Error al cargar los ${itemType}s. Intentá de nuevo.`);
    } finally {
      setLoading(false);
    }
  }

  async function submitStep3() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          currency,
          businessType,
          preferredPaymentMethod
        })
      });
      if (!res.ok) throw new Error();
      setStep(4);
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function submitStep4Invite() {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      setError("Completá nombre, email y contraseña para invitar al usuario.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword,
          role: "CASHIER"
        })
      });
      if (!res.ok) throw new Error();
      setInviteSent(true);
      setStep(5);
    } catch {
      setError("No se pudo invitar al usuario. Podés hacerlo después desde Usuarios.");
    } finally {
      setLoading(false);
    }
  }

  function skipStep4() {
    setInviteSkipped(true);
    setError(null);
    setStep(5);
  }

  async function openCashRegister() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashierName: "Propietario",
          openingAmount: Number(openingBalance) || 0
        })
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

  async function finish() {
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
        <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl mb-4">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Bienvenido a SOLVEN</h1>
        <p className="text-gray-400 mt-1 text-sm">Configuración inicial — {step} de 5</p>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-violet-600" : "bg-gray-700"
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
              <Store className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Tu negocio</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre del negocio *</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ej: Almacén Don Pepe"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Rubro</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
              >
                <option value="">Seleccioná un rubro</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
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
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Guardando..." : "Continuar"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Tu primer producto o servicio</h2>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setItemType("producto")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  itemType === "producto"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
              >
                Producto
              </button>
              <button
                onClick={() => setItemType("servicio")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  itemType === "servicio"
                    ? "bg-violet-600 text-white"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
              >
                Servicio
              </button>
            </div>

            <p className="text-sm text-gray-400">
              Cargá al menos 1 {itemType} para empezar. Podés agregar más después.
            </p>

            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder={itemType === "producto" ? `Producto ${i + 1}` : `Servicio ${i + 1}`}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItem(i, "price", e.target.value)}
                      placeholder="Precio"
                      min="0"
                      className="w-1/2 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
                    />
                    {itemType === "producto" && (
                      <input
                        type="number"
                        value={it.stock}
                        onChange={(e) => updateItem(i, "stock", e.target.value)}
                        placeholder="Stock"
                        min="0"
                        className="w-1/2 bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
                      />
                    )}
                  </div>
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="mt-2 text-gray-500 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {items.length < 5 && (
              <button
                onClick={addItem}
                className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                + Agregar otro {itemType}
              </button>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
              <button
                onClick={submitStep2}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
              >
                {loading ? "Guardando..." : "Continuar"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Forma de pago preferida</h2>
            </div>

            <p className="text-sm text-gray-400">
              ¿Cómo cobrás la mayoría de tus ventas? Podés aceptar todas igual, esto es solo para
              configurar el valor por defecto.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPreferredPaymentMethod(m.value)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    preferredPaymentMethod === m.value
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
              <button
                onClick={submitStep3}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
              >
                {loading ? "Guardando..." : "Continuar"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Invitá a un usuario</h2>
            </div>

            <p className="text-sm text-gray-400">
              Opcional. Podés invitar a un cajero ahora o hacerlo después desde Usuarios.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nombre"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
              />
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
              />
            </div>

            <button
              onClick={submitStep4Invite}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Invitando..." : "Invitar y continuar"}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Atrás
              </button>
              <button
                onClick={skipStep4}
                className="flex-1 text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                Saltear por ahora
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Resumen</h2>
            </div>

            <ul className="text-sm text-gray-300 space-y-1.5 bg-gray-800/60 rounded-lg px-4 py-3">
              <li>
                Negocio: <span className="text-white">{businessName || "—"}</span>
                {businessType ? ` (${businessType})` : ""}
              </li>
              <li>
                {itemType === "producto" ? "Productos" : "Servicios"} cargados:{" "}
                <span className="text-white">
                  {items.filter((it) => it.name.trim() && Number(it.price) > 0).length}
                </span>
              </li>
              <li>
                Forma de pago preferida:{" "}
                <span className="text-white">
                  {PAYMENT_METHODS.find((m) => m.value === preferredPaymentMethod)?.label}
                </span>
              </li>
              <li>
                Usuario invitado:{" "}
                <span className="text-white">
                  {inviteSent ? inviteEmail : inviteSkipped ? "Omitido" : "—"}
                </span>
              </li>
            </ul>

            {!cashOpened ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  Opcional: ingresá el monto inicial en caja para arrancar a vender.
                </p>
                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-violet-500 text-sm"
                />
                <button
                  onClick={openCashRegister}
                  disabled={loading}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
                >
                  {loading ? "Abriendo caja..." : "Abrir caja"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-green-400 text-center">Caja abierta ✓</p>
            )}

            <button
              onClick={finish}
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
            >
              {loading ? "Entrando..." : "Empezar a vender →"}
            </button>
          </div>
        )}

        {step < 5 && (
          <button
            onClick={skipAll}
            disabled={loading}
            className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors mt-4"
          >
            Saltear configuración y empezar a vender
          </button>
        )}
      </div>
    </div>
  );
}
