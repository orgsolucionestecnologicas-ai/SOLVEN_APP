"use client";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Eye, EyeOff, X, Check } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        router.push("/dashboard");
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
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="relative hidden w-[40%] flex-col overflow-hidden lg:flex"
        style={{ backgroundColor: "#0f172a" }}
      >
        {/* Animated gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(124,58,237,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 10%, rgba(139,92,246,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Top: logo */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white"
              style={{ backgroundColor: "#7c3aed" }}
            >
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SOLVEN</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-violet-300"
              style={{ backgroundColor: "rgba(124,58,237,0.25)" }}
            >
              2.0
            </span>
          </div>
        </div>

        {/* Center: tagline + features */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 pb-10">
          <p className="mb-3 text-4xl font-bold leading-tight text-white">
            Tu negocio,<br />bajo control.
          </p>
          <p className="mb-10 text-base leading-relaxed text-slate-400">
            La plataforma inteligente para comercios físicos.
          </p>

          <div className="flex flex-col gap-3">
            {[
              "Control total de ventas e inventario",
              "Reportes en tiempo real",
              "Gestión de clientes y deudas",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(124,58,237,0.3)" }}
                >
                  <Check size={11} className="text-violet-300" />
                </div>
                <span className="text-sm text-slate-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: copyright */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-xs text-slate-600">© 2026 SOLVEN. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-1 flex-col"
        style={{ backgroundColor: "#f8fafc" }}
      >
        {/* Top right: help link */}
        <div className="flex justify-end px-8 py-6">
          <span className="cursor-default text-xs text-slate-400">¿Necesitas ayuda?</span>
        </div>

        {/* Center: form */}
        <div className="flex flex-1 items-center justify-center px-8 pb-16">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: "#7c3aed" }}
              >
                S
              </div>
              <span className="text-lg font-bold text-slate-900">SOLVEN</span>
            </div>

            <h1 className="mb-1.5 text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="mb-8 text-sm text-slate-500">
              Ingresa tus credenciales para acceder a tu panel.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="username"
                >
                  Usuario
                </label>
                <input
                  autoComplete="username"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  id="username"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu usuario"
                  required
                  type="text"
                  value={username}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-3.5 pr-11 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    id="password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Forgot password row */}
                <div className="mt-2 text-right">
                  <span className="cursor-default text-xs text-slate-400">
                    ¿Olvidaste tu contraseña?
                  </span>
                </div>
              </div>

              {/* Error */}
              {error ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <X size={15} className="flex-shrink-0 text-rose-500" />
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              ) : null}

              {/* Submit */}
              <button
                className="flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60"
                disabled={isLoading}
                style={{ backgroundColor: isLoading ? "#6d28d9" : "#7c3aed" }}
                type="submit"
                onMouseEnter={(e) => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#7c3aed";
                }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        fill="currentColor"
                      />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  "Iniciar sesión"
                )}
              </button>
            </form>

            {/* Bottom */}
            <p className="mt-8 text-center text-sm text-slate-400">
              ¿Eres nuevo?{" "}
              <span className="cursor-default font-medium text-violet-600">
                Solicitar acceso →
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
