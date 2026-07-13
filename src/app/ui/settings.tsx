"use client";

import {
  Bell,
  Building,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CreditCard,
  Crown,
  Download,
  FileText,
  History,
  Layers,
  Lock,
  Percent,
  Plug,
  Receipt,
  Settings as SettingsIcon,
  Shield,
  Store,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

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

type DbSettings = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;
  printerEnabled: boolean;
  soundsEnabled: boolean;
  darkMode: boolean;
  desktopNotifications: boolean;
};

type SectionGroupId = "negocio" | "fiscal" | "sistema";

type Category = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  group: SectionGroupId;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_STORE: StoreInfo = {
  businessName: "SOLVEN",
  ownerName: "Propietario",
  phone: "",
  email: "",
  address: "",
  taxId: ""
};

const DEFAULT_REGIONAL: RegionalConfig = {
  currency: "ARS",
  timezone: "America/Argentina/Buenos_Aires",
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
  { id: "general", label: "General", icon: Store, group: "negocio" },
  { id: "usuarios", label: "Usuarios", icon: Users, group: "negocio" },
  { id: "pagos", label: "Métodos de pago", icon: CreditCard, group: "negocio" },
  { id: "descuentos", label: "Descuentos", icon: Percent, group: "negocio" },
  { id: "sucursales", label: "Sucursales", icon: Building, group: "negocio" },
  { id: "inventario", label: "Inventario", icon: Layers, group: "negocio" },
  { id: "documentos", label: "Documentos", icon: FileText, group: "fiscal" },
  { id: "arca", label: "Facturación Electrónica", icon: Receipt, group: "fiscal" },
  { id: "nube", label: "Nube y respaldo", icon: Cloud, group: "sistema" },
  { id: "notificaciones", label: "Notificaciones", icon: Bell, group: "sistema" },
  { id: "integraciones", label: "Integraciones", icon: Plug, group: "sistema" },
  { id: "sistema", label: "Sistema", icon: SettingsIcon, group: "sistema" },
  { id: "seguridad", label: "Seguridad", icon: Shield, group: "sistema" },
  { id: "auditoria", label: "Auditoría", icon: History, group: "sistema" }
];

const SECTION_GROUPS: { id: SectionGroupId; label: string }[] = [
  { id: "negocio", label: "Negocio" },
  { id: "fiscal", label: "Fiscal" },
  { id: "sistema", label: "Sistema" }
];

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

