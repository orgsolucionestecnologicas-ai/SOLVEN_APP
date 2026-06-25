import { Suspense } from "react";
import { SettingsContent } from "./components/SettingsContent";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
