import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-14 h-14">
            <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="#f97316" />
            <text x="32" y="44" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="32" fill="white">S</text>
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-3">Simple. Sin sorpresas.</h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Un solo plan con todo lo que tu negocio necesita.
        </p>
      </div>

      {/* Card de precio */}
      <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <p className="text-orange-400 font-semibold text-sm uppercase tracking-wider mb-2">Plan SOLVEN</p>
          <div className="flex items-end justify-center gap-1 mb-1">
            <span className="text-gray-400 text-lg">AR$</span>
            <span className="text-5xl font-bold">15.999</span>
            <span className="text-gray-400 mb-1">/mes</span>
          </div>
          <p className="text-green-400 text-sm font-medium">✓ 14 días gratis, sin tarjeta requerida</p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors text-lg"
          >
            Empezar gratis 14 días
          </Link>
          <p className="text-center text-gray-500 text-xs">
            Sin compromisos. Cancelá cuando quieras.
          </p>
        </div>
      </div>

      {/* Footer link */}
      <p className="mt-8 text-gray-500 text-sm">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-orange-400 hover:text-orange-300">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
