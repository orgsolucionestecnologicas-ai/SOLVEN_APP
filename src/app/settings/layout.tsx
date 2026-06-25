import { Suspense } from "react";
import { AppShell } from "../ui/app-shell";
import { SettingsNav } from "./components/SettingsNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell activeSection="settings">
      <div className="flex">
        <Suspense fallback={null}>
          <SettingsNav />
        </Suspense>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AppShell>
  );
}
