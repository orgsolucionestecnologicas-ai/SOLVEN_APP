"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-white">
            Algo salió mal
          </h1>
          <p className="mb-6 text-sm text-slate-400">
            El error fue registrado automáticamente.
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
