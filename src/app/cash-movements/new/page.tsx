import { Suspense } from "react";
import { AppShell } from "../../ui/app-shell";
import { CashMovementForm } from "../../ui/cash-movement-form";

export default function NewCashMovementPage() {
  return (
    <AppShell activeSection="cashMovements">
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        }
      >
        <CashMovementForm />
      </Suspense>
    </AppShell>
  );
}
