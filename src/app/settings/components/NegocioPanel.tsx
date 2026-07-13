"use client";

import { useEffect, useState } from "react";
import { Settings } from "../../ui/settings";

const RECOMMENDED_FIELDS: { key: string; label: string }[] = [
  { key: "businessName", label: "Nombre del negocio" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "address", label: "Dirección" },
  { key: "taxId", label: "CUIT" },
  { key: "logoUrl", label: "Logo" },
  { key: "receiptFooterMessage", label: "Mensaje de pie de ticket" },
  { key: "receiptThankYouMessage", label: "Mensaje de agradecimiento" }
];

export function NegocioPanel() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let isActive = true;
    fetch("/api/settings", { headers: { Accept: "application/json" } })
      .then((res) => res.json())
      .then((body: { data?: Record<string, unknown> }) => {
        if (isActive) setSettings(body.data ?? {});
      })
      .catch(() => {
        if (isActive) setSettings({});
      });
    return () => {
      isActive = false;
    };
  }, []);

  const missingFields = settings
    ? RECOMMENDED_FIELDS.filter((f) => {
        const value = settings[f.key];
        return typeof value !== "string" || value.trim().length === 0;
      })
    : [];
  const completedCount = RECOMMENDED_FIELDS.length - missingFields.length;
  const percent = settings
    ? Math.round((completedCount / RECOMMENDED_FIELDS.length) * 100)
    : 0;

  return (
    <div>
      <div className="px-5 py-5 sm:px-8">
        <h2 className="text-xl font-semibold text-slate-950">Mi Negocio</h2>
        <p className="mt-1 text-sm text-slate-500">Nombre, contacto e información fiscal</p>
      </div>
      <hr className="border-slate-200" />
      {settings && (
        <div className="px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-slate-700">
              Configuración completa: {completedCount}/{RECOMMENDED_FIELDS.length} campos
            </span>
            <span className="text-sm text-slate-500">{percent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          {missingFields.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Falta completar: {missingFields.map((f) => f.label).join(", ")}
            </p>
          )}
        </div>
      )}
      <hr className="border-slate-200" />
      <Settings />
    </div>
  );
}
