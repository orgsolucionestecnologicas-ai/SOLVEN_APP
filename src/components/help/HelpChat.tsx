"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  data?: Record<string, string | number | boolean | null>[];
  navigation?: { label: string; route: string };
  isError?: boolean;
  isReset?: boolean;
};

type NoaResponse = {
  reply?: string;
  data?: Record<string, string | number | boolean | null>[];
  navigation?: { label: string; route: string };
  error?: string;
};

const STORAGE_KEY = "solven_noa_chat";
const INACTIVITY_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

const WELCOME =
  "Hola, soy NOA. Preguntame sobre ventas, stock, caja, clientes, deudas, reportes o como usar SOLVEN.";
const RESET_NOTICE = "La conversacion se reinicio por inactividad. Hola de nuevo.";
const CASH_CLOSED_WELCOME = "Caja cerrada OK. Arrancamos de cero. En que te ayudo?";
const NETWORK_ERROR = "No me pude conectar. Revisa tu conexion e intenta de nuevo.";

const SUGGESTIONS = [
  "Que vendi hoy?",
  "Que producto no tiene stock?",
  "Cuanta plata hay en caja?",
  "Quien me debe plata?",
];

let messageId = 0;

function nextId() {
  messageId += 1;
  return messageId;
}

function welcomeMessage(text = WELCOME): ChatMessage {
  return { id: nextId(), role: "assistant", text };
}

function loadMessages() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ ...message, id: nextId() }));
  } catch {
    return null;
  }
}

function valueText(value: string | number | boolean | null) {
  if (value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
  return String(value);
}

export function HelpChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef(Date.now());
  const hasUserMessageRef = useRef(false);
  const lastQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = loadMessages();
    if (stored?.length) {
      hasUserMessageRef.current = stored.some((message) => message.role === "user");
      setMessages(stored);
    }
  }, []);

  useEffect(() => {
    try {
      const toStore = messages
        .filter((message) => !message.isError && !message.isReset)
        .map(({ role, text, data, navigation }) => ({ role, text, data, navigation }));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      return;
    }
  }, [messages]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  const clearChat = useCallback((welcomeText: string, withResetNotice: boolean) => {
    hasUserMessageRef.current = false;
    lastActivityRef.current = Date.now();
    lastQuestionRef.current = null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
    setMessages([
      ...(withResetNotice
        ? [{ id: nextId(), role: "assistant" as const, text: RESET_NOTICE, isReset: true }]
        : []),
      welcomeMessage(welcomeText),
    ]);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hasUserMessageRef.current) return;
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        clearChat(WELCOME, true);
      }
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [clearChat]);

  useEffect(() => {
    const onCashRegisterClosed = () => clearChat(CASH_CLOSED_WELCOME, false);
    window.addEventListener("cash-register-closed", onCashRegisterClosed);
    return () => window.removeEventListener("cash-register-closed", onCashRegisterClosed);
  }, [clearChat]);

  async function askNoa(question: string) {
    const page = pathname?.split("/").filter(Boolean)[0] ?? "dashboard";
    const response = await fetch("/api/noa/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, context: { page } }),
    });
    const body = (await response.json().catch(() => null)) as NoaResponse | null;
    if (!response.ok) throw new Error(body?.error ?? NETWORK_ERROR);
    return body;
  }

  async function handleSend(value: string) {
    const question = value.trim();
    if (!question || loading) return;

    hasUserMessageRef.current = true;
    lastActivityRef.current = Date.now();
    lastQuestionRef.current = question;
    setInput("");
    setLoading(true);
    setMessages((current) => [...current, { id: nextId(), role: "user", text: question }]);

    try {
      const body = await askNoa(question);
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          text: body?.reply ?? NETWORK_ERROR,
          data: body?.data,
          navigation: body?.navigation,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          text: error instanceof Error ? error.message : NETWORK_ERROR,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      lastActivityRef.current = Date.now();
    }
  }

  function handleRetry() {
    const question = lastQuestionRef.current;
    if (!question || loading) return;
    setMessages((current) => current.filter((message) => !message.isError));
    void handleSend(question);
  }

  return (
    <>
      <button
        aria-label="Abrir ayuda"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="text-2xl font-bold leading-none">{open ? "x" : "?"}</span>
      </button>

      {open ? (
        <div className="fixed bottom-40 right-4 z-40 flex w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-violet-600 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">NOA</p>
              <p className="text-xs text-violet-200">Asistente operativo</p>
            </div>
            <button
              aria-label="Cerrar"
              className="text-violet-200 hover:text-white"
              onClick={() => setOpen(false)}
              type="button"
            >
              x
            </button>
          </div>

          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                {message.isReset ? (
                  <div className="w-full py-1 text-center text-xs italic text-slate-400">
                    {message.text}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-violet-600 text-white"
                        : message.isError
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.data?.length ? (
                      <div className="mt-2 space-y-1 rounded-lg bg-white/70 p-2 text-xs">
                        {message.data.slice(0, 3).map((row, index) => (
                          <div className="border-b border-slate-100 pb-1 last:border-0" key={index}>
                            {Object.entries(row)
                              .slice(0, 4)
                              .map(([key, value]) => (
                                <p key={key}>
                                  <span className="font-medium">{key}:</span> {valueText(value)}
                                </p>
                              ))}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {message.navigation ? (
                      <Link
                        className="mt-2 inline-flex rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                        href={message.navigation.route}
                      >
                        {message.navigation.label}
                      </Link>
                    ) : null}
                    {message.isError && lastQuestionRef.current ? (
                      <button
                        className="mt-2 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        onClick={handleRetry}
                        type="button"
                      >
                        Reintentar
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                  Consultando SOLVEN...
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 pb-2 pt-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                disabled={loading}
                key={suggestion}
                onClick={() => void handleSend(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-3">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none"
              disabled={loading}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSend(input);
              }}
              placeholder="Preguntale a NOA..."
              type="text"
              value={input}
            />
            <button
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              disabled={!input.trim() || loading}
              onClick={() => void handleSend(input)}
              type="button"
            >
              Enviar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
