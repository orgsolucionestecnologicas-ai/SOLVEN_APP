"use client";

import { useMemo, useState } from "react";
import { HELP_KNOWLEDGE_BASE } from "@/lib/help-knowledge-base";
import { normalizeText } from "@/lib/help-search";

const MODULES = [
  { key: "caja", label: "Caja" },
  { key: "ventas", label: "Ventas / POS" },
  { key: "productos", label: "Productos" },
  { key: "inventario", label: "Inventario" },
  { key: "clientes", label: "Clientes" },
  { key: "devoluciones", label: "Devoluciones" },
  { key: "promociones", label: "Promociones" },
  { key: "reportes", label: "Reportes" },
  { key: "configuracion", label: "Configuración" },
  { key: "suscripcion", label: "Suscripción" },
  { key: "soporte", label: "Soporte" },
];

export function HelpPageContent() {
  const [query, setQuery] = useState("");
  const [openModule, setOpenModule] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return HELP_KNOWLEDGE_BASE;
    const norm = normalizeText(query);
    const words = norm.split(" ").filter((w) => w.length > 1);
    return HELP_KNOWLEDGE_BASE.filter((e) => {
      const combined = normalizeText(
        `${e.question} ${e.answer} ${e.keywords.join(" ")} ${e.module}`
      );
      return words.some((w) => combined.includes(w));
    });
  }, [query]);

  const byModule = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const arr = map.get(e.module) ?? [];
      arr.push(e);
      map.set(e.module, arr);
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      {/* Search */}
      <div className="mb-8">
        <input
          autoFocus
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          onChange={(e) => { setQuery(e.target.value); setOpenModule(null); }}
          placeholder="Buscá una pregunta o tema…"
          type="search"
          value={query}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">No hay resultados para &ldquo;{query}&rdquo;</p>
          <p className="mt-1 text-xs text-slate-400">
            Escribinos a orgsolucionestecnologicas@gmail.com
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {MODULES.map(({ key, label }) => {
            const entries = byModule.get(key);
            if (!entries?.length) return null;
            const isOpen = openModule === key || !!query.trim();

            return (
              <div key={key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenModule(isOpen && !query ? null : key)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-950">{label}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      {entries.length}
                    </span>
                  </div>
                  {!query && (
                    <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    {entries.map((e) => (
                      <div key={e.id} className="border-b border-slate-50 px-5 py-4 last:border-0">
                        <p className="mb-1.5 text-sm font-medium text-slate-950">{e.question}</p>
                        <p className="text-sm text-slate-600">{e.answer}</p>
                        {e.steps && e.steps.length > 0 && (
                          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-500">
                            {e.steps.map((s, i) => <li key={i}>{s}</li>)}
                          </ol>
                        )}
                        {e.tip && (
                          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                            💡 {e.tip}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
