import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/tenant";

const features = [
  "Punto de venta (POS) completo",
  "Gestión de productos e inventario",
  "Control de caja y movimientos",
  "Gestión de clientes y deudas",
  "Devoluciones con reversión automática de stock",
  "Reportes y estadísticas",
  "Gestión de promociones y descuentos",
  "Registro de gastos",
  "Asistente de ayuda integrado",
  "Usuarios y roles (dueño, cajero, inventario)",
  "Acceso desde cualquier dispositivo",
  "Soporte por email",
];

export default async function PricingPage() {
  const session = await getSession();
  const isAuthenticated = session !== null;
  const checkoutUrl = process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white">
            S
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SOLVEN</span>
        </div>
        <h1 className="text-4xl font-bold mb-3">Simple. Sin sorpresas.</h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Un solo plan con todo lo que tu negocio necesita.
        </p>
      </div>

      {/* Card de precio */}
      <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <p className="text-violet-400 font-semibold text-sm uppercase tracking-wider mb-2">Plan SOLVEN</p>
          <div className="flex items-end justify-center gap-1 mb-1">
            <span className="text-slate-400 text-lg">AR$</span>
            <span className="text-5xl font-bold">15.999</span>
            <span className="text-slate-400 mb-1">/mes</span>
          </div>
          <p className="text-green-400 text-sm font-medium">✓ 14 días gratis, sin tarjeta requerida</p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-violet-400 mt-0.5 shrink-0" />
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA — condicional según si el usuario está autenticado */}
        <div className="space-y-3">
          {isAuthenticated ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
            >
              Suscribirme ahora →
            </a>
          ) : (
            <Link
              href="/register"
              className="block w-full text-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
            >
              Empezar gratis 14 días
            </Link>
          )}
          <p className="text-center text-slate-500 text-xs">
            Sin compromisos. Cancelá cuando quieras.
          </p>
        </div>
      </div>

      {/* Footer link */}
      <p className="mt-8 text-slate-500 text-sm">
        {isAuthenticated ? (
          <>
            <Link href="/dashboard" className="text-violet-400 hover:text-violet-300">
              ← Volver al panel
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300">
              Iniciá sesión
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
