"use client";

import { useSearchParams } from "next/navigation";
import { NegocioPanel } from "./NegocioPanel";
import { SuscripcionPanel } from "./SuscripcionPanel";
import { UsuariosPanel } from "./UsuariosPanel";

export function SettingsContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("s");

  if (section === "usuarios") return <UsuariosPanel />;
  if (section === "suscripcion") return <SuscripcionPanel />;
  return <NegocioPanel />;
}
