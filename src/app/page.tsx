import { AppShell } from "./ui/app-shell";
import { DashboardSummary } from "./ui/dashboard-summary";

export default function Home() {
  return (
    <AppShell activeSection="dashboard">
      <DashboardSummary />
    </AppShell>
  );
}
