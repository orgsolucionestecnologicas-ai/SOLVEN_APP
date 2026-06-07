import { AppShell } from "../ui/app-shell";
import { UsersList } from "../ui/users-list";

export const metadata = {
  title: "Usuarios — SOLVEN"
};

export default function UsuariosPage() {
  return (
    <AppShell activeSection="usuarios" eyebrow="Sistema" title="Usuarios">
      <UsersList />
    </AppShell>
  );
}
