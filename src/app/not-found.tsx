import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-16 h-16">
            <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="#f97316" />
            <text x="32" y="44" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="32" fill="white">S</text>
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-2">Página no encontrada</p>
        <p className="text-gray-500 mb-8">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
