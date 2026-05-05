import { AppShell } from "../ui/app-shell";
import { Settings } from "../ui/settings";

export default function SettingsPage() {
  return (
    <AppShell activeSection="settings" eyebrow="Sistema" title="Configuración">
      <Settings />
    </AppShell>
  );
}
