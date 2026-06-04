"use client";

import { useEffect, useRef, useState } from "react";
import { searchHelp } from "@/lib/help-search";
import type { HelpEntry } from "@/lib/help-knowledge-base";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  entry?: HelpEntry;
};

const WELCOME =
  "¡Hola! Soy tu asistente de ayuda. Preguntame sobre cualquier función de SOLVEN — ventas, caja, inventario, clientes y más.";

const NO_RESULT =
  "No encontré una respuesta exacta para eso. Podés escribirnos a orgsolucionestecnologicas@gmail.com y te ayudamos.";

const SUGGESTIONS = [
  "¿Cómo cierro la caja?",
  "¿Cómo cargo un producto?",
  "¿Cómo registro una venta?",
  "¿Cómo veo los reportes?",
];

let msgId = 0;
function nextId() {
  return ++msgId;
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "assistant", text: WELCOME },
  ]);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function handleSend(text: string) {
    const q = text.trim();
    if (!q || searching) return;

    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: q }]);
    setInput("");
    setSearching(true);

    setTimeout(() => {
      const results = searchHelp(q);
      const best = results[0];

      if (best) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", text: best.answer, entry: best },
        ]);
      } else {
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
      {/* Floating button */}
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

      {/* Chat panel */}
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

          {/* Messages */}
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p>{msg.text}</p>
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
                </div>
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

          {/* Suggestions */}
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
