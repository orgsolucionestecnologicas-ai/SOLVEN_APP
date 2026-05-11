"use client";

import {
  ArrowLeft,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Save,
  User
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

export function CustomerNewForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [postal, setPostal] = useState("");
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
      <div className="px-6 py-6">
        <div className="max-w-2xl">
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

                {/* Cédula / RNC */}
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="customer-cedula"
                  >
                    Cédula / RNC
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      disabled={isSubmitting}
                      id="customer-cedula"
                      onChange={(e) => setCedula(e.target.value)}
                      placeholder="000-0000000-0"
                      type="text"
                      value={cedula}
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                    htmlFor="customer-direccion"
                  >
                    Dirección
                    <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      disabled={isSubmitting}
                      id="customer-direccion"
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Av. Principal #123..."
                      type="text"
                      value={direccion}
                    />
                  </div>
                </div>

                {/* Ciudad + Código postal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="customer-ciudad"
                    >
                      Ciudad
                      <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      disabled={isSubmitting}
                      id="customer-ciudad"
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej. Buenos Aires"
                      type="text"
                      value={ciudad}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                      htmlFor="customer-postal"
                    >
                      Código postal
                      <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      disabled={isSubmitting}
                      id="customer-postal"
                      onChange={(e) => setPostal(e.target.value)}
                      placeholder="Ej. 1043"
                      type="text"
                      value={postal}
                    />
                  </div>
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
      </div>
    </div>
  );
}
