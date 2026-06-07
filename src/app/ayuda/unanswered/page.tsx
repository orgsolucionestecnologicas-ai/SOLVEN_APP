import { AppShell } from "../../ui/app-shell";
import { UnansweredQueries } from "../../ui/unanswered-queries";

export default function UnansweredPage() {
  return (
    <AppShell activeSection="ayuda" eyebrow="Ayuda" title="Preguntas sin respuesta">
      <UnansweredQueries />
    </AppShell>
  );
}
