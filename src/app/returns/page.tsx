import { AppShell } from "../ui/app-shell";
import { Returns } from "../ui/returns";

export default function ReturnsPage() {
  return (
    <AppShell activeSection="returns" eyebrow="Operaciones" title="Devoluciones">
      <Returns />
    </AppShell>
  );
}
