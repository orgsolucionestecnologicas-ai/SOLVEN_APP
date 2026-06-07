"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16">
            <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="#f97316" />
            <text x="32" y="44" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="32" fill="white">S</text>
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">Algo salió mal</h1>
        <p className="text-gray-400 mb-8">
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
