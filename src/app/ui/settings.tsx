"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function Settings() {
  return (
    <section className="space-y-6 px-5 py-6 sm:px-8">
      <BusinessInfoPanel />
      <SecurityPanel />
      <SessionPanel />
    </section>
  );
}

function BusinessInfoPanel() {
  const fields = [
    { label: "Nombre del negocio", value: "SOLVEN" },
    { label: "Plan", value: "MVP" },
    { label: "Versión", value: "1.0.0" }
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">
          Información del negocio
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Datos generales del sistema.
        </p>
      </div>
      <dl className="divide-y divide-slate-100">
        {fields.map(({ label, value }) => (
          <div className="flex items-center justify-between px-5 py-4" key={label}>
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SecurityPanel() {
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">Seguridad</h2>
        <p className="mt-1 text-sm text-slate-500">
          Actualiza tu contraseña de acceso.
        </p>
      </div>

      <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">
              {successMessage}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              El cambio de contraseña se aplica hasta reiniciar el servidor.
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-800">{errorMessage}</p>
          </div>
        ) : null}

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-slate-700"
            htmlFor="current-password"
          >
            Contraseña actual
          </label>
          <input
            autoComplete="current-password"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
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
          <label
            className="mb-1.5 block text-sm font-medium text-slate-700"
            htmlFor="new-password"
          >
            Nueva contraseña
          </label>
          <input
            autoComplete="new-password"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            disabled={isSubmitting}
            id="new-password"
            minLength={6}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña"
            required
            type="password"
            value={newPassword}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-slate-700"
            htmlFor="confirm-password"
          >
            Confirmar nueva contraseña
          </label>
          <input
            autoComplete="new-password"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            disabled={isSubmitting}
            id="confirm-password"
            minLength={6}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar nueva contraseña"
            required
            type="password"
            value={confirmPassword}
          />
        </div>

        <div className="pt-1">
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SessionPanel() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">Sesión</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cierra tu sesión activa en este dispositivo.
        </p>
      </div>
      <div className="px-5 py-5">
        <button
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={handleLogout}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
