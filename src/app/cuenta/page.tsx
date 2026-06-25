import { redirect } from "next/navigation";

export default function CuentaPage() {
  redirect("/settings?s=suscripcion");
}
