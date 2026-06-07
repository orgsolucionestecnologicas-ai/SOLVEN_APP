"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { searchHelp } from "@/lib/help-search";
import type { HelpEntry } from "@/lib/help-knowledge-base";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  entry?: HelpEntry;
  confidence?: "high" | "medium" | "low";
  isReset?: boolean;
};

const WELCOME =
  "¡Hola! Soy tu asistente de ayuda. Preguntame sobre cualquier función de SOLVEN — ventas, caja, inventario, clientes y más.";

const NO_RESULT =
  "No encontré una respuesta exacta para eso. Podés escribirnos a orgsolucionestecnologicas@gmail.com y te ayudamos.";

const LOW_CONFIDENCE_PREFIX =
  "No estoy 100% seguro, pero esto puede ayudarte: ";

const RESET_NOTICE =
  "⏱️ La conversación se reinició por inactividad. ¡Hola de nuevo!";

const SUGGESTIONS = [
  "¿Cómo cierro la caja?",
  "¿Cómo cargo un producto?",
  "¿Cómo registro una venta?",
  "¿Cómo veo los reportes?",
];

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos
const CHECK_INTERVAL_MS = 30 * 1000;  // check cada 30 seg

let msgId = 0;
function nextId() {
  return ++msgId;
}

function makeWelcome(): Message {
  return { id: nextId(), role: "assistant", text: WELCOME };
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([makeWelcome()]);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const hasUserMessageRef = useRef(false);

  // Scroll al fondo cuando cambian mensajes o se abre
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Auto-reset por inactividad
  const resetConversation = useCallback(() => {
    hasUserMessageRef.current = false;
    lastActivityRef.current = Date.now();
    setMessages([
      { id: nextId(), role: "assistant", text: RESET_NOTICE, isReset: true },
      makeWelcome(),
    ]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Solo resetear si hay historial de mensajes del usuario
      if (!hasUserMessageRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_MS) {
        resetConversation();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [resetConversation]);

  function handleSend(text: string) {
    const q = text.trim();
    if (!q || searching) return;

    // Registrar actividad
    lastActivityRef.current = Date.now();
    hasUserMessageRef.current = true;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: q }]);
    setInput("");
    setSearching(true);

    setTimeout(() => {
      const results = searchHelp(q);
      const best = results[0];

      if (best) {
        const isLowConfidence = best.confidence === "low";
        const responseText = isLowConfidence
          ? LOW_CONFIDENCE_PREFIX + best.entry.answer.charAt(0).toLowerCase() + best.entry.answer.slice(1)
          : best.entry.answer;

        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: responseText,
            entry: isLowConfidence ? undefined : best.entry,
            confidence: best.confidence,
          },
        ]);
      } else {
        fetch("/api/help/unanswered", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q }),
        }).catch(() => {});
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", text: NO_RESULT },
        ]);
      }
      setSearching(false);
    }, 400);
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        aria-label="Abrir ayuda"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? (
          <span className="text-lg font-bold leading-none">✕</span>
        ) : (
          <span className="text-2xl font-bold leading-none">?</span>
        )}
      </button>

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-violet-600 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Ayuda SOLVEN</p>
              <p className="text-xs text-violet-200">Asistente interno</p>
            </div>
            <button
              className="text-violet-200 hover:text-white"
              onClick={() => setOpen(false)}
              type="button"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.isReset ? (
                  // Aviso de reset: centrado y gris
                  <div className="w-full text-center text-xs text-slate-400 italic py-1">
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* Pasos solo si confianza no es baja */}
                    {msg.entry?.steps && msg.entry.steps.length > 0 && (
                      <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs">
                        {msg.entry.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}

                    {msg.entry?.tip && (
                      <p className="mt-2 rounded-lg bg-violet-50 px-2 py-1 text-xs text-violet-700">
                        💡 {msg.entry.tip}
                      </p>
                    )}

                    {/* Indicador de confianza media */}
                    {msg.confidence === "medium" && msg.role === "assistant" && (
                      <p className="mt-1 text-xs text-slate-400">
                        ¿No era esto? Intentá reformular la pregunta.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {searching && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  Buscando…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias */}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 pb-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100"
                onClick={() => handleSend(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-3">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
              disabled={searching}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder="Escribí tu pregunta..."
              type="text"
              value={input}
            />
            <button
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={!input.trim() || searching}
              onClick={() => handleSend(input)}
              type="button"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
