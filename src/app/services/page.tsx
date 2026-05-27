import { AppShell } from "../ui/app-shell";
import { Services } from "../ui/services";

export default function ServicesPage() {
  return (
    <AppShell activeSection="services" eyebrow="Catálogo" title="Servicios">
      <Services />
    </AppShell>
  );
}
