"use client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-white"
      onClick={handleLogout}
      type="button"
    >
      Cerrar sesión
    </button>
  );
}
