"use client";

import {
  ArrowLeft,
  Mail,
  Phone,
  Save,
  User,
  Users
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-orange-500","bg-indigo-500"
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (name.trim().length > 0) return name.trim().slice(0, 2).toUpperCase();
  return "?";
}

function getAvatarColor(name: string): string {
  if (!name.trim()) return "bg-slate-300";
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function CustomerNewForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      const body = (await res.json()) as ApiResponse<CustomerRecord>;

      if (!res.ok || !body.data) {
        setSubmitError(
          body.error?.details?.[0] ?? body.error?.message ?? "No se pudo registrar el cliente."
        );
        return;
      }

      router.push(`/customers/${body.data.id}`);
    } catch {
      setSubmitError("No se pudo registrar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewInitials = name.trim() ? getInitials(name) : "?";
  const previewColor = name.trim() ? getAvatarColor(name) : "bg-slate-200";

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            href="/customers"
          >
            <ArrowLeft size={15} />
            Volver a clientes
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-semibold text-slate-950">Nuevo cliente</h1>
            <p className="text-xs text-slate-500">Registra un nuevo cliente en el sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="/customers"
          >
            Cancelar
          </Link>
          <button
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            disabled={isSubmitting || !name.trim()}
            form="new-customer-form"
            type="submit"
          >
            <Save size={14} />
            {isSubmitting ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 gap-6 px-6 py-6">
        {/* Main form */}
        <div className="min-w-0 flex-1">
          <form id="new-customer-form" onSubmit={handleSubmit}>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600">
                  <User size={12} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold text-slate-950">Información del cliente</h2>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="customer-name"
                  >
                    Nombre completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={isSubmitting}
                    id="customer-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    required
                    type="text"
                    value={name}
                  />
                </div>

                {/* Phone — visual only */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-phone">
                    Teléfono
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(próximamente)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-400 placeholder:text-slate-300"
                      disabled
                      id="customer-phone"
                      placeholder="809-000-0000"
                      type="tel"
                    />
                  </div>
                </div>

                {/* Email — visual only */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="customer-email">
                    Correo electrónico
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(próximamente)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-400 placeholder:text-slate-300"
                      disabled
                      id="customer-email"
                      placeholder="cliente@email.com"
                      type="email"
                    />
                  </div>
                </div>
              </div>

              {submitError ? (
                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-sm text-rose-900">{submitError}</p>
                </div>
              ) : null}
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <aside className="w-72 shrink-0 space-y-4">
          {/* Preview card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-950">Vista previa</h3>
            <div className="flex flex-col items-center py-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white transition-colors ${previewColor}`}
              >
                {previewInitials}
              </div>
              <p className="mt-3 text-base font-semibold text-slate-950">
                {name.trim() || "Nombre del cliente"}
              </p>
              <span className="mt-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Activo
              </span>
            </div>
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Deuda actual</span>
                <span className="text-xs font-semibold text-slate-400">RD$ 0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Total compras</span>
                <span className="text-xs font-semibold text-slate-400">RD$ 0.00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Límite de crédito</span>
                <span className="text-xs font-semibold text-slate-950">RD$ 10,000.00</span>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 shrink-0 text-violet-500" size={15} />
              <div>
                <p className="text-xs font-semibold text-violet-800">Después de guardar</p>
                <p className="mt-1 text-xs text-violet-700">
                  Serás redirigido al historial del cliente donde podrás ver sus compras, pagos y gestionar su deuda.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
