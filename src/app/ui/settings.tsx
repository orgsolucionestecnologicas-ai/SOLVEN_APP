"use client";

import {
  Bell,
  Building,
  Camera,
  CheckCircle,
  CheckCircle2,
  Cloud,
  CreditCard,
  Crown,
  Download,
  FileText,
  Layers,
  Lock,
  Percent,
  Plug,
  Settings as SettingsIcon,
  Shield,
  Store,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoreInfo = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
};

type RegionalConfig = {
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;
};

type TogglesConfig = {
  printer: boolean;
  sounds: boolean;
  darkMode: boolean;
  desktopNotifications: boolean;
};

type Category = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STORE_KEY = "solven_settings_store";
const REGIONAL_KEY = "solven_settings_regional";
const TOGGLES_KEY = "solven_settings_toggles";

const DEFAULT_STORE: StoreInfo = {
  businessName: "SOLVEN",
  ownerName: "Propietario",
  phone: "",
  email: "",
  address: "",
  taxId: ""
};

const DEFAULT_REGIONAL: RegionalConfig = {
  currency: "DOP",
  timezone: "America/Santo_Domingo",
  dateFormat: "DD/MM/YYYY",
  language: "es"
};

const DEFAULT_TOGGLES: TogglesConfig = {
  printer: false,
  sounds: true,
  darkMode: false,
  desktopNotifications: false
};

const CATEGORIES: Category[] = [
  { id: "general", label: "General", icon: Store },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "pagos", label: "Métodos de pago", icon: CreditCard },
  { id: "descuentos", label: "Descuentos", icon: Percent },
  { id: "nube", label: "Nube y respaldo", icon: Cloud },
  { id: "sucursales", label: "Sucursales", icon: Building },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "inventario", label: "Inventario", icon: Layers },
  { id: "notificaciones", label: "Notificaciones", icon: Bell },
  { id: "integraciones", label: "Integraciones", icon: Plug },
  { id: "sistema", label: "Sistema", icon: SettingsIcon },
  { id: "seguridad", label: "Seguridad", icon: Shield }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS<T>(key: string, value: T) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? "bg-violet-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Quick Cards ──────────────────────────────────────────────────────────────