function GeneralSection({ onBusinessNameChange }: { onBusinessNameChange: (name: string) => void }) {
  const [store, setStore] = useState<StoreInfo>(DEFAULT_STORE);
  const [regional, setRegional] = useState<RegionalConfig>(DEFAULT_REGIONAL);
  const [toggles, setToggles] = useState<TogglesConfig>(DEFAULT_TOGGLES);
  const [storeSaved, setStoreSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const onBusinessNameChangeRef = useRef(onBusinessNameChange);
  onBusinessNameChangeRef.current = onBusinessNameChange;

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((body: { data?: DbSettings }) => {
        if (body.data) {
          const d = body.data;
          setStore({ businessName: d.businessName, ownerName: d.ownerName, phone: d.phone, email: d.email, address: d.address, taxId: d.taxId });
          setRegional({ currency: d.currency, timezone: d.timezone, dateFormat: d.dateFormat, language: d.language });
          setToggles({ printer: d.printerEnabled, sounds: d.soundsEnabled, darkMode: d.darkMode, desktopNotifications: d.desktopNotifications });
          onBusinessNameChangeRef.current(d.businessName);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function buildPayload(storeData: StoreInfo, regionalData: RegionalConfig, togglesData: TogglesConfig) {
    return {
      ...storeData,
      ...regionalData,
      printerEnabled: togglesData.printer,
      soundsEnabled: togglesData.sounds,
      darkMode: togglesData.darkMode,
      desktopNotifications: togglesData.desktopNotifications
    };
  }

  function handleStoreChange(field: keyof StoreInfo, value: string) {
    setStore((prev) => ({ ...prev, [field]: value }));
  }

  async function handleStoreSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(store, regional, toggles))
      });
      if (!res.ok) throw new Error();
      onBusinessNameChangeRef.current(store.businessName);
      setStoreSaved(true);
      setTimeout(() => setStoreSaved(false), 2500);
    } catch {
      setSaveError("Ocurrió un error. Intenta de nuevo.");
    }
  }

  async function handleToggle(field: keyof TogglesConfig, value: boolean) {
    const next = { ...toggles, [field]: value };
    setToggles(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(store, regional, next))
      });
    } catch {
      setToggles(toggles);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-50";
  const selectCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-50";
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
              disabled={loading}
              onChange={(e) => handleStoreChange("businessName", e.target.value)}
              placeholder="Nombre del negocio"
            />
          </div>
          <div>
            <label className={labelCls}>Propietario</label>
            <input
              className={inputCls}
              value={store.ownerName}
              disabled={loading}
              onChange={(e) => handleStoreChange("ownerName", e.target.value)}
              placeholder="Nombre del propietario"
            />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input
              className={inputCls}
              value={store.phone}
              disabled={loading}
              onChange={(e) => handleStoreChange("phone", e.target.value)}
              placeholder="11-0000-0000"
              type="tel"
            />
          </div>
          <div>
            <label className={labelCls}>Correo electrónico</label>
            <input
              className={inputCls}
              value={store.email}
              disabled={loading}
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
              disabled={loading}
              onChange={(e) => handleStoreChange("address", e.target.value)}
              placeholder="Calle, ciudad, provincia"
            />
          </div>
          <div>
            <label className={labelCls}>CUIT / Identificación fiscal</label>
            <input
              className={inputCls}
              value={store.taxId}
              disabled={loading}
              onChange={(e) => handleStoreChange("taxId", e.target.value)}
              placeholder="20-00000000-0"
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
                disabled={loading}
                value={regional.currency}
                onChange={(e) => setRegional((r) => ({ ...r, currency: e.target.value }))}
              >
                <option value="ARS">ARS – Peso Argentino</option>
                <option value="USD">USD – Dólar Estadounidense</option>
                <option value="EUR">EUR – Euro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Zona horaria</label>
              <select
                className={selectCls}
                disabled={loading}
                value={regional.timezone}
                onChange={(e) => setRegional((r) => ({ ...r, timezone: e.target.value }))}
              >
                <option value="America/Argentina/Buenos_Aires">América/Buenos Aires (UTC-3)</option>
                <option value="America/New_York">América/Nueva York (UTC-5)</option>
                <option value="America/Bogota">América/Bogotá (UTC-5)</option>
                <option value="America/Mexico_City">América/Ciudad de México (UTC-6)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Formato de fecha</label>
              <select
                className={selectCls}
                disabled={loading}
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
                disabled={loading}
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
          {saveError ? (
            <span className="text-xs font-medium text-rose-600">{saveError}</span>
          ) : storeSaved ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cambios guardados
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 focus:outline-none"
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
              <ToggleSwitch
                checked={toggles[item.key]}
                onChange={(v) => { if (!loading) handleToggle(item.key, v); }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Documentos Section ───────────────────────────────────────────────────────

function TicketPreview({
  businessName,
  logoUrl,
  receiptThankYouMessage,
  receiptFooterMessage
}: {
  businessName: string;
  logoUrl: string;
  receiptThankYouMessage: string;
  receiptFooterMessage: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Vista previa del ticket</h3>
        <p className="mt-0.5 text-xs text-slate-500">Se actualiza mientras editás los campos.</p>
      </div>
      <div className="flex justify-center px-6 py-5">
        <div
          className="w-full max-w-[260px] border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-sm"
          style={{ fontFamily: "monospace" }}
        >
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Logo"
              className="mx-auto mb-2 max-h-16 max-w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              src={logoUrl}
            />
          )}
          <p className="text-center text-sm font-bold">{businessName || "SOLVEN"}</p>
          <div className="my-2 border-t border-dashed border-slate-300" />
          <p className="text-xs">Producto de ejemplo x1 — $1000</p>
          <p className="text-xs">Otro producto x2 — $2500</p>
          <div className="my-2 border-t border-dashed border-slate-300" />
          <p className="text-xs font-bold">TOTAL — $3500</p>
          <div className="my-2 border-t border-dashed border-slate-300" />
          {receiptThankYouMessage && <p className="text-center text-xs">{receiptThankYouMessage}</p>}
          {receiptFooterMessage && <p className="mt-1 text-center text-[11px] text-slate-500">{receiptFooterMessage}</p>}
        </div>
      </div>
    </div>
  );
}

function DocumentosSection() {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [receiptFooterMessage, setReceiptFooterMessage] = useState("");
  const [receiptThankYouMessage, setReceiptThankYouMessage] = useState("¡Gracias por su compra!");
  const [initialReceiptNumber, setInitialReceiptNumber] = useState("0");
  const [defaultIvaRate, setDefaultIvaRate] = useState(0.21);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((body: { data?: Record<string, unknown> }) => {
        if (body.data) {
          setRaw(body.data);
          setLogoUrl(typeof body.data.logoUrl === "string" ? body.data.logoUrl : "");
          setReceiptFooterMessage(typeof body.data.receiptFooterMessage === "string" ? body.data.receiptFooterMessage : "");
          setReceiptThankYouMessage(
            typeof body.data.receiptThankYouMessage === "string" ? body.data.receiptThankYouMessage : "¡Gracias por su compra!"
          );
          setInitialReceiptNumber(
            typeof body.data.initialReceiptNumber === "number" ? String(body.data.initialReceiptNumber) : "0"
          );
          setDefaultIvaRate(typeof body.data.defaultIvaRate === "number" ? body.data.defaultIvaRate : 0.21);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...raw,
          logoUrl,
          receiptFooterMessage,
          receiptThankYouMessage,
          initialReceiptNumber: Number(initialReceiptNumber) || 0,
          defaultIvaRate
        })
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-50";
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-600";

  const businessName = typeof raw?.businessName === "string" ? raw.businessName : "SOLVEN";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Personalización del ticket</h3>
        <p className="mt-0.5 text-xs text-slate-500">Logo, pie de página y mensaje de agradecimiento que se imprimen en cada ticket.</p>
      </div>
      <div className="space-y-4 px-6 py-5">
        <div>
          <label className={labelCls}>URL del logo</label>
          <input
            className={inputCls}
            disabled={loading}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://misitio.com/logo.png"
            type="text"
            value={logoUrl}
          />
        </div>
        <div>
          <label className={labelCls}>Mensaje de agradecimiento</label>
          <input
            className={inputCls}
            disabled={loading}
            onChange={(e) => setReceiptThankYouMessage(e.target.value)}
            placeholder="¡Gracias por su compra!"
            type="text"
            value={receiptThankYouMessage}
          />
        </div>
        <div>
          <label className={labelCls}>Pie de página</label>
          <input
            className={inputCls}
            disabled={loading}
            onChange={(e) => setReceiptFooterMessage(e.target.value)}
            placeholder="Ej. Cambios dentro de 10 días con ticket"
            type="text"
            value={receiptFooterMessage}
          />
        </div>
        <div>
          <label className={labelCls}>Número inicial de comprobante</label>
          <input
            className={inputCls}
            disabled={loading}
            min={0}
            onChange={(e) => setInitialReceiptNumber(e.target.value)}
            placeholder="0"
            type="number"
            value={initialReceiptNumber}
          />
          <p className="mt-1 text-xs text-slate-400">
            Solo aplica al primer comprobante que emitas (si migrás desde otro sistema y querés continuar la numeración). No afecta comprobantes ya emitidos.
          </p>
        </div>
        <div>
          <label className={labelCls}>IVA por defecto para productos nuevos</label>
          <select
            className={inputCls}
            disabled={loading}
            onChange={(e) => setDefaultIvaRate(parseFloat(e.target.value))}
            value={defaultIvaRate}
          >
            <option value={0.21}>21% — Alícuota general</option>
            <option value={0.105}>10,5% — Alícuota reducida</option>
            <option value={0.27}>27% — Alícuota incrementada</option>
            <option value={0}>0% / Exento</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Se usa como valor sugerido al crear un producto nuevo. No modifica el IVA de productos ya existentes.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        {error ? (
          <span className="text-xs font-medium text-rose-600">{error}</span>
        ) : saved ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Cambios guardados
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={loading || saving}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 focus:outline-none"
        >
          Guardar cambios
        </button>
      </div>
      </form>
      <div className="lg:col-span-1">
        <TicketPreview
          businessName={businessName}
          logoUrl={logoUrl}
          receiptThankYouMessage={receiptThankYouMessage}
          receiptFooterMessage={receiptFooterMessage}
        />
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
  const [role, setRole] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isActive = true;
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: { role?: string } }) => {
        if (isActive && body.data?.role) setRole(body.data.role);
      })
      .catch(() => {});
    return () => { isActive = false; };
  }, []);

  function handleDownloadBackup() {
    setIsDownloading(true);
    window.open("/api/export", "_blank");
    setTimeout(() => setIsDownloading(false), 1500);
  }

  const rows = [
    { label: "Versión del sistema", value: "1.0.0" },
    { label: "Plan", value: "MVP" },
    { label: "Framework", value: "Next.js 15 (App Router)" },
    { label: "Base de datos", value: "PostgreSQL · Prisma ORM" },
    { label: "Autenticación", value: "Cookie · HMAC" },
    { label: "Estado del sistema", value: "Operativo" },
    { label: "Entorno", value: "Producción" }
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

      {role === "OWNER" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Respaldo de datos</p>
              <p className="mt-1 text-xs text-slate-500">
                Descarga un archivo JSON con todos tus productos, clientes, ventas y configuración.
              </p>
              <button
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                disabled={isDownloading}
                onClick={handleDownloadBackup}
                type="button"
              >
                <Download size={14} />
                {isDownloading ? "Descargando…" : "Descargar respaldo"}
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Recomendado: realizar un respaldo antes de cambios importantes.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Auditoría Section ────────────────────────────────────────────────────────

type AuditLogRow = {
  id: string;
  userId: string;
  userCode: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user: { name: string };
};

type AuditUserOption = { id: string; userCode: string | null; name: string };

const AUDIT_ACTION_LABELS: Record<string, string> = {
  SALE_CREATED: "Venta registrada",
  CASH_REGISTER_OPENED: "Apertura de caja",
  CASH_REGISTER_CLOSED: "Cierre de caja",
  PRODUCT_CREATED: "Producto creado",
  PRODUCT_UPDATED: "Producto actualizado",
  PRODUCT_DELETED: "Producto eliminado",
  PRODUCT_PRICE_CHANGE: "Cambio de precio",
  INVENTORY_ADJUSTED: "Ajuste de inventario",
  USER_CREATED: "Usuario creado",
  USER_ROLE_CHANGED: "Cambio de rol",
  USER_DELETED: "Usuario eliminado"
};

function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

const auditDateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function AuditLogSection() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<AuditUserOption[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: AuditUserOption[] }) => {
        if (body.data) setUsers(body.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (actionFilter) params.set("action", actionFilter);
    if (userFilter) params.set("userId", userFilter);
    fetch(`/api/audit-logs?${params.toString()}`, { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: AuditLogRow[]; pagination?: { totalPages: number } }) => {
        if (!isActive) return;
        setLogs(body.data ?? []);
        setTotalPages(body.pagination?.totalPages ?? 1);
      })
      .catch(() => {
        if (isActive) setError("No se pudieron cargar los registros de auditoría.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => { isActive = false; };
  }, [page, actionFilter, userFilter]);

  const selectCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Registro de actividad</h3>
        <p className="mt-0.5 text-xs text-slate-500">Historial de acciones realizadas por los usuarios del negocio.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
        <select
          className={selectCls}
          onChange={(e) => { setPage(1); setUserFilter(e.target.value); }}
          value={userFilter}
        >
          <option value="">Todos los usuarios</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.userCode ? `${u.userCode} — ${u.name}` : u.name}</option>
          ))}
        </select>
        <select
          className={selectCls}
          onChange={(e) => { setPage(1); setActionFilter(e.target.value); }}
          value={actionFilter}
        >
          <option value="">Todas las acciones</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="px-6 py-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-2.5 font-medium">Fecha</th>
                <th className="px-6 py-2.5 font-medium">Usuario</th>
                <th className="px-6 py-2.5 font-medium">Acción</th>
                <th className="px-6 py-2.5 font-medium">Entidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-6 py-6 text-center text-slate-400" colSpan={4}>Cargando…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td className="px-6 py-6 text-center text-slate-400" colSpan={4}>Sin registros para los filtros seleccionados.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-3 text-slate-600">{auditDateFormatter.format(new Date(log.createdAt))}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{log.userCode ?? log.user.name}</td>
                    <td className="px-6 py-3 text-slate-600">{auditActionLabel(log.action)}</td>
                    <td className="px-6 py-3 text-slate-500">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notificaciones Section ───────────────────────────────────────────────────

