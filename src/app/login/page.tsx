"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        router.push("/");
      } else {
        setError("Usuario o contraseña incorrectos");
      }
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-white px-8 py-10 shadow-sm">
          <div className="mb-8 text-center">
            <p className="text-2xl font-semibold tracking-normal text-slate-950">
              SOLVEN
            </p>
            <p className="mt-1 text-sm text-slate-500">Control del negocio</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="username"
              >
                Usuario
              </label>
              <input
                autoComplete="username"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                id="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                required
                type="text"
                value={username}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-slate-700"
                htmlFor="password"
              >
                Contraseña
              </label>
              <input
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                type="password"
                value={password}
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-rose-600">{error}</p>
            )}

            <button
              className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