function QuickCards({ onNavigate }: { onNavigate: (id: string) => void }) {
  const cards = [
    { label: "Versión", value: "1.0.0", sub: "MVP", icon: Crown, color: "bg-violet-50 text-violet-600", action: "sistema" },
    { label: "Plan activo", value: "MVP", sub: "Gratuito", icon: CheckCircle, color: "bg-emerald-50 text-emerald-600", action: "sistema" },
    { label: "Sucursales", value: "1", sub: "Activa", icon: Building, color: "bg-blue-50 text-blue-600", action: "sucursales" },
    { label: "Usuarios", value: "1", sub: "Administrador", icon: Users, color: "bg-amber-50 text-amber-600", action: "usuarios" },
    { label: "Estado", value: "Activo", sub: "Sin alertas", icon: CheckCircle2, color: "bg-teal-50 text-teal-600", action: "sistema" }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onNavigate(card.action)}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${card.color}`}>
            <card.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">{card.label}</p>
            <p className="text-sm font-semibold text-slate-900">{card.value}</p>
            <p className="truncate text-xs text-slate-400">{card.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── General Section ──────────────────────────────────────────────────────────

function GeneralSection() {
  const [store, setStore] = useState<StoreInfo>(DEFAULT_STORE);
  const [regional, setRegional] = useState<RegionalConfig>(DEFAULT_REGIONAL);
  const [toggles, setToggles] = useState<TogglesConfig>(DEFAULT_TOGGLES);
  const [storeSaved, setStoreSaved] = useState(false);

  useEffect(() => {
    setStore(loadLS(STORE_KEY, DEFAULT_STORE));
    setRegional(loadLS(REGIONAL_KEY, DEFAULT_REGIONAL));
    setToggles(loadLS(TOGGLES_KEY, DEFAULT_TOGGLES));
  }, []);

  function handleStoreChange(field: keyof StoreInfo, value: string) {
    setStore((prev) => ({ ...prev, [field]: value }));
  }

  function handleStoreSubmit(e: FormEvent) {
    e.preventDefault();
    saveLS(STORE_KEY, store);
    saveLS(REGIONAL_KEY, regional);
    setStoreSaved(true);
    setTimeout(() => setStoreSaved(false), 2500);
  }

  function handleToggle(field: keyof TogglesConfig, value: boolean) {
    const next = { ...toggles, [field]: value };
    setToggles(next);
    saveLS(TOGGLES_KEY, next);
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";
  const selectCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-600";

  return (
    <div className="space-y-6">
      {/* Store info */}
      <form onSubmit={handleStoreSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Información del negocio</h3>
          <p className="mt-0.5 text-xs text-slate-500">Datos generales visibles en recibos y reportes.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Nombre del negocio</label>
            <input
              className={inputCls}
              value={store.businessName}
              onChange={(e) => handleStoreChange("businessName", e.target.value)}
              placeholder="Nombre del negocio"
            />
          </div>
          <div>
            <label className={labelCls}>Propietario</label>
            <input
              className={inputCls}
              value={store.ownerName}
              onChange={(e) => handleStoreChange("ownerName", e.target.value)}
              placeholder="Nombre del propietario"
            />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input
              className={inputCls}
              value={store.phone}
              onChange={(e) => handleStoreChange("phone", e.target.value)}
              placeholder="809-000-0000"
              type="tel"
            />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input
              className={inputCls}
              value={store.email}
              onChange={(e) => handleStoreChange("email", e.target.value)}
              placeholder="negocio@correo.com"
              type="email"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Dirección</label>
            <input
              className={inputCls}
              value={store.address}
              onChange={(e) => handleStoreChange("address", e.target.value)}
              placeholder="Calle, ciudad, provincia"
            />
          </div>
          <div>
            <label className={labelCls}>RNC / Identificación fiscal</label>
            <input
              className={inputCls}
              value={store.taxId}
              onChange={(e) => handleStoreChange("taxId", e.target.value)}
              placeholder="000-00000-0"
            />
          </div>
        </div>

        {/* Regional config */}
        <div className="border-t border-slate-100 px-6 pb-5 pt-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Configuración regional</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Moneda</label>
              <select
                className={selectCls}
                value={regional.currency}
                onChange={(e) => setRegional((r) => ({ ...r, currency: e.target.value }))}
              >
                <option value="DOP">DOP – Peso Dominicano</option>
                <option value="USD">USD – Dólar Estadounidense</option>
                <option value="EUR">EUR – Euro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Zona horaria</label>
              <select
                className={selectCls}
                value={regional.timezone}
                onChange={(e) => setRegional((r) => ({ ...r, timezone: e.target.value }))}
              >
                <option value="America/Santo_Domingo">América/Santo Domingo (UTC-4)</option>
                <option value="America/New_York">América/Nueva York (UTC-5)</option>
                <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                <option value="America/Mexico_City">América/Ciudad de México (UTC-6)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Formato de fecha</label>
              <select
                className={selectCls}
                value={regional.dateFormat}
                onChange={(e) => setRegional((r) => ({ ...r, dateFormat: e.target.value }))}
              >
                <option value="DD/MM/YYYY">DD/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/DD/AAAA</option>
                <option value="YYYY-MM-DD">AAAA-MM-DD</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Idioma</label>
              <select
                className={selectCls}
                value={regional.language}
                onChange={(e) => setRegional((r) => ({ ...r, language: e.target.value }))}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          {storeSaved ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cambios guardados
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Toggles */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Preferencias del sistema</h3>
          <p className="mt-0.5 text-xs text-slate-500">Se guardan automáticamente.</p>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { key: "printer" as const, label: "Impresora activa", sub: "Habilita la impresión automática de recibos" },
            { key: "sounds" as const, label: "Sonidos del sistema", sub: "Alertas de audio al completar acciones" },
            { key: "darkMode" as const, label: "Modo oscuro", sub: "Cambia la apariencia de la interfaz (próximamente)" },
            { key: "desktopNotifications" as const, label: "Notificaciones de escritorio", sub: "Alertas del navegador para eventos importantes" }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
              </div>
              <ToggleSwitch checked={toggles[item.key]} onChange={(v) => handleToggle(item.key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Seguridad Section ────────────────────────────────────────────────────────

function SeguridadSection() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("La nueva contraseña y la confirmación no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setErrorMessage(body.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setSuccessMessage("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage("No se pudo cambiar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-600";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Cambiar contraseña</h3>
          <p className="mt-0.5 text-xs text-slate-500">Actualiza tu contraseña de acceso al sistema.</p>
        </div>
        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
                <p className="mt-0.5 text-xs text-emerald-700">El cambio se aplica hasta reiniciar el servidor.</p>
              </div>
            </div>
          )}
          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-800">{errorMessage}</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="current-password">Contraseña actual</label>
              <input
                autoComplete="current-password"
                className={inputCls}
                disabled={isSubmitting}
                id="current-password"
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                required
                type="password"
                value={currentPassword}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="new-password">Nueva contraseña</label>
              <input
                autoComplete="new-password"
                className={inputCls}
                disabled={isSubmitting}
                id="new-password"
                minLength={6}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                type="password"
                value={newPassword}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="confirm-password">Confirmar nueva contraseña</label>
              <input
                autoComplete="new-password"
                className={inputCls}
                disabled={isSubmitting}
                id="confirm-password"
                minLength={6}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                type="password"
                value={confirmPassword}
              />
            </div>
          </div>
          <div className="pt-1">
            <button
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 focus:outline-none"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>

      {/* Session */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Sesión activa</h3>
          <p className="mt-0.5 text-xs text-slate-500">Cierra la sesión en este dispositivo.</p>
        </div>
        <div className="px-6 py-5">
          <button
            className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none"
            onClick={handleLogout}
            type="button"
          >
            <Lock className="h-3.5 w-3.5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sistema Section ──────────────────────────────────────────────────────────

function SistemaSection() {
  const rows = [
    { label: "Versión del sistema", value: "1.0.0" },
    { label: "Plan", value: "MVP" },
    { label: "Framework", value: "Next.js 15 (App Router)" },
    { label: "Base de datos", value: "SQLite · Prisma ORM" },
    { label: "Autenticación", value: "JWT · bcrypt" },
    { label: "Estado del sistema", value: "Operativo" },
    { label: "Entorno", value: "Producción local" }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Información del sistema</h3>
          <p className="mt-0.5 text-xs text-slate-500">Detalles técnicos de la instalación actual.</p>
        </div>
        <dl className="divide-y divide-slate-50">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-6 py-3.5">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className={`text-sm font-medium ${value === "Operativo" ? "text-emerald-600" : "text-slate-900"}`}>
                {value === "Operativo" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    {value}
                  </span>
                ) : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600" />
          <div>
            <p className="text-sm font-semibold text-violet-900">SOLVEN MVP</p>
            <p className="mt-1 text-xs text-violet-700">
              Sistema de punto de venta diseñado para pequeños y medianos negocios. Incluye gestión de ventas, inventario, caja, créditos y reportes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Próximamente placeholder ─────────────────────────────────────────────────

function ComingSoonSection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <SettingsIcon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">Esta sección estará disponible próximamente.</p>
    </div>
  );
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function RightSidebar({ activeCategory }: { activeCategory: string }) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  const store = loadLS<StoreInfo>(STORE_KEY, DEFAULT_STORE);

  return (
    <aside className="flex flex-col gap-4">
      {/* Logo upload */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Logo del negocio</p>
        <label
          htmlFor="logo-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-6 text-center transition-colors hover:border-violet-300 hover:bg-violet-50"
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain" />
          ) : (
            <>
              <Camera className="h-7 w-7 text-slate-300" />
              <span className="text-xs text-slate-500">Subir logo</span>
              <span className="text-xs text-slate-400">PNG, JPG hasta 2 MB</span>
            </>
          )}
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
        {logoPreview && (
          <button
            type="button"
            onClick={() => setLogoPreview(null)}
            className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600"
          >
            Quitar logo
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones rápidas</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-400" />
            Exportar / Imprimir
          </button>
        </div>
      </div>

      {/* System info summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen</p>
        <div className="space-y-2.5">
          {[
            { label: "Negocio", value: store.businessName || "—" },
            { label: "Versión", value: "1.0.0" },
            { label: "Plan", value: "MVP" },
            { label: "Sección activa", value: CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "—" }
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs font-medium text-slate-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

export function Settings() {
  const [activeCategory, setActiveCategory] = useState("general");

  function renderContent() {
    switch (activeCategory) {
      case "general":
        return <GeneralSection />;
      case "seguridad":
        return <SeguridadSection />;
      case "sistema":
        return <SistemaSection />;
      default: {
        const cat = CATEGORIES.find((c) => c.id === activeCategory);
        return <ComingSoonSection label={cat?.label ?? "Esta sección"} />;
      }
    }
  }

  const activeLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <SettingsIcon className="h-4 w-4" />
          <span>Configuración</span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-900">{activeLabel}</span>
        </div>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Configuración</h1>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        {/* Quick cards */}
        <div className="mb-6">
          <QuickCards onNavigate={setActiveCategory} />
        </div>

        {/* 3-column layout */}
        <div className="flex gap-5">
          {/* Left sidebar — categories */}
          <nav className="hidden w-52 flex-shrink-0 lg:block">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-3 py-3">
                {CATEGORIES.map((cat) => {
                  const isActive = cat.id === activeCategory;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-violet-50 font-semibold text-violet-700"
                          : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <cat.icon
                        className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-violet-600" : "text-slate-400"}`}
                      />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Mobile category select */}
          <div className="mb-4 w-full lg:hidden">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Center content */}
          <main className="min-w-0 flex-1">{renderContent()}</main>

          {/* Right sidebar */}
          <div className="hidden w-56 flex-shrink-0 xl:block">
            <RightSidebar activeCategory={activeCategory} />
          </div>
        </div>
      </div>
    </div>
  );
}