type EmailAlertsConfig = {
  lowStockEmailAlerts: boolean;
  cashDifferenceEmailAlerts: boolean;
};

const DEFAULT_EMAIL_ALERTS: EmailAlertsConfig = {
  lowStockEmailAlerts: false,
  cashDifferenceEmailAlerts: false
};

function NotificacionesSection() {
  const [alerts, setAlerts] = useState<EmailAlertsConfig>(DEFAULT_EMAIL_ALERTS);
  const [fullSettings, setFullSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((body: { data?: Record<string, unknown> }) => {
        if (body.data) {
          setFullSettings(body.data);
          setAlerts({
            lowStockEmailAlerts: Boolean(body.data.lowStockEmailAlerts),
            cashDifferenceEmailAlerts: Boolean(body.data.cashDifferenceEmailAlerts)
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(field: keyof EmailAlertsConfig, value: boolean) {
    const next = { ...alerts, [field]: value };
    setAlerts(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fullSettings, ...next })
      });
    } catch {
      setAlerts(alerts);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Alertas por email</h3>
        <p className="mt-0.5 text-xs text-slate-500">Se envían al email del propietario de la cuenta.</p>
      </div>
      <div className="divide-y divide-slate-50">
        {[
          { key: "lowStockEmailAlerts" as const, label: "Stock crítico", sub: "Avisa cuando una venta deja un producto en stock mínimo o agotado" },
          { key: "cashDifferenceEmailAlerts" as const, label: "Diferencia de caja", sub: "Avisa cuando un cierre de caja tiene una diferencia con el monto esperado" }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
            </div>
            <ToggleSwitch
              checked={alerts[item.key]}
              onChange={(v) => { if (!loading) handleToggle(item.key, v); }}
            />
          </div>
        ))}
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

function RightSidebar({ activeCategory, businessName }: { activeCategory: string; businessName: string }) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

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
            { label: "Negocio", value: businessName || "—" },
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

// ─── Facturación ARCA ────────────────────────────────────────────────────────

function FacturacionARCASection() {
  const [loading, setLoading] = useState(true);
  const [arcaEnabled, setArcaEnabled] = useState(false);
  const [hasCert, setHasCert] = useState(false);
  const [cuit, setCuit] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("1");
  const [condicionIVA, setCondicionIVA] = useState("RI");
  const [ambiente, setAmbiente] = useState("homo");
  const [certPem, setCertPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingCert, setSavingCert] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((b) => {
        if (typeof b.data?.arcaEnabled === "boolean") setArcaEnabled(b.data.arcaEnabled as boolean);
      })
      .catch(() => {});

    fetch("/api/tenants/arca-config", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((b: { data?: { cuit?: string; puntoVenta?: number; condicionIVA?: string; ambiente?: string; hasCert?: boolean } }) => {
        if (b.data) {
          setCuit(b.data.cuit ?? "");
          setPuntoVenta(String(b.data.puntoVenta ?? 1));
          setCondicionIVA(b.data.condicionIVA ?? "RI");
          setAmbiente(b.data.ambiente ?? "homo");
          setHasCert(Boolean(b.data.hasCert));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(v: boolean) {
    setArcaEnabled(v);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arcaEnabled: v }),
    }).catch(() => {});
  }

  async function handleSaveConfig(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/tenants/arca-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit, puntoVenta: Number(puntoVenta), condicionIVA, ambiente }),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) { setError(b.error ?? "Error al guardar"); return; }
      setSuccess("Configuración guardada correctamente");
    } finally { setSaving(false); }
  }

  async function handleSaveCerts(e: FormEvent) {
    e.preventDefault();
    if (!certPem.trim() || !keyPem.trim()) { setError("Ingresá el certificado y la clave privada"); return; }
    setSavingCert(true);
    setError(null);
    try {
      const r = await fetch("/api/tenants/arca-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuit, puntoVenta: Number(puntoVenta), condicionIVA, ambiente, certPem: certPem.trim(), privateKeyPem: keyPem.trim() }),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) { setError(b.error ?? "Error al guardar certificados"); return; }
      setHasCert(true);
      setCertPem("");
      setKeyPem("");
      setSuccess("Certificados guardados y encriptados");
    } finally { setSavingCert(false); }
  }

  async function handleDeleteCerts() {
    if (!confirm("¿Eliminar los certificados cargados? Esta acción no se puede deshacer.")) return;
    await fetch("/api/tenants/arca-config/cert", { method: "DELETE" });
    setHasCert(false);
    setSuccess("Certificados eliminados");
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch("/api/invoices/test");
      const b = (await r.json()) as { error?: string; data?: { wsfe?: { appServer?: string; dbServer?: string } } };
      if (!r.ok) { setTestResult({ ok: false, msg: b.error ?? "Error" }); return; }
      const wsfe = b.data?.wsfe;
      setTestResult({ ok: true, msg: `AppServer: ${wsfe?.appServer ?? "—"} | DbServer: ${wsfe?.dbServer ?? "—"}` });
    } catch { setTestResult({ ok: false, msg: "Error de red" }); }
    finally { setTesting(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Facturación Electrónica ARCA/AFIP</h2>
        <p className="mt-1 text-sm text-slate-500">Emití facturas A, B o C directamente desde el punto de venta.</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {/* Habilitar/deshabilitar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-slate-900">Habilitar facturación electrónica</p>
          <p className="text-xs text-slate-500">Muestra el botón &quot;Emitir Factura&quot; en el POS tras cada venta</p>
        </div>
        <ToggleSwitch checked={arcaEnabled} onChange={handleToggle} />
      </div>

      {/* Datos del emisor */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Datos del emisor</h3>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">CUIT (sin guiones)</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                placeholder="20123456789"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                maxLength={11}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Punto de venta</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
                min={1}
                max={9999}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Condición IVA</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={condicionIVA}
                onChange={(e) => setCondicionIVA(e.target.value)}
              >
                <option value="RI">Responsable Inscripto</option>
                <option value="MONO">Monotributista</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Ambiente</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value)}
              >
                <option value="homo">Homologación (testing)</option>
                <option value="prod">Producción</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar datos"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? "Probando..." : "Probar conexión WSFE"}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.ok ? "✓ " : "✗ "}{testResult.msg}
            </p>
          )}
        </form>
      </div>

      {/* Certificados */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Certificados digitales</h3>
          {hasCert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={12} /> Cargado
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Sin certificado
            </span>
          )}
        </div>
        {hasCert ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Los certificados están encriptados (AES-256-GCM) y almacenados de forma segura.
            </p>
            <button
              type="button"
              onClick={handleDeleteCerts}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Eliminar certificados
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveCerts} className="space-y-4">
            <p className="text-xs text-slate-500">
              Pegá el contenido del certificado (.crt) y la clave privada (.key) emitidos por ARCA/AFIP.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Certificado (.crt)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-violet-500 focus:outline-none"
                rows={5}
                placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                value={certPem}
                onChange={(e) => setCertPem(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Clave privada (.key)</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-violet-500 focus:outline-none"
                rows={5}
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                value={keyPem}
                onChange={(e) => setKeyPem(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={savingCert}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {savingCert ? "Guardando..." : "Guardar certificados"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

export function Settings() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<SectionGroupId, boolean>>({
    negocio: true,
    fiscal: false,
    sistema: false
  });

  useEffect(() => {
    let isActive = true;
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: { data?: { role?: string } }) => {
        if (isActive && body.data?.role) setRole(body.data.role);
      })
      .catch(() => {});
    return () => { isActive = false; };
  }, []);

  const visibleCategories = CATEGORIES.filter((cat) => cat.id !== "auditoria" || role === "OWNER");

  useEffect(() => {
    const activeGroup = visibleCategories.find((c) => c.id === activeCategory)?.group;
    if (activeGroup) {
      setExpandedGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
    }
  }, [activeCategory, visibleCategories]);

  function renderContent() {
    switch (activeCategory) {
      case "general":
        return <GeneralSection onBusinessNameChange={setBusinessName} />;
      case "documentos":
        return <DocumentosSection />;
      case "arca":
        return <FacturacionARCASection />;
      case "seguridad":
        return <SeguridadSection />;
      case "sistema":
        return <SistemaSection />;
      case "notificaciones":
        return <NotificacionesSection />;
      case "auditoria":
        return role === "OWNER" ? <AuditLogSection /> : <ComingSoonSection label="Auditoría" />;
      default: {
        const cat = visibleCategories.find((c) => c.id === activeCategory);
        return <ComingSoonSection label={cat?.label ?? "Esta sección"} />;
      }
    }
  }

  const activeLabel = visibleCategories.find((c) => c.id === activeCategory)?.label ?? "";

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
              {SECTION_GROUPS.map((group) => {
                const isExpanded = expandedGroups[group.id];
                const categoriesInGroup = visibleCategories.filter((cat) => cat.group === group.id);
                return (
                  <div key={group.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                    >
                      {group.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3">
                        {categoriesInGroup.map((cat) => {
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
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Mobile category select */}
          <div className="mb-4 w-full lg:hidden">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:border-violet-400 focus:outline-none"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
            >
              {visibleCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Center content */}
          <main className="min-w-0 flex-1">{renderContent()}</main>

          {/* Right sidebar */}
          <div className="hidden w-56 flex-shrink-0 xl:block">
            <RightSidebar activeCategory={activeCategory} businessName={businessName} />
          </div>
        </div>
      </div>
    </div>
  );
}
