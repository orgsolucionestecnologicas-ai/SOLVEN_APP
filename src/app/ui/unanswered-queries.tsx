"use client";

import { useEffect, useState } from "react";
import { MessageCircleQuestion } from "lucide-react";

type Query = { question: string; count: number };

export function UnansweredQueries() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/help/unanswered")
      .then((r) => r.json())
      .then((res) => setQueries(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 p-4">Cargando...</p>;

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <MessageCircleQuestion className="w-10 h-10 mb-3" />
        <p>No hay preguntas sin respuesta. ¡Todo cubierto!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-400 mb-4">
        Preguntas que los usuarios hicieron y el asistente no pudo responder, ordenadas por frecuencia.
        Usá esta lista para ampliar la knowledge base.
      </p>
      {queries.map((q, i) => (
        <div
          key={i}
          className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-gray-800"
        >
          <span className="text-sm text-gray-200">{q.question}</span>
          <span className="text-xs text-orange-400 font-semibold ml-4 shrink-0">
            {q.count}×
          </span>
        </div>
      ))}
    </div>
  );
}
