"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function RegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, email, password, confirmPassword })
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "No se pudo crear la cuenta.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-950">Creá tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">Empezá gratis, sin tarjeta de crédito</p>
        </div>

        <form
          className="space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="businessName">
              Nombre del negocio
            </label>
            <input
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              disabled={isLoading}
              id="businessName"
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Mi Comercio"
              required
              type="text"
              value={businessName}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              disabled={isLoading}
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@negocio.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="password">
              Contraseña
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              disabled={isLoading}
              id="password"
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              type="password"
              value={password}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="confirmPassword">
              Confirmar contraseña
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-950 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              disabled={isLoading}
              id="confirmPassword"
              minLength={8}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu contraseña"
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <button
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Creando cuenta…" : "Crear cuenta gratis"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tenés cuenta?{" "}
          <Link className="font-medium text-violet-600 hover:underline" href="/login">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
