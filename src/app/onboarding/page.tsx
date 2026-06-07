import { OnboardingWizard } from "../ui/onboarding-wizard";

export const metadata = {
  title: "Bienvenido a SOLVEN — Configuración inicial",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <OnboardingWizard />
    </div>
  );
}
