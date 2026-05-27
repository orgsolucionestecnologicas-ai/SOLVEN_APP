"use client";

import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { formatARS } from "@/lib/format-currency";

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: { message: string; details?: string[] };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function fmtDate(v: string) {
  return dateFmt.format(new Date(v));
}

function fmtPrice(v: string | number) {
  return formatARS(Number(v));
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Services() {
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editService, setEditService] = useState<ServiceRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch("/api/services")
      .then((r) => r.json())
      .then((body: ApiResponse<ServiceRecord[]>) => {
        if (!active) return;
        if (body.data) {
          setServices(body.data);
          setFetchError(null);
        } else {
          setFetchError(body.error?.message ?? "No se pudieron cargar los servicios.");
        }
      })
      .catch(() => {
        if (active) setFetchError("No se pudieron cargar los servicios.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const filtered = useMemo(
    () =>
      services.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.code.toLowerCase().includes(query.toLowerCase()) ||
          (s.description ?? "").toLowerCase().includes(query.toLowerCase())
      ),
    [services, query]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = services.filter((s) => s.isActive).length;

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  async function handleToggle(id: string) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "PATCH" });
      if (res.ok) setRefreshKey((k) => k + 1);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-5 sm:p-8">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total de servicios" value={String(services.length)} />
        <StatCard label="Activos" value={String(activeCount)} accent="emerald" />
        <StatCard
          label="Inactivos"
          value={String(services.length - activeCount)}
          accent="slate"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={15}
          />
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar por nombre o código…"
            type="search"
            value={query}
          />
        </div>
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          onClick={() => setShowCreate(true)}
          type="button"
        >
          <Plus size={15} />
          Nuevo servicio
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : fetchError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-sm text-rose-900">{fetchError}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState query={query} onClear={() => handleQueryChange("")} onNew={() => setShowCreate(true)} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Código", "Nombre", "Descripción", "Precio", "Estado", ""].map(
                    (h, i) => (
                      <th
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                          i === 3 ? "text-right" : i === 5 ? "text-right" : "text-left"
                        }`}
                        key={h || i}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    isToggling={togglingId === service.id}
                    onEdit={() => setEditService(service)}
                    onToggle={() => void handleToggle(service.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <button
                  className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <ServiceModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
      {editService && (
        <ServiceModal
          initialData={editService}
          onClose={() => setEditService(null)}
          onSuccess={() => {
            setEditService(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

// ─── ServiceRow ───────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  isToggling,
  onEdit,
  onToggle,
}: {
  service: ServiceRecord;
  isToggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-3">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
          {service.code}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-slate-950">{service.name}</td>
      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-500">
        {service.description ?? <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-950">
        {fmtPrice(service.price)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            service.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {service.isActive ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onEdit}
            title="Editar"
            type="button"
          >
            <Pencil size={14} />
          </button>
          <button
            className={`rounded-md p-1.5 transition-colors ${
              isToggling
                ? "cursor-wait opacity-50"
                : service.isActive
                ? "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            disabled={isToggling}
            onClick={onToggle}
            title={service.isActive ? "Desactivar" : "Activar"}
            type="button"
          >
            {service.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── ServiceModal (create + edit) ────────────────────────────────────────────

function ServiceModal({
  initialData,
  onClose,
  onSuccess,
}: {
  initialData?: ServiceRecord;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [price, setPrice] = useState(
    initialData ? String(Number(initialData.price)) : ""
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const priceNum = parseFloat(price.replace(",", "."));
    if (!name.trim()) {
      setSubmitError("El nombre es requerido.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setSubmitError("El precio debe ser un número mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const url = isEdit ? `/api/services/${initialData!.id}` : "/api/services";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        name: name.trim(),
        price: priceNum,
      };
      if (description.trim()) body.description = description.trim();
      else if (isEdit) body.description = null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ApiResponse<ServiceRecord>;

      if (!res.ok || !json.data) {
        setSubmitError(
          json.error?.details?.[0] ??
            json.error?.message ??
            "No se pudo guardar el servicio."
        );
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("No se pudo guardar el servicio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-950">
            {isEdit ? "Editar servicio" : "Nuevo servicio"}
          </h2>
          <button
            className="text-slate-400 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4 px-6 py-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="svc-name"
            >
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="svc-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Corte de cabello"
              required
              type="text"
              value={name}
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="svc-price"
            >
              Precio <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                className="w-full rounded-md border border-slate-300 py-2 pl-7 pr-3 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
                disabled={isSubmitting}
                id="svc-price"
                inputMode="decimal"
                min="0.01"
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={price}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-slate-700"
              htmlFor="svc-desc"
            >
              Descripción{" "}
              <span className="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 focus:border-slate-500 focus:outline-none"
              disabled={isSubmitting}
              id="svc-desc"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del servicio…"
              rows={3}
              value={description}
            />
          </div>

          {submitError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-900">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  query,
  onClear,
  onNew,
}: {
  query: string;
  onClear: () => void;
  onNew: () => void;
}) {
  if (query) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
        <Search className="mb-3 text-slate-300" size={36} />
        <p className="text-sm font-semibold text-slate-950">Sin resultados</p>
        <p className="mt-1 text-xs text-slate-400">
          No hay servicios que coincidan con &ldquo;{query}&rdquo;
        </p>
        <button
          className="mt-4 text-sm font-medium text-violet-600 hover:underline"
          onClick={onClear}
          type="button"
        >
          Limpiar búsqueda
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16">
      <Wrench className="mb-3 text-slate-300" size={36} />
      <p className="text-sm font-semibold text-slate-950">Sin servicios</p>
      <p className="mt-1 text-xs text-slate-400">
        Creá tu primer servicio para ofrecerlo en el POS
      </p>
      <button
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        onClick={onNew}
        type="button"
      >
        <Plus size={14} />
        Nuevo servicio
      </button>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = "violet",
}: {
  label: string;
  value: string;
  accent?: "violet" | "emerald" | "slate";
}) {
  const colors = {
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    slate: "bg-slate-50 border-slate-200 text-slate-600",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[accent]}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${colors[accent].split(" ")[2]}`}>
        {value}
      </p>
    </div>
  );
}
