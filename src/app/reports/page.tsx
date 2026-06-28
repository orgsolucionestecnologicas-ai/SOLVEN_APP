import { AppShell } from "../ui/app-shell";
import { Reports } from "../ui/reports";

export default function ReportsPage() {
  return (
    <AppShell activeSection="reports" eyebrow="Informes" title="Reportes">
      <Reports />
    </AppShell>
  );
}
