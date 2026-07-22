"use client";

import { useEffect, useState } from "react";

type PermissionRow = { role: string; section: string; canAccess: boolean };
type ApiResponse<T> = { data?: T; error?: { message: string; details?: string[] } };

const SECTIONS: { value: string; label: string }[] = [
  { value: "dashboard", label: "Inicio" },
  { value: "pos", label: "Ventas" },
  { value: "returns", label: "Devoluciones" },
  { value: "products", label: "Productos" },
  { value: "customers", label: "Clientes" },
  { value: "cashMovements", label: "Caja" },
  { value: "quotes", label: "Cotizaciones" },
  { value: "reports", label: "Reportes" },
  { value: "promotions", label: "Promociones" },
  { value: "settings", label: "Ajustes" }
];

const ROLES: { value: string; label: string }[] = [
  { value: "OWNER", label: "Propietario" },
  { value: "CASHIER", label: "Cajero" },
  { value: "INVENTORY", label: "Inventario" },
  { value: "READONLY", label: "Solo lectura" },
  { value: "SUPERVISOR", label: "Supervisor" }
];

// Mismos defaults hardcodeados que usa AppShell (hiddenForRoles en navItems de app-shell.tsx)
// cuando no hay ninguna fila configurada todavía en RolePermission para esa combinación.
const DEFAULT_HIDDEN: Record<string, string[]> = {
  SUPERVISOR: ["cashMovements", "settings"]
};

function defaultCanAccess(role: string, section: string): boolean {
  return !DEFAULT_HIDDEN[role]?.includes(section);
}

export function RolePermissionsTable() {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/role-permissions", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((body: ApiResponse<PermissionRow[]>) => {
        if (!body.data) return;
        const map: Record<string, boolean> = {};
        for (const row of body.data) {
          map[`${row.role}:${row.section}`] = row.canAccess;
        }
        setPermissions(map);
      })
      .catch(() => setError("No se pudieron cargar los permisos."))
      .finally(() => setLoading(false));
  }, []);

  function canAccess(role: string, section: string): boolean {
    const key = `${role}:${section}`;
    return key in permissions ? permissions[key] : defaultCanAccess(role, section);
  }

  async function handleToggle(role: string, section: string) {
    if (role === "OWNER" && section === "settings") return;
    const key = `${role}:${section}`;
    const nextValue = !canAccess(role, section);
    const previous = permissions;
    setPermissions((prev) => ({ ...prev, [key]: nextValue }));
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch("/api/role-permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: [{ role, section, canAccess: nextValue }] })
      });
      const body = (await res.json()) as ApiResponse<PermissionRow[]>;
      if (!res.ok || !body.data) {
        setPermissions(previous);
        setError(body.error?.details?.[0] ?? body.error?.message ?? "No se pudo actualizar el permiso.");
      }
    } catch {
      setPermissions(previous);
      setError("No se pudo actualizar el permiso.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="px-5 py-6 text-sm text-slate-500 sm:px-8">Cargando permisos…</div>;
  }

  return (
    <div className="px-5 py-6 sm:px-8">
      <h3 className="text-sm font-semibold text-slate-900">Permisos por rol</h3>
      <p className="mt-1 text-xs text-slate-500">
        Definí a qué secciones puede acceder cada rol. Si no configurás nada para una combinación, se usa el
        comportamiento por defecto del sistema.
      </p>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-900">{error}</p>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Sección</th>
              {ROLES.map((role) => (
                <th className="px-3 py-2 text-center font-medium" key={role.value}>{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SECTIONS.map((section) => (
              <tr key={section.value}>
                <td className="px-3 py-2 font-medium text-slate-700">{section.label}</td>
                {ROLES.map((role) => {
                  const key = `${role.value}:${section.value}`;
                  const locked = role.value === "OWNER" && section.value === "settings";
                  return (
                    <td className="px-3 py-2 text-center" key={key}>
                      <input
                        checked={canAccess(role.value, section.value)}
                        disabled={locked || savingKey === key}
                        onChange={() => handleToggle(role.value, section.value)}
                        title={locked ? "El propietario siempre tiene acceso a Configuración" : undefined}
                        type="checkbox"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
