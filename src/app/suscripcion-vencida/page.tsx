"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function SuscripcionVencidaPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <AlertCircle className="text-orange-600" size={32} />
        </div>

        <h1 className="mb-3 text-2xl font-bold text-slate-950">
          Tu suscripción venció
        </h1>
        <p className="mb-8 text-slate-500">
          Tu período de prueba gratuita terminó o tu suscripción fue cancelada.
          Renová para seguir usando SOLVEN.
        </p>

        <div className="space-y-3">
          <a
            className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-base font-semibold text-white hover:bg-orange-600"
            href={process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "#"}
            rel="noopener noreferrer"
            target="_blank"
          >
            Renovar suscripción →
          </a>

          <a
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href="mailto:orgsolucionestecnologicas@gmail.com"
          >
            Contactar soporte
          </a>

          <button
            className="w-full rounded-xl px-6 py-3 text-sm font-medium text-slate-400 hover:text-slate-600"
            onClick={handleLogout}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          ¿Tenés preguntas?{" "}
          <Link className="underline" href="mailto:orgsolucionestecnologicas@gmail.com">
            Escribinos
          </Link>
        </p>
      </div>
    </div>
  );
}
