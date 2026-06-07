import { AppShell } from "../ui/app-shell";
import { CuentaSubscription } from "../ui/cuenta-subscription";

export const metadata = {
  title: "Mi cuenta — SOLVEN",
};

export default function CuentaPage() {
  return (
    <AppShell activeSection="cuenta" eyebrow="Configuración" title="Mi cuenta">
      <CuentaSubscription />
    </AppShell>
  );
}
