import { AppShell } from "../ui/app-shell";
import { Pos } from "../ui/pos";

export default function PosPage() {
  return (
    <AppShell activeSection="pos">
      <Pos />
    </AppShell>
  );
}
