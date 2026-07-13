"use client";

import { Plus, Power, Shield, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  userCode: string | null;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const ROLE_OPTIONS = [
  { value: "OWNER", label: "Propietario" },
  { value: "CASHIER", label: "Cajero" },
  { value: "INVENTORY", label: "Inventario" },
  { value: "READONLY", label: "Solo lectura" },
  { value: "SUPERVISOR", label: "Supervisor" }
];

const ROLE_BADGE_CLASSES: Record<string, string> = {
  OWNER: "bg-violet-100 text-violet-700",
  CASHIER: "bg-blue-100 text-blue-700",
  INVENTORY: "bg-emerald-100 text-emerald-700",
  READONLY: "bg-slate-100 text-slate-600",
  SUPERVISOR: "bg-amber-100 text-amber-700"
};

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

const dateFormatter = new Intl.DateTimeFormat("es-419", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function UsersList() {
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleteSalesCount, setDeleteSalesCount] = useState<number | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<UserRecord | null>(null);

  useEffect(() => {
    let isActive = true;
    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: ApiResponse<{ role: string }>) => {
        if (!isActive) return;
        setCurrentRole(body.data?.role ?? null);
      })
      .catch(() => {
        if (isActive) setCurrentRole(null);
      })
      .finally(() => {
        if (isActive) setRoleLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (currentRole !== "OWNER") return;
    let isActive = true;
    setLoading(true);
    setError(null);
    fetch("/api/users", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: ApiResponse<UserRecord[]>) => {
        if (!isActive) return;
        if (!body.data) {
          setError(body.error?.message ?? "No se pudieron cargar los usuarios.");
          setUsers([]);
          return;
        }
        setUsers(body.data);
      })
      .catch(() => {
        if (isActive) setError("No se pudieron cargar los usuarios.");
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [currentRole, refreshKey]);

  async function handleRoleChange(user: UserRecord, role: string) {
    const previousUsers = users;
    setUsers((list) => list.map((item) => (item.id === user.id ? { ...item, role } : item)));
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const body = (await res.json()) as ApiResponse<UserRecord>;
      if (!res.ok || !body.data) {
        setUsers(previousUsers);
        setError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo actualizar el rol.");
      }
    } catch {
      setUsers(previousUsers);
      setError("No se pudo actualizar el rol.");
    }
  }

  async function handleToggleActive(user: UserRecord, active: boolean) {
    const previousUsers = users;
    setUsers((list) => list.map((item) => (item.id === user.id ? { ...item, active } : item)));
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active })
      });
      const body = (await res.json()) as ApiResponse<UserRecord>;
      if (!res.ok || !body.data) {
        setUsers(previousUsers);
        setError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo actualizar el estado del usuario.");
      }
    } catch {
      setUsers(previousUsers);
      setError("No se pudo actualizar el estado del usuario.");
    }
  }

  async function handleDelete(confirm: boolean) {
    if (!deleteTarget) return;
    try {
      const url = `/api/users/${deleteTarget.id}${confirm ? "?confirm=true" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      const body = (await res.json()) as ApiResponse<{ deleted: boolean; salesCount: number }>;
      if (!res.ok) {
        setError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo eliminar el usuario.");
        return;
      }
      if (body.data && !body.data.deleted) {
        setDeleteSalesCount(body.data.salesCount);
        return;
      }
      setDeleteTarget(null);
      setDeleteSalesCount(null);
      setRefreshKey((key) => key + 1);
    } catch {
      setError("No se pudo eliminar el usuario.");
    }
  }

  if (roleLoading) {
    return <div className="px-6 py-10 text-sm text-slate-500">Cargando…</div>;
  }

  if (currentRole !== "OWNER") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Shield className="text-slate-400" size={20} />
        </div>
        <p className="text-sm font-medium text-slate-700">Sin permisos</p>
        <p className="max-w-sm text-sm text-slate-500">
          Solo el propietario puede ver y administrar los usuarios del negocio.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-950">Usuarios</h1>
          <p className="text-xs text-slate-500">Administrá los usuarios y sus roles dentro del negocio</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          onClick={() => setShowAddModal(true)}
          type="button"
        >
          <Plus size={14} />
          Agregar usuario
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-900">{error}</p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Creado</th>
              <th className="px-4 py-3 font-medium">Último acceso</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={8}>Cargando…</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={8}>No hay usuarios para mostrar.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-violet-100 px-2 py-1 font-mono text-xs font-semibold text-violet-700">
                      {user.userCode ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE_CLASSES[user.role] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                      <select
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-violet-500 focus:outline-none"
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        value={user.role}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Nunca"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        onClick={() =>
                          user.active ? setDeactivateTarget(user) : handleToggleActive(user, true)
                        }
                        type="button"
                      >
                        <Power size={13} />
                        {user.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteSalesCount(null);
                        }}
                        type="button"
                      >
                        <Trash2 size={13} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal ? (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            setRefreshKey((key) => key + 1);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-slate-950">¿Eliminar usuario?</p>
              <p className="mt-1.5 text-sm text-slate-500">
                Se eliminará a <strong>{deleteTarget.name || deleteTarget.email}</strong> del negocio. Esta acción no se puede deshacer.
              </p>
              {deleteSalesCount !== null && deleteSalesCount > 0 ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Este usuario tiene {deleteSalesCount} venta{deleteSalesCount === 1 ? "" : "s"} asociada
                  {deleteSalesCount === 1 ? "" : "s"}. Eliminarlo no afecta las ventas ya registradas.
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteSalesCount(null);
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                onClick={() => handleDelete(deleteSalesCount !== null && deleteSalesCount > 0)}
                type="button"
              >
                {deleteSalesCount !== null && deleteSalesCount > 0 ? "Sí, eliminar de todas formas" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deactivateTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-slate-950">¿Desactivar usuario?</p>
              <p className="mt-1.5 text-sm text-slate-500">
                <strong>{deactivateTarget.name || deactivateTarget.email}</strong> no podrá iniciar sesión hasta que lo reactives. Su historial de ventas y movimientos se conserva.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
              <button
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setDeactivateTarget(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => {
                  handleToggleActive(deactivateTarget, false);
                  setDeactivateTarget(null);
                }}
                type="button"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role })
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.data) {
        setSubmitError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo crear el usuario.");
        return;
      }
      onCreated();
    } catch {
      setSubmitError("No se pudo crear el usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-sm font-semibold text-slate-950">Agregar usuario</p>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <form id="add-user-form" onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-name">Nombre</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                disabled={isSubmitting}
                id="user-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. María Gómez"
                required
                type="text"
                value={name}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-email">Email</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                disabled={isSubmitting}
                id="user-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@negocio.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-password">Contraseña</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                disabled={isSubmitting}
                id="user-password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                type="password"
                value={password}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="user-role">Rol</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                disabled={isSubmitting}
                id="user-role"
                onChange={(e) => setRole(e.target.value)}
                value={role}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {submitError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm text-rose-900">{submitError}</p>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
            <button
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={isSubmitting}
              form="add-user-form"
              type="submit"
            >
              {isSubmitting ? "Guardando..." : "Guardar usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
