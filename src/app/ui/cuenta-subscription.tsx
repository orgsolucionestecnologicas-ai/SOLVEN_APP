"use client";

import { useEffect, useState } from "react";
import { CreditCard, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

type SubscriptionStatus = "TRIAL" | "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE" | string;

type AccountData = {
  businessName: string;
  email: string;
  subscription: {
    status: SubscriptionStatus;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    rebillSubscriptionId: string | null;
    cancelledAt: string | null;
    createdAt: string;
  } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const map: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
    TRIAL:     { label: "Prueba gratuita", color: "text-blue-400 bg-blue-900/30 border-blue-800",     Icon: Clock },
    ACTIVE:    { label: "Activa",          color: "text-green-400 bg-green-900/30 border-green-800",  Icon: CheckCircle },
    PAST_DUE:  { label: "Pago vencido",   color: "text-orange-400 bg-orange-900/30 border-orange-800", Icon: AlertCircle },
    CANCELLED: { label: "Cancelada",       color: "text-gray-400 bg-gray-900/30 border-gray-700",     Icon: XCircle },
    EXPIRED:   { label: "Vencida",         color: "text-red-400 bg-red-900/30 border-red-800",         Icon: XCircle },
  };
  const config = map[status] ?? { label: status, color: "text-gray-400 bg-gray-900/30 border-gray-700", Icon: AlertCircle };
  const { label, color, Icon } = config;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full border ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function CuentaSubscription() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cuenta")
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error.message ?? "Error");
        setData(res.data);
      })
      .catch((e: Error) => setError(e.message ?? "No se pudo cargar la cuenta."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 p-4">Cargando...</p>;

  if (error)
    return (
      <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded-lg px-4 py-3 m-4">
        <AlertCircle className="w-4 h-4 shrink-0" />
        {error}
      </div>
    );

  if (!data) return null;

  const sub = data.subscription;

  return (
    <div className="space-y-6 max-w-2xl p-5 sm:p-8">

      {/* Info del negocio */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500 mb-3">Información del negocio</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Nombre</span>
            <span className="text-slate-950 font-medium">{data.businessName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-950">{data.email}</span>
          </div>
        </div>
      </div>

      {/* Estado de suscripción */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500 mb-4">Suscripción</h2>

        {!sub ? (
          <p className="text-slate-400 text-sm">No hay información de suscripción.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Estado</span>
              <StatusBadge status={sub.status} />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Plan</span>
              <span className="text-slate-950 font-medium">Plan SOLVEN — AR$15.999/mes</span>
            </div>

            {sub.status === "TRIAL" && sub.trialEndsAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trial vence el</span>
                <span className="text-blue-700 font-medium">{formatDate(sub.trialEndsAt)}</span>
              </div>
            )}

            {sub.status === "ACTIVE" && sub.currentPeriodEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Próxima renovación</span>
                <span className="text-slate-950">{formatDate(sub.currentPeriodEnd)}</span>
              </div>
            )}

            {sub.cancelledAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cancelada el</span>
                <span className="text-slate-950">{formatDate(sub.cancelledAt)}</span>
              </div>
            )}

            {(sub.status === "PAST_DUE" || sub.status === "EXPIRED") && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Hay un problema con el pago. Actualizá tu método de pago para continuar usando SOLVEN.
                </span>
              </div>
            )}

            {sub.status === "TRIAL" && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Estás en período de prueba gratuito. Al vencer, necesitarás una suscripción activa para continuar.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500 mb-4">Gestionar suscripción</h2>
        <div className="space-y-3">

          <a
            href={process.env.NEXT_PUBLIC_REBILL_CHECKOUT_URL ?? "/pricing"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg px-4 py-2.5 transition-colors text-sm"
          >
            <CreditCard className="w-4 h-4" />
            Ver planes y suscribirse
          </a>

          {sub?.rebillSubscriptionId && (
            <>
              <a
                href={`https://app.rebill.to/subscriptions/${sub.rebillSubscriptionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2.5 transition-colors text-sm border border-slate-200"
              >
                <CreditCard className="w-4 h-4 text-slate-400" />
                Actualizar método de pago
              </a>

              <a
                href={`https://app.rebill.to/subscriptions/${sub.rebillSubscriptionId}/cancel`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full bg-white hover:bg-slate-50 text-slate-500 rounded-lg px-4 py-2.5 transition-colors text-sm border border-slate-200"
              >
                <Calendar className="w-4 h-4" />
                Cancelar suscripción
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
