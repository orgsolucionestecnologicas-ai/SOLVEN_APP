import { AppShell } from "../ui/app-shell";
import { HelpPageContent } from "../ui/help-page";

export default function AyudaPage() {
  return (
    <AppShell activeSection="ayuda" eyebrow="Sistema" title="Centro de ayuda">
      <HelpPageContent />
    </AppShell>
  );
}
